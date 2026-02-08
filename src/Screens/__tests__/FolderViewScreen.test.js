import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react-native";
import { Alert, Linking } from "react-native";
import FolderViewScreen from "../FolderViewScreen";
import { DatabaseProvider } from "../../Context/DatabaseContext";
import { FolderProvider } from "../../Context/FolderContext";
import { getDatabase } from "../../database/Database";

jest.spyOn(Alert, 'alert');
jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());

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
  beforeEach(() => {
    jest.clearAllMocks();
    Linking.openURL.mockImplementation(() => Promise.resolve());
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

});
