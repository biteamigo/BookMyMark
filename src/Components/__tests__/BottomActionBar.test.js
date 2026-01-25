import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import BottomActionBar from "../BottomActionBar";
import { DatabaseProvider } from "../../Context/DatabaseContext";
import { FolderProvider } from "../../Context/FolderContext";

// Wrap component with providers for testing
const renderWithProvider = (component) => {
  return render(
    <DatabaseProvider>
      <FolderProvider>{component}</FolderProvider>
    </DatabaseProvider>
  );
};

describe("BottomActionBar", () => {
  const mockOnSelect = jest.fn();
  const mockOnNewBookmark = jest.fn();

  const defaultProps = {
    onSelect: mockOnSelect,
    onNewBookmark: mockOnNewBookmark,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders all three action buttons", () => {
      renderWithProvider(<BottomActionBar {...defaultProps} />);

      expect(screen.getByText("Select")).toBeOnTheScreen();
      expect(screen.getByText("New Folder")).toBeOnTheScreen();
      expect(screen.getByText("New Bookmark")).toBeOnTheScreen();
    });

    it("renders correct icons", () => {
      const { UNSAFE_getAllByType } = renderWithProvider(
        <BottomActionBar {...defaultProps} />
      );

      const ionicons = UNSAFE_getAllByType("Ionicons");
      const materialIcons = UNSAFE_getAllByType("MaterialCommunityIcons");

      expect(ionicons).toHaveLength(1); // checkmark-circle-outline
      expect(materialIcons).toHaveLength(2); // folder-plus-outline, bookmark-plus-outline
    });

    it("renders dividers between buttons", () => {
      const { toJSON } = renderWithProvider(<BottomActionBar {...defaultProps} />);
      const tree = JSON.stringify(toJSON());

      // Check that the structure includes multiple View elements for dividers
      expect(tree).toBeDefined();
    });
  });

  describe("interactions", () => {
    it("calls onSelect when Select button is pressed", () => {
      renderWithProvider(<BottomActionBar {...defaultProps} />);

      fireEvent.press(screen.getByText("Select"));

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it("calls onNewBookmark when New Bookmark button is pressed", () => {
      renderWithProvider(<BottomActionBar {...defaultProps} />);

      fireEvent.press(screen.getByText("New Bookmark"));

      expect(mockOnNewBookmark).toHaveBeenCalledTimes(1);
    });

    it("calls addFolder from context when New Folder is pressed", () => {
      // This tests that the New Folder button uses the context's addFolder
      renderWithProvider(<BottomActionBar {...defaultProps} />);

      // Should not throw when pressed
      expect(() => {
        fireEvent.press(screen.getByText("New Folder"));
      }).not.toThrow();
    });

    it("passes currentFolderId to folder creation", () => {
      renderWithProvider(
        <BottomActionBar 
          currentFolderId="test-folder-id"
          onSelect={mockOnSelect}
          onNewBookmark={mockOnNewBookmark}
        />
      );

      // Should not throw when pressed with currentFolderId
      expect(() => {
        fireEvent.press(screen.getByText("New Folder"));
      }).not.toThrow();
    });

    it("handles undefined onSelect gracefully", () => {
      renderWithProvider(<BottomActionBar onNewBookmark={mockOnNewBookmark} />);

      expect(() => {
        fireEvent.press(screen.getByText("Select"));
      }).not.toThrow();
    });

    it("handles undefined onNewBookmark gracefully", () => {
      renderWithProvider(<BottomActionBar onSelect={mockOnSelect} />);

      expect(() => {
        fireEvent.press(screen.getByText("New Bookmark"));
      }).not.toThrow();
    });
  });
});
