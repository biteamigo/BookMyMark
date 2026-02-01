import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import NewBookmarkScreen from '../NewBookmarkScreen';
import { DatabaseProvider } from '../../Context/DatabaseContext';
import { getDatabase } from '../../database/Database';

jest.spyOn(Alert, 'alert');

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setParams: jest.fn(),
  setOptions: jest.fn(),
};

const renderWithProviders = (route = {}) => {
  return render(
    <DatabaseProvider>
      <NewBookmarkScreen 
        navigation={mockNavigation} 
        route={route}
      />
    </DatabaseProvider>
  );
};

describe('NewBookmarkScreen', () => {
  let folderId;

  beforeEach(() => {
    jest.clearAllMocks();
    Alert.alert.mockClear();
    
    // Create a test folder
    const db = getDatabase();
    const { FolderRepository } = require('../../database/repositories');
    const folderRepo = new FolderRepository(db);
    const folder = folderRepo.create({ name: 'Test Folder', icon: 'folder' });
    folderId = folder.id;
  });

  it('renders form with all fields', () => {
    renderWithProviders();
    
    expect(screen.getByText('New Bookmark')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter bookmark name...')).toBeTruthy();
    expect(screen.getByPlaceholderText('https://example.com')).toBeTruthy();
    expect(screen.getByText('Add to Folders')).toBeTruthy();
    expect(screen.getByText('Tags')).toBeTruthy();
  });

  it('renders Cancel and Save buttons', () => {
    renderWithProviders();
    
    expect(screen.getByTestId('cancel-button')).toBeTruthy();
    expect(screen.getByTestId('save-button')).toBeTruthy();
  });

  it('shows required field indicators', () => {
    renderWithProviders();
    
    // Count asterisks for required fields (name, url, folders)
    const asterisks = screen.getAllByText('*');
    expect(asterisks.length).toBe(3);
  });

  it('pre-selects current folder when provided', async () => {
    renderWithProviders({ params: { currentFolderId: folderId } });
    
    await waitFor(() => {
      expect(screen.getByText('Test Folder')).toBeTruthy();
    });
  });

  it('validates required fields on save', async () => {
    renderWithProviders();
    
    const saveButton = screen.getByTestId('save-button');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Bookmark name is required')).toBeTruthy();
      expect(screen.getByText('URL is required')).toBeTruthy();
      expect(screen.getByText('Please select at least one folder')).toBeTruthy();
    });
    
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
  });

  it('validates URL format', async () => {
    renderWithProviders({ params: { currentFolderId: folderId } });
    
    const nameInput = screen.getByTestId('name-input');
    const urlInput = screen.getByTestId('url-input');
    
    fireEvent.changeText(nameInput, 'Test Bookmark');
    fireEvent.changeText(urlInput, 'not a valid url');
    
    const saveButton = screen.getByTestId('save-button');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid URL')).toBeTruthy();
    });
  });

  it('auto-prefixes URL with https:// if missing', async () => {
    renderWithProviders({ params: { currentFolderId: folderId } });
    
    const nameInput = screen.getByTestId('name-input');
    const urlInput = screen.getByTestId('url-input');
    
    fireEvent.changeText(nameInput, 'Google');
    fireEvent.changeText(urlInput, 'google.com');
    
    const saveButton = screen.getByTestId('save-button');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    }, { timeout: 3000 });
    
    // Verify bookmark was created with https://
    const db = getDatabase();
    const { BookmarkRepository } = require('../../database/repositories');
    const bookmarkRepo = new BookmarkRepository(db);
    
    // Wait a bit for the save to complete
    await waitFor(() => {
      const bookmarks = bookmarkRepo.getAll();
      expect(bookmarks.length).toBeGreaterThan(0);
    }, { timeout: 2000 });
    
    const bookmarks = bookmarkRepo.getAll();
    const googleBookmark = bookmarks.find(b => b.name === 'Google');
    
    expect(googleBookmark).toBeTruthy();
    expect(googleBookmark.url).toBe('https://google.com');
  });

  it('validates name length', async () => {
    renderWithProviders({ params: { currentFolderId: folderId } });
    
    const nameInput = screen.getByTestId('name-input');
    const longName = 'A'.repeat(101); // Over 100 chars
    
    fireEvent.changeText(nameInput, longName);
    
    const saveButton = screen.getByTestId('save-button');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Name must be less than 100 characters')).toBeTruthy();
    });
  });

  it('opens folder picker when tapped', () => {
    renderWithProviders();
    
    const folderPicker = screen.getByTestId('folder-picker-button');
    fireEvent.press(folderPicker);
    
    expect(mockNavigation.navigate).toHaveBeenCalledWith('FolderPicker', expect.any(Object));
  });

  it('creates bookmark successfully with all fields', async () => {
    renderWithProviders({ params: { currentFolderId: folderId } });
    
    const nameInput = screen.getByTestId('name-input');
    const urlInput = screen.getByTestId('url-input');
    
    fireEvent.changeText(nameInput, 'React Docs');
    fireEvent.changeText(urlInput, 'https://react.dev');
    
    const saveButton = screen.getByTestId('save-button');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    }, { timeout: 3000 });
    
    // Verify bookmark was created
    const db = getDatabase();
    const { BookmarkRepository } = require('../../database/repositories');
    const bookmarkRepo = new BookmarkRepository(db);
    
    await waitFor(() => {
      const bookmarks = bookmarkRepo.getByFolder(folderId);
      expect(bookmarks.length).toBeGreaterThan(0);
    }, { timeout: 2000 });
    
    const bookmarks = bookmarkRepo.getByFolder(folderId);
    const reactBookmark = bookmarks.find(b => b.name === 'React Docs');
    expect(reactBookmark).toBeTruthy();
    expect(reactBookmark.url).toBe('https://react.dev');
  });

  it('shows confirmation when canceling with unsaved changes', () => {
    renderWithProviders();
    
    const nameInput = screen.getByTestId('name-input');
    fireEvent.changeText(nameInput, 'Some name');
    
    const cancelButton = screen.getByTestId('cancel-button');
    fireEvent.press(cancelButton);
    
    expect(Alert.alert).toHaveBeenCalledWith(
      'Discard Changes?',
      expect.any(String),
      expect.any(Array)
    );
  });

  it('goes back immediately when canceling with no changes', () => {
    renderWithProviders();
    
    const cancelButton = screen.getByTestId('cancel-button');
    fireEvent.press(cancelButton);
    
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('clears error when user starts typing', async () => {
    renderWithProviders();
    
    // Trigger validation error
    const saveButton = screen.getByTestId('save-button');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Bookmark name is required')).toBeTruthy();
    });
    
    // Start typing
    const nameInput = screen.getByTestId('name-input');
    fireEvent.changeText(nameInput, 'T');
    
    await waitFor(() => {
      expect(screen.queryByText('Bookmark name is required')).toBeNull();
    });
  });

  it('shows folder count badge when folders are selected', async () => {
    renderWithProviders({ params: { currentFolderId: folderId } });
    
    await waitFor(() => {
      expect(screen.getByText('1')).toBeTruthy(); // Badge showing 1 folder
    });
  });

  it('displays help text for tags', () => {
    renderWithProviders();
    
    expect(screen.getByText('Tags help you find bookmarks faster')).toBeTruthy();
  });

  it('shows duplicate URL alert when URL already exists', async () => {
    // Create a bookmark first
    const db = getDatabase();
    const { BookmarkRepository } = require('../../database/repositories');
    const bookmarkRepo = new BookmarkRepository(db);
    bookmarkRepo.create({ name: 'Existing', url: 'https://example.com' }, [folderId]);
    
    // Verify it was created
    expect(bookmarkRepo.urlExists('https://example.com')).toBe(true);
    
    renderWithProviders({ params: { currentFolderId: folderId } });
    
    const nameInput = screen.getByTestId('name-input');
    const urlInput = screen.getByTestId('url-input');
    
    fireEvent.changeText(nameInput, 'Duplicate');
    fireEvent.changeText(urlInput, 'https://example.com');
    
    const saveButton = screen.getByTestId('save-button');
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Duplicate URL',
        expect.any(String),
        expect.any(Array)
      );
    }, { timeout: 3000 });
  });

  it('allows saving duplicate URL when "Add Anyway" is pressed', async () => {
    const db = getDatabase();
    const { BookmarkRepository } = require('../../database/repositories');
    const bookmarkRepo = new BookmarkRepository(db);
    bookmarkRepo.create({ name: 'Existing', url: 'https://duplicate.com' }, [folderId]);
    
    renderWithProviders({ params: { currentFolderId: folderId } });
    
    const nameInput = screen.getByTestId('name-input');
    const urlInput = screen.getByTestId('url-input');
    
    fireEvent.changeText(nameInput, 'Duplicate Test');
    fireEvent.changeText(urlInput, 'https://duplicate.com');
    
    const saveButton = screen.getByTestId('save-button');
    
    await act(async () => {
      fireEvent.press(saveButton);
    });
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Duplicate URL',
        expect.stringContaining('already exists'),
        expect.any(Array)
      );
    });
    
    const alertCall = Alert.alert.mock.calls[Alert.alert.mock.calls.length - 1];
    const buttons = alertCall[2];
    const addAnywayButton = buttons.find(b => b.text === 'Add Anyway');
    
    expect(addAnywayButton).toBeDefined();
    
    await act(async () => {
      addAnywayButton.onPress();
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('saves bookmark with tags correctly', async () => {
    const { TagRepository } = require('../../database/repositories');
    const tagRepoSpy = jest.spyOn(TagRepository.prototype, 'setTagsForBookmark');
    
    renderWithProviders({ params: { currentFolderId: folderId } });
    
    const nameInput = screen.getByTestId('name-input');
    const urlInput = screen.getByTestId('url-input');
    const tagInput = screen.getByTestId('tag-input');
    
    fireEvent.changeText(nameInput, 'Tagged Bookmark');
    fireEvent.changeText(urlInput, 'https://tagged.com');
    
    fireEvent.changeText(tagInput, 'tech');
    await act(async () => {
      fireEvent(tagInput, 'submitEditing');
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    
    fireEvent.changeText(tagInput, 'programming');
    await act(async () => {
      fireEvent(tagInput, 'submitEditing');
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    
    const saveButton = screen.getByTestId('save-button');
    await act(async () => {
      fireEvent.press(saveButton);
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(tagRepoSpy).toHaveBeenCalled();
    
    tagRepoSpy.mockRestore();
  });

  it('handles save error gracefully', async () => {
    const { BookmarkRepository } = require('../../database/repositories');
    const createSpy = jest.spyOn(BookmarkRepository.prototype, 'create').mockImplementation(() => {
      throw new Error('Database error');
    });
    
    renderWithProviders({ params: { currentFolderId: folderId } });
    
    const nameInput = screen.getByTestId('name-input');
    const urlInput = screen.getByTestId('url-input');
    
    fireEvent.changeText(nameInput, 'Test');
    fireEvent.changeText(urlInput, 'https://test.com');
    
    const saveButton = screen.getByTestId('save-button');
    
    await act(async () => {
      fireEvent.press(saveButton);
    });
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to save bookmark. Please try again.');
    });
    
    createSpy.mockRestore();
  });

  it('shows discard confirmation and discards changes when confirmed', async () => {
    renderWithProviders();
    
    const nameInput = screen.getByTestId('name-input');
    
    fireEvent.changeText(nameInput, 'Test');
    
    const cancelButton = screen.getByTestId('cancel-button');
    
    await act(async () => {
      fireEvent.press(cancelButton);
    });
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to cancel?',
        expect.any(Array)
      );
    });
    
    const alertCall = Alert.alert.mock.calls[Alert.alert.mock.calls.length - 1];
    const buttons = alertCall[2];
    const discardButton = buttons.find(b => b.text === 'Discard');
    
    expect(discardButton).toBeDefined();
    
    await act(async () => {
      discardButton.onPress();
    });
    
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('clears folder error when folders are selected via callback', async () => {
    renderWithProviders();
    
    const saveButton = screen.getByTestId('save-button');
    
    await act(async () => {
      fireEvent.press(saveButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Please select at least one folder')).toBeTruthy();
    });
    
    const folderButton = screen.getByTestId('folder-picker-button');
    await act(async () => {
      fireEvent.press(folderButton);
    });
    
    const navigateCall = mockNavigation.navigate.mock.calls.find(
      call => call[0] === 'FolderPicker'
    );
    const onSelectCallback = navigateCall?.[1]?._onSelect;
    
    expect(onSelectCallback).toBeDefined();
    
    await act(async () => {
      onSelectCallback([folderId]);
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Please select at least one folder')).toBeNull();
    });
  });
});
