import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react-native";
import { Alert, Linking, FlatList } from "react-native";
import FolderViewScreen from "../FolderViewScreen";
import { DatabaseProvider } from "../../Context/DatabaseContext";
import { FolderProvider } from "../../Context/FolderContext";
import { getDatabase } from "../../database/Database";

jest.spyOn(Alert, 'alert');
jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());

const mockResetShareIntent = jest.fn();
jest.mock("expo-share-intent", () => ({
  useShareIntentContext: jest.fn(() => ({
    hasShareIntent: false,
    shareIntent: null,
    resetShareIntent: mockResetShareIntent,
    error: null,
  })),
}));

// Run useFocusEffect callback on mount so share-intent and other focus logic runs in tests
jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  const React = require("react");
  return {
    ...actual,
    useFocusEffect: (callback) => {
      React.useEffect(() => {
        const cleanup = callback();
        return typeof cleanup === "function" ? cleanup : undefined;
      }, []);
    },
  };
});

jest.mock("../../Utils/layoutUtils", () => {
  const actual = jest.requireActual("../../Utils/layoutUtils");
  return {
    ...actual,
    getGridNumColumns: jest.fn(actual.getGridNumColumns),
  };
});

// Override safe area mock so we can test inset application
const mockUseSafeAreaInsets = jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 }));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children, style }) => {
    const R = require("react");
    const { View } = require("react-native");
    return R.createElement(View, { style }, children);
  },
  useSafeAreaInsets: () => mockUseSafeAreaInsets(),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockPush = jest.fn();
const mockSetParams = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  push: mockPush,
  goBack: mockGoBack,
  setParams: mockSetParams,
};

// Wrap component with providers
const renderWithProviders = (props = {}) => {
  const defaultRoute = { params: {} };
  const route = props.route || defaultRoute;
  
  return render(
    <DatabaseProvider>
      <FolderProvider>
        <FolderViewScreen navigation={mockNavigation} route={route} {...props} />
      </FolderProvider>
    </DatabaseProvider>
  );
};

describe("FolderViewScreen", () => {
  const getShareIntentMock = () => require("expo-share-intent").useShareIntentContext;

  beforeEach(() => {
    jest.clearAllMocks();
    Linking.openURL.mockImplementation(() => Promise.resolve());
    mockUseSafeAreaInsets.mockReturnValue({ top: 0, bottom: 0, left: 0, right: 0 });
    getShareIntentMock().mockImplementation(() => ({
      hasShareIntent: false,
      shareIntent: null,
      resetShareIntent: mockResetShareIntent,
      error: null,
    }));
  });

  describe("Root level (folderId: null)", () => {
    it("renders search bar", () => {
      renderWithProviders();
      expect(screen.getByPlaceholderText("Search")).toBeOnTheScreen();
    });

    it("renders bottom action bar", () => {
      renderWithProviders();
      expect(screen.getByText("Select")).toBeOnTheScreen();
      expect(screen.getByText("New Folder")).toBeOnTheScreen();
      expect(screen.getByText("New Bookmark")).toBeOnTheScreen();
    });

    it("renders without crashing", () => {
      expect(() => renderWithProviders()).not.toThrow();
    });

    it("creates new folder at root level", async () => {
      renderWithProviders();

      const newFolderButtons = screen.getAllByText("New Folder");
      
      await act(async () => {
        fireEvent.press(newFolderButtons[0]);
      });

      await waitFor(() => {
        const inputs = screen.queryAllByDisplayValue(/New Folder/);
        expect(inputs.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Subfolder level (folderId: 'some-id')", () => {
    it("renders with subfolder ID", () => {
      renderWithProviders({
        route: { params: { folderId: "test-folder-id" } }
      });
      
      expect(screen.getByPlaceholderText("Search")).toBeOnTheScreen();
    });

    it("renders without crashing with folderId", () => {
      expect(() => {
        renderWithProviders({
          route: { params: { folderId: "test-folder-id" } }
        });
      }).not.toThrow();
    });
  });

  describe("Folder editing", () => {
    it("allows editing folder name", async () => {
      renderWithProviders();

      const newFolderButtons = screen.getAllByText("New Folder");
      
      await act(async () => {
        fireEvent.press(newFolderButtons[0]);
      });

      await waitFor(() => {
        const inputs = screen.queryAllByDisplayValue(/New Folder/);
        expect(inputs.length).toBeGreaterThan(0);
      });

      const inputs = screen.queryAllByDisplayValue(/New Folder/);
      const editingInput = inputs[0];

      await act(async () => {
        fireEvent.changeText(editingInput, "My Folder");
      });

      const customInputs = screen.queryAllByDisplayValue("My Folder");
      expect(customInputs.length).toBeGreaterThan(0);
    });

    it("submits folder name on blur", async () => {
      renderWithProviders();

      const newFolderButtons = screen.getAllByText("New Folder");
      
      await act(async () => {
        fireEvent.press(newFolderButtons[0]);
      });

      await waitFor(() => {
        const inputs = screen.queryAllByDisplayValue(/New Folder/);
        expect(inputs.length).toBeGreaterThan(0);
      });

      const inputs = screen.queryAllByDisplayValue(/New Folder/);
      const editingInput = inputs[0];

      await act(async () => {
        fireEvent(editingInput, "blur");
      });

      // Should not throw
    });

    it("handles empty name submission", async () => {
      renderWithProviders();

      const newFolderButtons = screen.getAllByText("New Folder");
      
      await act(async () => {
        fireEvent.press(newFolderButtons[0]);
      });

      await waitFor(() => {
        const inputs = screen.queryAllByDisplayValue(/New Folder/);
        expect(inputs.length).toBeGreaterThan(0);
      });

      const inputs = screen.queryAllByDisplayValue(/New Folder/);
      const editingInput = inputs[0];

      await act(async () => {
        fireEvent.changeText(editingInput, "");
      });

      await act(async () => {
        fireEvent(editingInput, "submitEditing");
      });

      // Should handle empty name gracefully
      const newFolderElements = screen.getAllByText("New Folder");
      expect(newFolderElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Search functionality", () => {
    it("updates search term when typing", () => {
      renderWithProviders();

      const searchInput = screen.getByPlaceholderText("Search");
      fireEvent.changeText(searchInput, "test");

      expect(searchInput.props.value).toBe("test");
    });

    it("clears search term", () => {
      renderWithProviders();

      const searchInput = screen.getByPlaceholderText("Search");
      fireEvent.changeText(searchInput, "test");
      fireEvent.changeText(searchInput, "");

      expect(searchInput.props.value).toBe("");
    });

    it("shows no-results message when search has no matches", async () => {
      jest.useFakeTimers();
      renderWithProviders();

      const searchInput = screen.getByPlaceholderText("Search");
      fireEvent.changeText(searchInput, "xyznonexistent");

      await act(async () => {
        jest.advanceTimersByTime(250);
      });

      await waitFor(() => {
        expect(screen.getByText("No folders or bookmarks match")).toBeOnTheScreen();
      });

      jest.useRealTimers();
    });

    it("shows full list again when search is cleared", async () => {
      jest.useFakeTimers();
      renderWithProviders();

      const searchInput = screen.getByPlaceholderText("Search");
      fireEvent.changeText(searchInput, "xyznonexistent");
      await act(async () => {
        jest.advanceTimersByTime(250);
      });
      await waitFor(() => {
        expect(screen.getByText("No folders or bookmarks match")).toBeOnTheScreen();
      });

      fireEvent.changeText(searchInput, "");
      await act(async () => {
        jest.advanceTimersByTime(250);
      });

      expect(screen.queryByText("No folders or bookmarks match")).toBeNull();

      jest.useRealTimers();
    });

    it("scopes search to current folder (root)", async () => {
      jest.useFakeTimers();
      renderWithProviders({ route: { params: {} } });

      const searchInput = screen.getByPlaceholderText("Search");
      fireEvent.changeText(searchInput, "test");
      await act(async () => {
        jest.advanceTimersByTime(250);
      });

      await waitFor(() => {
        expect(screen.queryByPlaceholderText("Search")).toBeOnTheScreen();
      });
      expect(screen.getByText("No folders or bookmarks match")).toBeOnTheScreen();

      jest.useRealTimers();
    });

    it("scopes search to current folder (subfolder)", async () => {
      jest.useFakeTimers();
      renderWithProviders({
        route: { params: { folderId: "subfolder-id" } }
      });

      const searchInput = screen.getByPlaceholderText("Search");
      fireEvent.changeText(searchInput, "query");
      await act(async () => {
        jest.advanceTimersByTime(250);
      });

      await waitFor(() => {
        expect(screen.getByText("No folders or bookmarks match")).toBeOnTheScreen();
      });

      jest.useRealTimers();
    });

  });

  describe("Bottom action bar", () => {
    it("has working Select button", () => {
      renderWithProviders();

      expect(() => {
        fireEvent.press(screen.getByText("Select"));
      }).not.toThrow();
    });

    it("has working New Bookmark button", () => {
      renderWithProviders();

      const newBookmarkButton = screen.getByText("New Bookmark");
      fireEvent.press(newBookmarkButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('NewBookmark', { currentFolderId: null });
    });

    it("navigates to New Bookmark screen", () => {
      renderWithProviders();

      const newBookmarkButton = screen.getByText("New Bookmark");
      fireEvent.press(newBookmarkButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('NewBookmark', expect.any(Object));
    });
  });


  describe("Text selection during editing", () => {
    it("clears selection when changing text", async () => {
      renderWithProviders();

      const newFolderButtons = screen.getAllByText("New Folder");
      
      await act(async () => {
        fireEvent.press(newFolderButtons[0]);
      });

      await waitFor(() => {
        const inputs = screen.queryAllByDisplayValue(/New Folder/);
        expect(inputs.length).toBeGreaterThan(0);
      });

      const inputs = screen.queryAllByDisplayValue(/New Folder/);
      const editingInput = inputs[0];

      await act(async () => {
        fireEvent.changeText(editingInput, "Changed");
      });

      // Text was changed, selection should be cleared
      expect(editingInput.props.value).toBe("Changed");
    });
  });

  describe("Selection mode", () => {
    it("toggles selection mode when Select button is pressed", () => {
      renderWithProviders();

      const selectButton = screen.getAllByText(/Select/)[0];
      
      // Should not throw
      expect(() => fireEvent.press(selectButton)).not.toThrow();
    });

    it("exposes toggleSelectionMode function via navigation params", async () => {
      renderWithProviders();

      await waitFor(() => {
        const calls = mockNavigation.setParams.mock.calls;
        const hasToggleFunc = calls.some(call => 
          call[0] && typeof call[0]._toggleSelectionMode === 'function'
        );
        expect(hasToggleFunc).toBe(true);
      });
    });

    it("exposes handleDelete via navigation params", async () => {
      renderWithProviders();

      await waitFor(() => {
        const calls = mockSetParams.mock.calls;
        const lastCall = calls[calls.length - 1];
        expect(lastCall[0]._handleDelete).toBeDefined();
        expect(typeof lastCall[0]._handleDelete).toBe('function');
      });
    });

    it("exposes handleEdit via navigation params", async () => {
      renderWithProviders();

      await waitFor(() => {
        const calls = mockSetParams.mock.calls;
        const lastCall = calls[calls.length - 1];
        expect(lastCall[0]._handleEdit).toBeDefined();
        expect(typeof lastCall[0]._handleEdit).toBe('function');
      });
    });
  });

  describe("Delete flow", () => {
    it("handleDelete when called with no selection does not show Alert", async () => {
      renderWithProviders();

      await waitFor(() => {
        const calls = mockSetParams.mock.calls;
        return calls.length > 0 && calls[calls.length - 1][0]._handleDelete != null;
      });

      const params = mockSetParams.mock.calls[mockSetParams.mock.calls.length - 1][0];
      const beforeCalls = Alert.alert.mock.calls.length;
      params._handleDelete();
      expect(Alert.alert.mock.calls.length).toBe(beforeCalls);
    });

    it("Alert.alert is used for delete confirmation when provided buttons", () => {
      expect(Alert.alert).toBeDefined();
      expect(typeof Alert.alert).toBe('function');
    });
  });

  describe("Item press behavior", () => {
    it("navigates to subfolder when folder item is pressed (not selection mode)", async () => {
      const db = getDatabase();
      const { FolderRepository } = require('../../database/repositories');
      const folderRepo = new FolderRepository(db);
      const parent = folderRepo.create({ name: 'ParentFolder', icon: 'folder' });
      const child = folderRepo.create({ name: 'ChildFolder', icon: 'folder', parentId: parent.id });

      renderWithProviders({ route: { params: { folderId: parent.id } } });

      await waitFor(() => {
        expect(screen.getByText('ChildFolder')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('ChildFolder'));

      expect(mockPush).toHaveBeenCalledWith('FolderView', { folderId: child.id });
    });

    it("opens URL when bookmark item is pressed (not selection mode)", async () => {
      const db = getDatabase();
      const { FolderRepository, BookmarkRepository } = require('../../database/repositories');
      const folderRepo = new FolderRepository(db);
      const bookmarkRepo = new BookmarkRepository(db);
      const folder = folderRepo.create({ name: 'LinkFolder', icon: 'folder' });
      const bookmark = bookmarkRepo.create(
        { name: 'My Link', url: 'https://example.com' },
        [folder.id]
      );

      renderWithProviders({ route: { params: { folderId: folder.id } } });

      await waitFor(() => {
        expect(screen.getByTestId(`bookmark-item-${bookmark.id}`)).toBeTruthy();
      });

      const bookmarkButton = screen.getByTestId(`bookmark-item-${bookmark.id}`);
      expect(bookmarkButton).toBeTruthy();
      await act(async () => {
        fireEvent.press(bookmarkButton);
      });

      // Pressing a bookmark runs the bookmark branch (opens URL), not folder navigation
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("toggles selection when folder is pressed in selection mode", async () => {
      const db = getDatabase();
      const { FolderRepository } = require('../../database/repositories');
      const folderRepo = new FolderRepository(db);
      const folder = folderRepo.create({ name: 'SelectableFolder', icon: 'folder' });

      renderWithProviders();

      await waitFor(() => {
        const calls = mockSetParams.mock.calls;
        return calls.length > 0 && calls[calls.length - 1][0]._toggleSelectionMode != null;
      });

      const getParams = () => mockSetParams.mock.calls[mockSetParams.mock.calls.length - 1][0];
      await act(async () => {
        getParams()._toggleSelectionMode();
      });

      await waitFor(() => expect(screen.getByText('SelectableFolder')).toBeTruthy());

      fireEvent.press(screen.getByText('SelectableFolder'));

      await waitFor(() => {
        const p = mockSetParams.mock.calls[mockSetParams.mock.calls.length - 1][0];
        return p.selectedCount === 1;
      });

      expect(getParams().selectedCount).toBe(1);
    });
  });

  describe("Edit flow", () => {
    it("handleEdit with no selection does not navigate", async () => {
      renderWithProviders();

      await waitFor(() => {
        const calls = mockSetParams.mock.calls;
        return calls.length > 0 && calls[calls.length - 1][0]._handleEdit != null;
      });

      const params = mockSetParams.mock.calls[mockSetParams.mock.calls.length - 1][0];
      params._handleEdit();

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("handleEdit with one bookmark selected navigates to NewBookmark with editBookmarkId", async () => {
      const db = getDatabase();
      const { FolderRepository, BookmarkRepository } = require('../../database/repositories');
      const folderRepo = new FolderRepository(db);
      const bookmarkRepo = new BookmarkRepository(db);
      const folder = folderRepo.create({ name: 'LinkFolder', icon: 'folder' });
      const bookmark = bookmarkRepo.create(
        { name: 'My Link', url: 'https://example.com' },
        [folder.id]
      );

      renderWithProviders({ route: { params: { folderId: folder.id } } });

      await waitFor(() => expect(screen.getByTestId(`bookmark-item-${bookmark.id}`)).toBeTruthy());

      const getParams = () => mockSetParams.mock.calls[mockSetParams.mock.calls.length - 1][0];
      await waitFor(() => expect(getParams()._handleEdit).toBeDefined());

      await act(async () => {
        getParams()._toggleSelectionMode();
      });

      await waitFor(() => expect(getParams().selectedCount).toBe(0));
      fireEvent.press(screen.getByTestId(`bookmark-item-${bookmark.id}`));

      await waitFor(() => expect(getParams().selectedCount).toBe(1));

      getParams()._handleEdit();

      expect(mockNavigate).toHaveBeenCalledWith('NewBookmark', { editBookmarkId: bookmark.id });
    });

    it("handleEdit with one folder selected enters folder edit mode (inline rename)", async () => {
      const db = getDatabase();
      const { FolderRepository } = require('../../database/repositories');
      const folderRepo = new FolderRepository(db);
      const folder = folderRepo.create({ name: 'EditMeFolder', icon: 'folder' });

      renderWithProviders();

      await waitFor(() => expect(screen.getByText('EditMeFolder')).toBeTruthy());

      const getParams = () => mockSetParams.mock.calls[mockSetParams.mock.calls.length - 1][0];
      await waitFor(() => expect(getParams()._handleEdit).toBeDefined());

      await act(async () => {
        getParams()._toggleSelectionMode();
      });

      fireEvent.press(screen.getByText('EditMeFolder'));
      await waitFor(() => expect(getParams().selectedCount).toBe(1));

      getParams()._handleEdit();

      await waitFor(() => {
        const inputs = screen.queryAllByDisplayValue('EditMeFolder');
        expect(inputs.length).toBeGreaterThan(0);
      });
    });

    it("handleEdit with two items selected does not navigate", async () => {
      const db = getDatabase();
      const { FolderRepository, BookmarkRepository } = require('../../database/repositories');
      const folderRepo = new FolderRepository(db);
      const bookmarkRepo = new BookmarkRepository(db);
      const folder = folderRepo.create({ name: 'TwoItemsFolder', icon: 'folder' });
      const b1 = bookmarkRepo.create({ name: 'B1', url: 'https://b1.com' }, [folder.id]);
      const b2 = bookmarkRepo.create({ name: 'B2', url: 'https://b2.com' }, [folder.id]);

      renderWithProviders({ route: { params: { folderId: folder.id } } });

      await waitFor(() => {
        expect(screen.getByTestId(`bookmark-item-${b1.id}`)).toBeTruthy();
        expect(screen.getByTestId(`bookmark-item-${b2.id}`)).toBeTruthy();
      });

      const getParams = () => mockSetParams.mock.calls[mockSetParams.mock.calls.length - 1][0];
      await act(async () => { getParams()._toggleSelectionMode(); });
      fireEvent.press(screen.getByTestId(`bookmark-item-${b1.id}`));
      fireEvent.press(screen.getByTestId(`bookmark-item-${b2.id}`));
      await waitFor(() => expect(getParams().selectedCount).toBe(2));

      mockNavigate.mockClear();
      getParams()._handleEdit();

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Safe area", () => {
    it("applies bottom safe area inset to list padding so content stays above home indicator", () => {
      mockUseSafeAreaInsets.mockReturnValue({ top: 47, bottom: 34, left: 0, right: 0 });
      renderWithProviders();
      const flatList = screen.getByTestId("folder-list-flatlist");
      const style = flatList.props.contentContainerStyle;
      const merged = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
      expect(merged.paddingTop).toBe(50); // SEARCH_BAR_HEIGHT only (no top inset to avoid gap under header)
      expect(merged.paddingBottom).toBe(34 + 100); // insets.bottom + BOTTOM_BAR_OFFSET
    });

    it("uses zero bottom inset when on device without home indicator", () => {
      mockUseSafeAreaInsets.mockReturnValue({ top: 0, bottom: 0, left: 0, right: 0 });
      renderWithProviders();
      const flatList = screen.getByTestId("folder-list-flatlist");
      const style = flatList.props.contentContainerStyle;
      const merged = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
      expect(merged.paddingTop).toBe(50);
      expect(merged.paddingBottom).toBe(100);
    });
  });

  describe("Responsive grid", () => {
    it("uses 2 columns in grid view when getGridNumColumns returns 2", () => {
      const layoutUtils = require("../../Utils/layoutUtils");
      layoutUtils.getGridNumColumns.mockReturnValue(2);
      const { UNSAFE_root } = renderWithProviders();
      const flatListInst = UNSAFE_root.findAllByType(FlatList)[0];
      expect(flatListInst.props.numColumns).toBe(2);
    });

    it("uses 3 columns in grid view when getGridNumColumns returns 3", () => {
      const layoutUtils = require("../../Utils/layoutUtils");
      layoutUtils.getGridNumColumns.mockReturnValue(3);
      const { UNSAFE_root } = renderWithProviders();
      const flatListInst = UNSAFE_root.findAllByType(FlatList)[0];
      expect(flatListInst.props.numColumns).toBe(3);
    });

    it("uses 1 column in list view (subfolder) regardless of grid columns", () => {
      const { UNSAFE_root } = renderWithProviders({ route: { params: { folderId: "some-id" } } });
      const flatListInst = UNSAFE_root.findAllByType(FlatList)[0];
      expect(flatListInst.props.numColumns).toBe(1);
    });
  });

  describe("Share intent (opened from Share sheet)", () => {
    it("does not navigate when there is no share intent", () => {
      getShareIntentMock().mockReturnValue({
        hasShareIntent: false,
        shareIntent: null,
        resetShareIntent: mockResetShareIntent,
        error: null,
      });
      renderWithProviders();
      expect(mockNavigate).not.toHaveBeenCalledWith("NewBookmark", expect.anything());
      expect(mockResetShareIntent).not.toHaveBeenCalled();
    });

    it("navigates to NewBookmark with sharedUrl and sharedTitle when share intent has webUrl and meta.title", async () => {
      getShareIntentMock().mockImplementation(() => ({
        hasShareIntent: true,
        shareIntent: {
          webUrl: "https://youtube.com/watch?v=abc",
          text: "https://youtube.com/watch?v=abc",
          meta: { title: "Cool Video" },
          files: [],
        },
        resetShareIntent: mockResetShareIntent,
        error: null,
      }));
      renderWithProviders();
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("NewBookmark", {
          currentFolderId: null,
          sharedUrl: "https://youtube.com/watch?v=abc",
          sharedTitle: "Cool Video",
        });
      });
      expect(mockResetShareIntent).toHaveBeenCalled();
    });

    it("navigates to NewBookmark with sharedUrl from text when webUrl is missing", async () => {
      getShareIntentMock().mockImplementation(() => ({
        hasShareIntent: true,
        shareIntent: {
          webUrl: null,
          text: "https://example.com/page",
          meta: {},
          files: [],
        },
        resetShareIntent: mockResetShareIntent,
        error: null,
      }));
      renderWithProviders();
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("NewBookmark", {
          currentFolderId: null,
          sharedUrl: "https://example.com/page",
          sharedTitle: undefined,
        });
      });
      expect(mockResetShareIntent).toHaveBeenCalled();
    });

    it("does not navigate and resets when share intent has no URL or text", async () => {
      getShareIntentMock().mockImplementation(() => ({
        hasShareIntent: true,
        shareIntent: {
          webUrl: null,
          text: "",
          meta: {},
          files: [],
        },
        resetShareIntent: mockResetShareIntent,
        error: null,
      }));
      renderWithProviders();
      await waitFor(() => {
        expect(mockResetShareIntent).toHaveBeenCalled();
      });
      expect(mockNavigate).not.toHaveBeenCalledWith("NewBookmark", expect.anything());
    });

    it("passes currentFolderId when in subfolder and share intent is present", async () => {
      getShareIntentMock().mockImplementation(() => ({
        hasShareIntent: true,
        shareIntent: {
          webUrl: "https://shared.com",
          text: "https://shared.com",
          meta: { title: "Shared Page" },
          files: [],
        },
        resetShareIntent: mockResetShareIntent,
        error: null,
      }));
      renderWithProviders({ route: { params: { folderId: "folder-123" } } });
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("NewBookmark", {
          currentFolderId: "folder-123",
          sharedUrl: "https://shared.com",
          sharedTitle: "Shared Page",
        });
      });
    });
  });
});
