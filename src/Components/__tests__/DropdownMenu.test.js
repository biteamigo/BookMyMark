import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import DropdownMenu from "../DropdownMenu";

describe("DropdownMenu", () => {
  const mockOnClose = jest.fn();
  const mockOnSelect = jest.fn();
  const mockOnNewFolder = jest.fn();
  const mockOnNewBookmark = jest.fn();

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    onSelect: mockOnSelect,
    onNewFolder: mockOnNewFolder,
    onNewBookmark: mockOnNewBookmark,
    onDelete: jest.fn(),
    onViewModeChange: jest.fn(),
    viewMode: "grid",
    isSelectionMode: false,
    selectedCount: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders all menu items when visible", () => {
      render(<DropdownMenu {...defaultProps} />);

      expect(screen.getByText("Select")).toBeOnTheScreen();
      expect(screen.getByText("New Folder")).toBeOnTheScreen();
      expect(screen.getByText("New Bookmark")).toBeOnTheScreen();
    });

    it("does not render menu items when not visible", () => {
      render(<DropdownMenu {...defaultProps} visible={false} />);

      expect(screen.queryByText("Select")).not.toBeOnTheScreen();
      expect(screen.queryByText("New Folder")).not.toBeOnTheScreen();
      expect(screen.queryByText("New Bookmark")).not.toBeOnTheScreen();
    });
  });

  describe("interactions", () => {
    it("calls onSelect and onClose when Select is pressed", () => {
      render(<DropdownMenu {...defaultProps} />);

      fireEvent.press(screen.getByText("Select"));

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onNewFolder and onClose when New Folder is pressed", () => {
      render(<DropdownMenu {...defaultProps} />);

      fireEvent.press(screen.getByText("New Folder"));

      expect(mockOnNewFolder).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onNewBookmark and onClose when New Bookmark is pressed", () => {
      render(<DropdownMenu {...defaultProps} />);

      fireEvent.press(screen.getByText("New Bookmark"));

      expect(mockOnNewBookmark).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("handles undefined onSelect gracefully", () => {
      render(<DropdownMenu {...defaultProps} onSelect={undefined} />);

      // Should not throw
      expect(() => {
        fireEvent.press(screen.getByText("Select"));
      }).not.toThrow();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("handles undefined onNewFolder gracefully", () => {
      render(<DropdownMenu {...defaultProps} onNewFolder={undefined} />);

      expect(() => {
        fireEvent.press(screen.getByText("New Folder"));
      }).not.toThrow();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("handles undefined onNewBookmark gracefully", () => {
      render(<DropdownMenu {...defaultProps} onNewBookmark={undefined} />);

      expect(() => {
        fireEvent.press(screen.getByText("New Bookmark"));
      }).not.toThrow();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("calls onViewModeChange with grid and onClose when Grid is pressed", () => {
      const onViewModeChange = jest.fn();
      render(<DropdownMenu {...defaultProps} onViewModeChange={onViewModeChange} />);
      fireEvent.press(screen.getByText("Grid"));
      expect(onViewModeChange).toHaveBeenCalledWith("grid");
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("calls onViewModeChange with list and onClose when List is pressed", () => {
      const onViewModeChange = jest.fn();
      render(<DropdownMenu {...defaultProps} onViewModeChange={onViewModeChange} />);
      fireEvent.press(screen.getByText("List"));
      expect(onViewModeChange).toHaveBeenCalledWith("list");
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("selection mode", () => {
    it("shows Delete and Selected count when isSelectionMode is true", () => {
      render(
        <DropdownMenu
          {...defaultProps}
          isSelectionMode={true}
          selectedCount={3}
        />
      );
      expect(screen.getByText("Selected (3)")).toBeOnTheScreen();
      expect(screen.getByText("Delete")).toBeOnTheScreen();
      expect(screen.queryByText("New Folder")).toBeNull();
      expect(screen.queryByText("New Bookmark")).toBeNull();
    });

    it("calls onDelete and onClose when Delete is pressed and selectedCount > 0", () => {
      const onDelete = jest.fn();
      render(
        <DropdownMenu
          {...defaultProps}
          isSelectionMode={true}
          selectedCount={1}
          onDelete={onDelete}
        />
      );
      fireEvent.press(screen.getByText("Delete"));
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("does not call onDelete when Delete is pressed and selectedCount is 0", () => {
      const onDelete = jest.fn();
      render(
        <DropdownMenu
          {...defaultProps}
          isSelectionMode={true}
          selectedCount={0}
          onDelete={onDelete}
        />
      );
      fireEvent.press(screen.getByText("Delete"));
      expect(onDelete).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
