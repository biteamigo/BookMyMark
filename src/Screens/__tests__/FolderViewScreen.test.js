import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react-native";
import FolderViewScreen from "../FolderViewScreen";
import { DatabaseProvider } from "../../Context/DatabaseContext";
import { FolderProvider } from "../../Context/FolderContext";

// Mock navigation
const mockNavigate = jest.fn();
const mockPush = jest.fn();
const mockSetParams = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  push: mockPush,
  goBack: jest.fn(),
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

      expect(() => {
        fireEvent.press(screen.getByText("New Bookmark"));
      }).not.toThrow();
    });
  });
});
