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
  });
});
