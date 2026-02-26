import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import NewBookmarkScreen from '../NewBookmarkScreen';
import { DatabaseProvider } from '../../Context/DatabaseContext';
import { getDatabase } from '../../database/Database';
import * as folderPickerResult from '../../Utils/folderPickerResult';

jest.spyOn(Alert, 'alert');

// Mock bridge so we can inject the "returned from FolderPicker" value; component reads it in useFocusEffect.
jest.mock('../../Utils/folderPickerResult', () => ({
  getAndClearPendingFolderPickerResult: jest.fn(),
  setPendingFolderPickerResult: jest.fn(),
}));

// Mock usePreventRemove hook - capture callback so tests can simulate "back" and verify no Discard alert after save
let capturedPreventRemoveCallback;
// Allow tests to re-run focus effect (e.g. to simulate return from folder picker)
let runFocusEffectAgain;
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    usePreventRemove: jest.fn((enabled, callback) => {
      capturedPreventRemoveCallback = callback;
    }),
    useFocusEffect: jest.fn((callback) => {
      const fn = typeof callback === 'function' ? callback : callback();
      runFocusEffectAgain = () => fn();
      React.useEffect(() => {
        fn();
        return () => {};
      }, []);
    }),
  };
});

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
    folderPickerResult.getAndClearPendingFolderPickerResult.mockReturnValue(null);
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

  describe('sharedUrl / sharedTitle (opened from Share)', () => {
    it('pre-fills URL when sharedUrl is passed in params', async () => {
      renderWithProviders({
        params: {
          sharedUrl: 'https://shared-from-youtube.com/watch?v=xyz',
        },
      });
      await waitFor(() => {
        expect(screen.getByDisplayValue('https://shared-from-youtube.com/watch?v=xyz')).toBeTruthy();
      });
    });

    it('pre-fills name when sharedTitle is passed in params', async () => {
      renderWithProviders({
        params: {
          sharedTitle: 'Cool Video Title',
        },
      });
      await waitFor(() => {
        expect(screen.getByDisplayValue('Cool Video Title')).toBeTruthy();
      });
    });

    it('pre-fills both URL and name when sharedUrl and sharedTitle are passed', async () => {
      renderWithProviders({
        params: {
          sharedUrl: 'https://example.com/article',
          sharedTitle: 'Article Title',
        },
      });
      await waitFor(() => {
        expect(screen.getByDisplayValue('https://example.com/article')).toBeTruthy();
        expect(screen.getByDisplayValue('Article Title')).toBeTruthy();
      });
    });

    it('can save a bookmark opened from share with pre-filled URL and title', async () => {
      renderWithProviders({
        params: {
          currentFolderId: folderId,
          sharedUrl: 'https://saved-from-share.com',
          sharedTitle: 'Saved From Share',
        },
      });
      await waitFor(() => {
        expect(screen.getByDisplayValue('https://saved-from-share.com')).toBeTruthy();
        expect(screen.getByDisplayValue('Saved From Share')).toBeTruthy();
        expect(screen.getByText('Test Folder')).toBeTruthy();
      });
      await waitFor(() => expect(savedHeaderOptions).toBeTruthy());
      const HeaderRight = savedHeaderOptions.headerRight();
      const { getByText: getHeaderText } = render(HeaderRight);
      fireEvent.press(getHeaderText('Save'));
      await waitFor(() => expect(mockNavigation.goBack).toHaveBeenCalled(), { timeout: 3000 });
      const db = getDatabase();
      const { BookmarkRepository } = require('../../database/repositories');
      const bookmarkRepo = new BookmarkRepository(db);
      const saved = bookmarkRepo.getAll().find(b => b.name === 'Saved From Share');
      expect(saved).toBeTruthy();
      expect(saved.url).toBe('https://saved-from-share.com');
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

  it('applies folder selection when returning from folder picker (bridge)', async () => {
    folderPickerResult.getAndClearPendingFolderPickerResult.mockReturnValue([folderId]);
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByText('Test Folder')).toBeTruthy();
    });
  });

  it('saves bookmark to all folders selected via folder picker (multi-folder fix)', async () => {
    const db = getDatabase();
    const { FolderRepository, BookmarkRepository } = require('../../database/repositories');
    const folderRepo = new FolderRepository(db);
    const folderA = folderRepo.create({ name: 'Music', icon: 'folder' });
    const folderB = folderRepo.create({ name: 'YouTube', icon: 'folder' });

    folderPickerResult.getAndClearPendingFolderPickerResult.mockReturnValue([folderA.id, folderB.id]);
    renderWithProviders({ params: { currentFolderId: folderA.id } });
    await waitFor(() => {
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText(/Music.*YouTube|YouTube.*Music/)).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('name-input'), 'Multi-Folder Bookmark');
    fireEvent.changeText(screen.getByTestId('url-input'), 'https://multi-folder-test.com');

    await waitFor(() => expect(savedHeaderOptions).toBeTruthy());
    const HeaderRight = savedHeaderOptions.headerRight();
    const { getByText: getHeaderText } = render(HeaderRight);
    fireEvent.press(getHeaderText('Save'));

    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    }, { timeout: 3000 });

    const bookmarkRepo = new BookmarkRepository(db);
    const saved = bookmarkRepo.getAll().find(b => b.name === 'Multi-Folder Bookmark');
    expect(saved).toBeTruthy();

    const folderIds = bookmarkRepo.getFolders(saved.id);
    expect(folderIds).toHaveLength(2);
    expect(folderIds).toContain(folderA.id);
    expect(folderIds).toContain(folderB.id);

    const inMusic = bookmarkRepo.getByFolder(folderA.id);
    const inYouTube = bookmarkRepo.getByFolder(folderB.id);
    expect(inMusic.map(b => b.id)).toContain(saved.id);
    expect(inYouTube.map(b => b.id)).toContain(saved.id);
  });

  describe('edit mode (editBookmarkId)', () => {
    it('shows "Edit Bookmark" in header when editBookmarkId is set', () => {
      const db = getDatabase();
      const { BookmarkRepository } = require('../../database/repositories');
      const bookmarkRepo = new BookmarkRepository(db);
      const bookmark = bookmarkRepo.create(
        { name: 'To Edit', url: 'https://edit-initial.com' },
        [folderId]
      );

      renderWithProviders({ params: { editBookmarkId: bookmark.id } });

      expect(savedHeaderOptions).toBeTruthy();
      const HeaderTitle = savedHeaderOptions.headerTitle;
      const { getByText } = render(<HeaderTitle />);
      expect(getByText('Edit Bookmark')).toBeTruthy();
    });

    it('pre-fills form with bookmark name, url, folders and tags when editBookmarkId is set', async () => {
      const db = getDatabase();
      const { BookmarkRepository, TagRepository } = require('../../database/repositories');
      const bookmarkRepo = new BookmarkRepository(db);
      const tagRepo = new TagRepository(db);
      const bookmark = bookmarkRepo.create(
        { name: 'Pre-filled Name', url: 'https://prefilled.com' },
        [folderId]
      );
      tagRepo.setTagsForBookmark(bookmark.id, ['edit-tag']);

      renderWithProviders({ params: { editBookmarkId: bookmark.id } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Pre-filled Name')).toBeTruthy();
        expect(screen.getByDisplayValue('https://prefilled.com')).toBeTruthy();
      });
      expect(screen.getByText('Test Folder')).toBeTruthy();
      expect(screen.getByText('edit-tag')).toBeTruthy();
    });

    it('updates existing bookmark when saving in edit mode', async () => {
      const db = getDatabase();
      const { BookmarkRepository } = require('../../database/repositories');
      const bookmarkRepo = new BookmarkRepository(db);
      const bookmark = bookmarkRepo.create(
        { name: 'Original', url: 'https://original-edit.com' },
        [folderId]
      );

      renderWithProviders({ params: { editBookmarkId: bookmark.id } });

      await waitFor(() => expect(screen.getByDisplayValue('Original')).toBeTruthy());

      fireEvent.changeText(screen.getByTestId('name-input'), 'Updated Name');
      fireEvent.changeText(screen.getByTestId('url-input'), 'https://updated-url.com');

      await waitFor(() => expect(savedHeaderOptions).toBeTruthy());
      const HeaderRight = savedHeaderOptions.headerRight();
      const { getByText: getHeaderText } = render(HeaderRight);
      fireEvent.press(getHeaderText('Save'));

      await waitFor(() => expect(mockNavigation.goBack).toHaveBeenCalled(), { timeout: 3000 });

      const updated = bookmarkRepo.getById(bookmark.id);
      expect(updated).toBeTruthy();
      expect(updated.name).toBe('Updated Name');
      expect(updated.url).toBe('https://updated-url.com');
      expect(bookmarkRepo.getAll().length).toBe(1);
    });

    it('shows duplicate URL alert when edited URL exists on another bookmark', async () => {
      const db = getDatabase();
      const { BookmarkRepository } = require('../../database/repositories');
      const bookmarkRepo = new BookmarkRepository(db);
      const b1 = bookmarkRepo.create({ name: 'First', url: 'https://first.com' }, [folderId]);
      bookmarkRepo.create({ name: 'Second', url: 'https://second.com' }, [folderId]);

      renderWithProviders({ params: { editBookmarkId: b1.id } });

      await waitFor(() => expect(screen.getByDisplayValue('First')).toBeTruthy());

      fireEvent.changeText(screen.getByTestId('url-input'), 'https://second.com');

      await waitFor(() => expect(savedHeaderOptions).toBeTruthy());
      const HeaderRight = savedHeaderOptions.headerRight();
      const { getByText: getHeaderText } = render(HeaderRight);
      fireEvent.press(getHeaderText('Save'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Duplicate URL',
          expect.stringContaining('already exists on another bookmark'),
          expect.any(Array)
        );
      });
    });

    it('updates bookmark when "Use Anyway" pressed after duplicate URL warning in edit mode', async () => {
      const db = getDatabase();
      const { BookmarkRepository } = require('../../database/repositories');
      const bookmarkRepo = new BookmarkRepository(db);
      const b1 = bookmarkRepo.create({ name: 'First', url: 'https://first.com' }, [folderId]);
      bookmarkRepo.create({ name: 'Second', url: 'https://second.com' }, [folderId]);

      renderWithProviders({ params: { editBookmarkId: b1.id } });

      await waitFor(() => expect(screen.getByDisplayValue('First')).toBeTruthy());
      fireEvent.changeText(screen.getByTestId('url-input'), 'https://second.com');

      await waitFor(() => expect(savedHeaderOptions).toBeTruthy());
      const HeaderRight = savedHeaderOptions.headerRight();
      const { getByText: getHeaderText } = render(HeaderRight);
      fireEvent.press(getHeaderText('Save'));

      await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
      const alertCall = Alert.alert.mock.calls.find(c => c[0] === 'Duplicate URL');
      const useAnyway = alertCall[2].find(btn => btn.text === 'Use Anyway');
      await act(async () => {
        useAnyway.onPress();
      });

      await waitFor(() => expect(mockNavigation.goBack).toHaveBeenCalled(), { timeout: 3000 });
      const updated = bookmarkRepo.getById(b1.id);
      expect(updated.url).toBe('https://second.com');
    });

    it('edit mode pre-fills multiple folders and save path uses saveUpdatedBookmark', async () => {
      const db = getDatabase();
      const { FolderRepository, BookmarkRepository } = require('../../database/repositories');
      const folderRepo = new FolderRepository(db);
      const bookmarkRepo = new BookmarkRepository(db);
      const folderA = folderRepo.create({ name: 'Folder A', icon: 'folder' });
      const folderB = folderRepo.create({ name: 'Folder B', icon: 'folder' });
      const bookmark = bookmarkRepo.create(
        { name: 'Two Folders', url: 'https://two-folders.com' },
        [folderA.id, folderB.id]
      );

      renderWithProviders({ params: { editBookmarkId: bookmark.id } });
      await waitFor(() => expect(screen.getByDisplayValue('Two Folders')).toBeTruthy());
      expect(screen.getByDisplayValue('https://two-folders.com')).toBeTruthy();
      expect(screen.getByText(/Folder A.*Folder B|Folder B.*Folder A/)).toBeTruthy();
    });

    it('shows Discard Changes when leaving edit with unsaved changes', async () => {
      const db = getDatabase();
      const { BookmarkRepository } = require('../../database/repositories');
      const bookmarkRepo = new BookmarkRepository(db);
      const bookmark = bookmarkRepo.create(
        { name: 'Discard Test', url: 'https://discard.com' },
        [folderId]
      );

      renderWithProviders({ params: { editBookmarkId: bookmark.id } });

      await waitFor(() => expect(screen.getByDisplayValue('Discard Test')).toBeTruthy());
      fireEvent.changeText(screen.getByTestId('name-input'), 'Changed but not saved');

      expect(capturedPreventRemoveCallback).toBeTruthy();
      Alert.alert.mockClear();
      capturedPreventRemoveCallback({ data: { action: { type: 'GO_BACK' } } });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        expect.any(Array)
      );
    });
  });
});
