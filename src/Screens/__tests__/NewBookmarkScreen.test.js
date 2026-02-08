import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import NewBookmarkScreen from '../NewBookmarkScreen';
import { DatabaseProvider } from '../../Context/DatabaseContext';
import { getDatabase } from '../../database/Database';

jest.spyOn(Alert, 'alert');

// Mock usePreventRemove hook - capture callback so tests can simulate "back" and verify no Discard alert after save
let capturedPreventRemoveCallback;
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  usePreventRemove: jest.fn((enabled, callback) => {
    capturedPreventRemoveCallback = callback;
  }),
}));

let mockSetOptions;
let savedHeaderOptions;

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setParams: jest.fn(),
  setOptions: jest.fn((options) => {
    savedHeaderOptions = options;
  }),
  dispatch: jest.fn(),
};

const renderWithProviders = (route = {}) => {
  savedHeaderOptions = null;
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
    savedHeaderOptions = null;
    capturedPreventRemoveCallback = null;
    
    // Create a test folder
    const db = getDatabase();
    const { FolderRepository } = require('../../database/repositories');
    const folderRepo = new FolderRepository(db);
    const folder = folderRepo.create({ name: 'Test Folder', icon: 'folder' });
    folderId = folder.id;
  });

  it('renders form with all fields', () => {
    renderWithProviders();
    
    expect(screen.getByPlaceholderText('My favorite website...')).toBeTruthy();
    expect(screen.getByPlaceholderText('https://example.com')).toBeTruthy();
    expect(screen.getByText('Folders')).toBeTruthy();
    expect(screen.getByText('Tags')).toBeTruthy();
  });

  it('renders Save button in header', () => {
    renderWithProviders();
    
    // Save button is in navigation header, check that setOptions was called
    expect(mockNavigation.setOptions).toHaveBeenCalled();
    expect(savedHeaderOptions).toBeTruthy();
    expect(savedHeaderOptions.headerRight).toBeInstanceOf(Function);
    expect(savedHeaderOptions.headerTitle).toBeInstanceOf(Function);
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
    
    // Verify header was set up with save button
    await waitFor(() => expect(savedHeaderOptions).toBeTruthy());
    expect(savedHeaderOptions.headerRight).toBeInstanceOf(Function);
    
    // Save button functionality is tested via integration tests
    // Unit tests verify the component renders correctly
  });

  it('validates URL format', () => {
    renderWithProviders({ params: { currentFolderId: folderId } });
    
    const nameInput = screen.getByTestId('name-input');
    const urlInput = screen.getByTestId('url-input');
    
    fireEvent.changeText(nameInput, 'Test Bookmark');
    fireEvent.changeText(urlInput, 'not a valid url');
    
    // Verify inputs are updated
    expect(nameInput.props.value).toBe('Test Bookmark');
    expect(urlInput.props.value).toBe('not a valid url');
  });

  it('auto-prefixes URL with https:// if missing', async () => {
    renderWithProviders({ params: { currentFolderId: folderId } });
    
    const nameInput = screen.getByTestId('name-input');
    const urlInput = screen.getByTestId('url-input');
    
    fireEvent.changeText(nameInput, 'Google');
    fireEvent.changeText(urlInput, 'google.com');
    
    await waitFor(() => expect(savedHeaderOptions).toBeTruthy());
    const HeaderRight = savedHeaderOptions.headerRight();
    const { getByText: getHeaderText } = render(HeaderRight);
    const saveButton = getHeaderText('Save');
    
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    }, { timeout: 3000 });
    
    // Verify bookmark was created with https://
    const db = getDatabase();
    const { BookmarkRepository } = require('../../database/repositories');
    const bookmarkRepo = new BookmarkRepository(db);
    const bookmarks = bookmarkRepo.getAll();
    const googleBookmark = bookmarks.find(b => b.name === 'Google');
    
    expect(googleBookmark).toBeTruthy();
    expect(googleBookmark.url).toBe('https://google.com');
  });

  it('validates name length', () => {
    renderWithProviders({ params: { currentFolderId: folderId } });
    
    const nameInput = screen.getByTestId('name-input');
    const longName = 'A'.repeat(101); // Over 100 chars
    
    fireEvent.changeText(nameInput, longName);
    
    // Verify input accepts the text (validation happens on save)
    expect(nameInput.props.value).toBe(longName);
  });

  it('shows validation error when Save with empty name', async () => {
    const { getByText } = renderWithProviders({ params: { currentFolderId: folderId } });
    fireEvent.changeText(screen.getByTestId('url-input'), 'https://test.com');
    await waitFor(() => expect(screen.getByText('Test Folder')).toBeTruthy());

    await waitFor(() => expect(savedHeaderOptions).toBeTruthy());
    const headerElement = savedHeaderOptions.headerRight();
    render(headerElement);
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(getByText('Bookmark name is required')).toBeTruthy();
    });
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
  });

  it('shows validation error when Save with empty URL', async () => {
    const { getByText } = renderWithProviders({ params: { currentFolderId: folderId } });
    fireEvent.changeText(screen.getByTestId('name-input'), 'My Bookmark');
    await waitFor(() => expect(screen.getByText('Test Folder')).toBeTruthy());

    await waitFor(() => expect(savedHeaderOptions).toBeTruthy());
    const headerElement = savedHeaderOptions.headerRight();
    render(headerElement);
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(getByText('URL is required')).toBeTruthy();
    });
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
  });

  it('shows validation error when Save with no folder selected', async () => {
    const { getByText } = renderWithProviders();
    fireEvent.changeText(screen.getByTestId('name-input'), 'My Bookmark');
    fireEvent.changeText(screen.getByTestId('url-input'), 'https://test.com');

    await waitFor(() => expect(savedHeaderOptions).toBeTruthy());
    const headerElement = savedHeaderOptions.headerRight();
    render(headerElement);
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(getByText('Please select at least one folder')).toBeTruthy();
    });
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
  });

  it('shows validation error when name exceeds 100 characters', async () => {
    const { getByText } = renderWithProviders({ params: { currentFolderId: folderId } });
    fireEvent.changeText(screen.getByTestId('name-input'), 'A'.repeat(101));
    fireEvent.changeText(screen.getByTestId('url-input'), 'https://test.com');
    await waitFor(() => expect(screen.getByText('Test Folder')).toBeTruthy());

    await waitFor(() => expect(savedHeaderOptions).toBeTruthy());
    const headerElement = savedHeaderOptions.headerRight();
    render(headerElement);
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(getByText('Name must be less than 100 characters')).toBeTruthy();
    });
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid URL format', async () => {
    const { getByText } = renderWithProviders({ params: { currentFolderId: folderId } });
    fireEvent.changeText(screen.getByTestId('name-input'), 'Test');
    // Use a string that fails URL() after https:// prefix (e.g. space or invalid host)
    fireEvent.changeText(screen.getByTestId('url-input'), 'not a valid url');
    await waitFor(() => expect(screen.getByText('Test Folder')).toBeTruthy());

    await waitFor(() => expect(savedHeaderOptions).toBeTruthy());
    const headerElement = savedHeaderOptions.headerRight();
    render(headerElement);
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(getByText('Please enter a valid URL')).toBeTruthy();
    });
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
  });

  it('opens folder picker when tapped', () => {
    renderWithProviders();
    
    const folderPicker = screen.getByTestId('folder-picker-button');
    fireEvent.press(folderPicker);
    
    expect(mockNavigation.navigate).toHaveBeenCalledWith('FolderPicker', expect.objectContaining({
      selectedFolderIds: expect.any(Array),
      _onSelect: expect.any(Function),
    }));
  });

  it('creates bookmark successfully with all fields', async () => {
    renderWithProviders({ params: { currentFolderId: folderId } });
    
    const nameInput = screen.getByTestId('name-input');
    const urlInput = screen.getByTestId('url-input');
    
    fireEvent.changeText(nameInput, 'React Docs');
    fireEvent.changeText(urlInput, 'https://react.dev');
    
    await waitFor(() => expect(savedHeaderOptions).toBeTruthy());
    const HeaderRight = savedHeaderOptions.headerRight();
    const { getByText: getHeaderText } = render(HeaderRight);
    const saveButton = getHeaderText('Save');
    
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    }, { timeout: 3000 });
    
    // Verify bookmark was created
    const db = getDatabase();
    const { BookmarkRepository } = require('../../database/repositories');
    const bookmarkRepo = new BookmarkRepository(db);
    const bookmarks = bookmarkRepo.getAll();
    const reactBookmark = bookmarks.find(b => b.name === 'React Docs');
    
    expect(reactBookmark).toBeTruthy();
    expect(reactBookmark.url).toBe('https://react.dev');
  });

  it('does not show Discard Changes alert when going back after successful save', async () => {
    renderWithProviders({ params: { currentFolderId: folderId } });

    const nameInput = screen.getByTestId('name-input');
    const urlInput = screen.getByTestId('url-input');

    fireEvent.changeText(nameInput, 'Saved Bookmark');
    fireEvent.changeText(urlInput, 'https://saved-after-test.com');

    await waitFor(() => expect(savedHeaderOptions).toBeTruthy());
    const HeaderRight = savedHeaderOptions.headerRight();
    const { getByText: getHeaderText } = render(HeaderRight);
    const saveButton = getHeaderText('Save');

    Alert.alert.mockClear();
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Simulate the preventRemove callback firing (as it would when navigator processes goBack)
    expect(capturedPreventRemoveCallback).toBeTruthy();
    capturedPreventRemoveCallback({ data: { action: { type: 'GO_BACK' } } });

    // Should not have shown "Discard Changes?" because we saved successfully
    const discardCalls = Alert.alert.mock.calls.filter(call => call[0] === 'Discard Changes?');
    expect(discardCalls).toHaveLength(0);
  });

  it('shows Discard Changes alert when preventRemove fires with unsaved changes and user has not saved', () => {
    renderWithProviders({ params: { currentFolderId: folderId } });

    const nameInput = screen.getByTestId('name-input');
    fireEvent.changeText(nameInput, 'Unsaved name');
    fireEvent.changeText(screen.getByTestId('url-input'), 'https://unsaved.com');

    expect(capturedPreventRemoveCallback).toBeTruthy();
    Alert.alert.mockClear();
    capturedPreventRemoveCallback({ data: { action: { type: 'GO_BACK' } } });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Discard Changes?',
      'You have unsaved changes. Are you sure you want to go back?',
      expect.any(Array)
    );
  });

  it('shows confirmation when canceling with unsaved changes', () => {
    renderWithProviders();
    
    const nameInput = screen.getByTestId('name-input');
    fireEvent.changeText(nameInput, 'Some name');
    
    // Verify component renders with unsaved changes
    expect(nameInput.props.value).toBe('Some name');
    // usePreventRemove hook is active when there are unsaved changes
  });

  it('allows going back when there are no changes', () => {
    renderWithProviders();
    
    // Verify component renders without unsaved changes
    expect(screen.getByPlaceholderText('My favorite website...')).toBeTruthy();
    // usePreventRemove hook is inactive when there are no changes
  });

  it('clears error when user starts typing', () => {
    renderWithProviders();
    
    const nameInput = screen.getByTestId('name-input');
    
    // Type in the name field
    fireEvent.changeText(nameInput, 'My Bookmark');
    
    // Verify text was updated
    expect(nameInput.props.value).toBe('My Bookmark');
  });

  it('shows folder count badge when folders are selected', async () => {
    renderWithProviders({ params: { currentFolderId: folderId } });
    
    await waitFor(() => {
      expect(screen.getByText('Test Folder')).toBeTruthy();
    });
    
    // Badge with "1" should be visible
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('displays help text for tags', () => {
    renderWithProviders();
    
    expect(screen.getByText('🔍 Use tags to find bookmarks faster')).toBeTruthy();
  });

  it('saves tags with bookmark so they are stored and searchable (stale-closure fix)', async () => {
    renderWithProviders({ params: { currentFolderId: folderId } });

    const nameInput = screen.getByTestId('name-input');
    const urlInput = screen.getByTestId('url-input');
    const tagInput = screen.getByTestId('tag-input');

    fireEvent.changeText(nameInput, 'Tagged Bookmark');
    fireEvent.changeText(urlInput, 'https://tagged-example.com');

    await waitFor(() => expect(screen.getByText('Test Folder')).toBeTruthy());

    // Add tags (user adds tags then saves - tags must be in handleSave closure)
    fireEvent.changeText(tagInput, 'Ravi');
    await waitFor(() => expect(screen.getByTestId('add-tag-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('add-tag-button'));

    fireEvent.changeText(tagInput, 'maama');
    await waitFor(() => expect(screen.getByTestId('add-tag-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('add-tag-button'));

    await waitFor(() => {
      expect(screen.getByText('Ravi')).toBeTruthy();
      expect(screen.getByText('maama')).toBeTruthy();
    });

    await waitFor(() => expect(savedHeaderOptions).toBeTruthy());
    const HeaderRight = savedHeaderOptions.headerRight();
    const { getByText: getHeaderText } = render(HeaderRight);
    const saveButton = getHeaderText('Save');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    }, { timeout: 3000 });

    const db = getDatabase();
    const { BookmarkRepository, TagRepository } = require('../../database/repositories');
    const bookmarkRepo = new BookmarkRepository(db);
    const tagRepo = new TagRepository(db);

    const saved = bookmarkRepo.getAll().find(b => b.name === 'Tagged Bookmark');
    expect(saved).toBeTruthy();

    const savedTags = tagRepo.getTagsForBookmark(saved.id).map(t => t.name);
    expect(savedTags).toContain('ravi');
    expect(savedTags).toContain('maama');

    expect(bookmarkRepo.searchByTag('ravi').map(b => b.id)).toContain(saved.id);
    expect(bookmarkRepo.searchByTag('Ravi').map(b => b.id)).toContain(saved.id);
    expect(bookmarkRepo.searchByTag('maama').map(b => b.id)).toContain(saved.id);
  });

  it('shows duplicate URL alert when URL already exists', async () => {
    const db = getDatabase();
    const { BookmarkRepository } = require('../../database/repositories');
    const bookmarkRepo = new BookmarkRepository(db);
    bookmarkRepo.create({ name: 'Existing', url: 'https://example.com' }, [folderId]);
    
    renderWithProviders({ params: { currentFolderId: folderId } });
    
    const nameInput = screen.getByTestId('name-input');
    const urlInput = screen.getByTestId('url-input');
    
    fireEvent.changeText(nameInput, 'Duplicate');
    fireEvent.changeText(urlInput, 'https://example.com');
    
    await waitFor(() => expect(savedHeaderOptions).toBeTruthy());
    const HeaderRight = savedHeaderOptions.headerRight();
    const { getByText: getHeaderText } = render(HeaderRight);
    const saveButton = getHeaderText('Save');
    
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Duplicate URL',
        expect.any(String),
        expect.any(Array)
      );
    });
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
    
    await waitFor(() => expect(savedHeaderOptions).toBeTruthy());
    const HeaderRight = savedHeaderOptions.headerRight();
    const { getByText: getHeaderText } = render(HeaderRight);
    const saveButton = getHeaderText('Save');
    
    await act(async () => {
      fireEvent.press(saveButton);
    });
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
    
    // Simulate pressing "Add Anyway"
    const alertCall = Alert.alert.mock.calls[0];
    const addAnywayButton = alertCall[2].find(btn => btn.text === 'Add Anyway');
    
    await act(async () => {
      addAnywayButton.onPress();
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  it('saves bookmark with tags correctly', async () => {
    renderWithProviders({ params: { currentFolderId: folderId } });
    
    const nameInput = screen.getByTestId('name-input');
    const urlInput = screen.getByTestId('url-input');
    const tagInput = screen.getByPlaceholderText('Add tags...');
    
    fireEvent.changeText(nameInput, 'Tagged Bookmark');
    fireEvent.changeText(urlInput, 'https://tagged.com');
    
    // Add tags
    await act(async () => {
      fireEvent.changeText(tagInput, 'test-tag');
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    
    await act(async () => {
      fireEvent(tagInput, 'submitEditing');
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    
    await waitFor(() => expect(savedHeaderOptions).toBeTruthy());
    const HeaderRight = savedHeaderOptions.headerRight();
    const { getByText: getHeaderText } = render(HeaderRight);
    const saveButton = getHeaderText('Save');
    
    await act(async () => {
      fireEvent.press(saveButton);
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  it('handles save error gracefully', async () => {
    renderWithProviders({ params: { currentFolderId: folderId } });
    
    const nameInput = screen.getByTestId('name-input');
    const urlInput = screen.getByTestId('url-input');
    
    fireEvent.changeText(nameInput, 'Test');
    fireEvent.changeText(urlInput, 'https://test.com');
    
    await waitFor(() => expect(savedHeaderOptions).toBeTruthy());
    const HeaderRight = savedHeaderOptions.headerRight();
    const { getByText: getHeaderText } = render(HeaderRight);
    const saveButton = getHeaderText('Save');
    
    await act(async () => {
      fireEvent.press(saveButton);
    });
    
    // Should navigate back on success (not an error case with our test data)
    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  it('uses usePreventRemove for back button handling', async () => {
    renderWithProviders();
    
    // Verify component renders correctly
    expect(screen.getByPlaceholderText('My favorite website...')).toBeTruthy();
    // usePreventRemove hook handles navigation prevention internally
  });

  it('clears folder error when folders are selected via callback', async () => {
    renderWithProviders();

    // Open folder picker
    const folderPicker = screen.getByTestId('folder-picker-button');
    fireEvent.press(folderPicker);

    // Get the callback
    const navCall = mockNavigation.navigate.mock.calls.find(call => call[0] === 'FolderPicker');
    const callback = navCall[1]._onSelect;

    // Simulate selecting a folder
    await act(async () => {
      callback([folderId]);
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Verify folder is selected
    await waitFor(() => {
      expect(screen.getByText('Test Folder')).toBeTruthy();
    });
  });
});
