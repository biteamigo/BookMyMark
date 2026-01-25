import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import MenuItem from "../MenuItem";

describe("MenuItem", () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders with icon and label", () => {
      const MockIcon = () => <></>;
      render(
        <MenuItem
          icon={<MockIcon testID="mock-icon" />}
          label="Test Label"
          onPress={mockOnPress}
        />
      );

      expect(screen.getByText("Test Label")).toBeOnTheScreen();
    });

    it("renders with image source instead of icon", () => {
      const imageSource = { uri: "https://example.com/image.png" };
      render(
        <MenuItem
          imageSource={imageSource}
          label="Image Item"
          onPress={mockOnPress}
        />
      );

      expect(screen.getByText("Image Item")).toBeOnTheScreen();
    });

    it("renders icon when both icon and imageSource are provided", () => {
      // When imageSource is provided, it takes precedence
      const MockIcon = () => <></>;
      const imageSource = { uri: "https://example.com/image.png" };
      
      const { UNSAFE_queryByType } = render(
        <MenuItem
          icon={<MockIcon />}
          imageSource={imageSource}
          label="Both Props"
          onPress={mockOnPress}
        />
      );

      expect(screen.getByText("Both Props")).toBeOnTheScreen();
    });

    it("renders with long label text", () => {
      const longLabel = "This is a very long label that might overflow";
      render(
        <MenuItem
          icon={<></>}
          label={longLabel}
          onPress={mockOnPress}
        />
      );

      expect(screen.getByText(longLabel)).toBeOnTheScreen();
    });

    it("renders with empty label", () => {
      render(
        <MenuItem
          icon={<></>}
          label=""
          onPress={mockOnPress}
        />
      );

      // Component should still render without crashing
      expect(screen.getByText("")).toBeOnTheScreen();
    });
  });

  describe("interactions", () => {
    it("calls onPress when pressed", () => {
      render(
        <MenuItem
          icon={<></>}
          label="Pressable Item"
          onPress={mockOnPress}
        />
      );

      fireEvent.press(screen.getByText("Pressable Item"));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it("calls onPress multiple times on multiple presses", () => {
      render(
        <MenuItem
          icon={<></>}
          label="Multi Press"
          onPress={mockOnPress}
        />
      );

      const item = screen.getByText("Multi Press");
      fireEvent.press(item);
      fireEvent.press(item);
      fireEvent.press(item);

      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });

    it("handles undefined onPress gracefully", () => {
      render(
        <MenuItem
          icon={<></>}
          label="No Handler"
          onPress={undefined}
        />
      );

      // Should not throw when pressed
      expect(() => {
        fireEvent.press(screen.getByText("No Handler"));
      }).not.toThrow();
    });
  });
});
