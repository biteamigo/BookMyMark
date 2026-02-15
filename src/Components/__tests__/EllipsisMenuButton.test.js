import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import EllipsisMenuButton from "../EllipsisMenuButton";
import DropdownMenu from "../DropdownMenu";

describe("EllipsisMenuButton", () => {
  const mockOnSelect = jest.fn();
  const mockOnNewFolder = jest.fn();
  const mockOnNewBookmark = jest.fn();

  const defaultProps = {
    onSelect: mockOnSelect,
    onNewFolder: mockOnNewFolder,
    onNewBookmark: mockOnNewBookmark,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the ellipsis icon", () => {
      const { UNSAFE_getByType } = render(<EllipsisMenuButton {...defaultProps} />);

      const icon = UNSAFE_getByType("Ionicons");
      expect(icon.props.name).toBe("ellipsis-horizontal");
    });

    it("initially does not show the dropdown menu", () => {
      render(<EllipsisMenuButton {...defaultProps} />);

      // Menu items should not be visible initially
      expect(screen.queryByText("Select")).not.toBeOnTheScreen();
      expect(screen.queryByText("New Folder")).not.toBeOnTheScreen();
    });
  });

  describe("interactions", () => {
    it("shows dropdown menu when button is pressed", () => {
      const { UNSAFE_getByType } = render(<EllipsisMenuButton {...defaultProps} />);

      // Find and press the button (the Ionicons is inside the button)
      const icon = UNSAFE_getByType("Ionicons");
      // Get parent touchable and press
      fireEvent.press(icon);

      // Menu should now be visible
      expect(screen.getByText("Select")).toBeOnTheScreen();
      expect(screen.getByText("New Folder")).toBeOnTheScreen();
      expect(screen.getByText("New Bookmark")).toBeOnTheScreen();
    });

    it("calls onNewFolder when New Folder is pressed in dropdown", () => {
      const { UNSAFE_getByType } = render(<EllipsisMenuButton {...defaultProps} />);

      // Open menu
      const icon = UNSAFE_getByType("Ionicons");
      fireEvent.press(icon);

      // Press New Folder
      fireEvent.press(screen.getByText("New Folder"));

      expect(mockOnNewFolder).toHaveBeenCalledTimes(1);
    });

    it("calls onSelect when Select is pressed in dropdown", () => {
      const { UNSAFE_getByType } = render(<EllipsisMenuButton {...defaultProps} />);

      // Open menu
      fireEvent.press(UNSAFE_getByType("Ionicons"));

      // Press Select
      fireEvent.press(screen.getByText("Select"));

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it("calls onNewBookmark when New Bookmark is pressed in dropdown", () => {
      const { UNSAFE_getByType } = render(<EllipsisMenuButton {...defaultProps} />);

      // Open menu
      fireEvent.press(UNSAFE_getByType("Ionicons"));

      // Press New Bookmark
      fireEvent.press(screen.getByText("New Bookmark"));

      expect(mockOnNewBookmark).toHaveBeenCalledTimes(1);
    });

    it("closes dropdown after menu item is pressed", () => {
      const { UNSAFE_getByType } = render(<EllipsisMenuButton {...defaultProps} />);

      // Open menu
      fireEvent.press(UNSAFE_getByType("Ionicons"));
      expect(screen.getByText("Select")).toBeOnTheScreen();

      // Press an item (which should close the menu)
      fireEvent.press(screen.getByText("Select"));

      // Menu should be closed
      expect(screen.queryByText("Select")).not.toBeOnTheScreen();
    });
  });

  describe("onEdit", () => {
    it("passes onEdit to DropdownMenu when provided", () => {
      const onEdit = jest.fn();
      const { UNSAFE_getByType } = render(
        <EllipsisMenuButton
          {...defaultProps}
          onEdit={onEdit}
          isSelectionMode={true}
          selectedCount={1}
        />
      );
      const dropdown = UNSAFE_getByType(DropdownMenu);
      expect(dropdown.props.onEdit).toBe(onEdit);
    });

    it("calls onEdit when Edit is pressed in dropdown and selectedCount is 1", () => {
      const onEdit = jest.fn();
      const { UNSAFE_getByType } = render(
        <EllipsisMenuButton
          {...defaultProps}
          onEdit={onEdit}
          isSelectionMode={true}
          selectedCount={1}
        />
      );
      fireEvent.press(UNSAFE_getByType("Ionicons"));
      fireEvent.press(screen.getByText("Edit"));
      expect(onEdit).toHaveBeenCalledTimes(1);
    });
  });
});
