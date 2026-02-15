import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { View, Text, TouchableOpacity } from "react-native";
import { DatabaseProvider } from "../DatabaseContext";
import { FolderProvider, useFolders } from "../FolderContext";

// Wrap with both providers
const TestWrapper = ({ children }) => (
  <DatabaseProvider>
    <FolderProvider>{children}</FolderProvider>
  </DatabaseProvider>
);

// Simple test component
const TestConsumer = () => {
  const context = useFolders();

  return (
    <View>
      <Text testID="categories-count">{context.categories.length}</Text>
      <Text testID="editing-id">{context.editingFolderId || "none"}</Text>
      <TouchableOpacity testID="add-folder" onPress={context.addFolder}>
        <Text>Add Folder</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="cancel-editing" onPress={context.cancelEditing}>
        <Text>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="start-edit-folder"
        onPress={() => context.setEditingFolderId && context.setEditingFolderId("test-edit-id")}
      >
        <Text>Start Edit</Text>
      </TouchableOpacity>
    </View>
  );
};

describe("FolderContext", () => {
  describe("FolderProvider", () => {
    it("provides initial editingFolderId as null", () => {
      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      );

      expect(screen.getByTestId("editing-id").props.children).toBe("none");
    });

    it("renders children correctly", () => {
      render(
        <TestWrapper>
          <Text testID="child">Child Content</Text>
        </TestWrapper>
      );

      expect(screen.getByTestId("child")).toBeOnTheScreen();
    });
  });

  describe("useFolders hook", () => {
    it("throws error when used outside FolderProvider", () => {
      const spy = jest.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        render(
          <DatabaseProvider>
            <TestConsumer />
          </DatabaseProvider>
        );
      }).toThrow("useFolders must be used within a FolderProvider");

      spy.mockRestore();
    });
  });

  describe("addFolder", () => {
    it("adds a new folder", () => {
      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      );

      const initialCount = screen.getByTestId("categories-count").props.children;

      act(() => {
        fireEvent.press(screen.getByTestId("add-folder"));
      });

      // Should have more folders than initial count
      expect(screen.getByTestId("categories-count").props.children).toBeGreaterThan(initialCount);
    });

    it("sets editingFolderId when adding folder", () => {
      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      );

      act(() => {
        fireEvent.press(screen.getByTestId("add-folder"));
      });

      expect(screen.getByTestId("editing-id").props.children).not.toBe("none");
    });
  });

  describe("cancelEditing", () => {
    it("clears editingFolderId", () => {
      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      );

      act(() => {
        fireEvent.press(screen.getByTestId("add-folder"));
      });

      act(() => {
        fireEvent.press(screen.getByTestId("cancel-editing"));
      });

      expect(screen.getByTestId("editing-id").props.children).toBe("none");
    });
  });

  describe("setEditingFolderId", () => {
    it("exposes setEditingFolderId and sets editing id when called", () => {
      render(
        <TestWrapper>
          <TestConsumer />
        </TestWrapper>
      );

      expect(screen.getByTestId("editing-id").props.children).toBe("none");

      act(() => {
        fireEvent.press(screen.getByTestId("start-edit-folder"));
      });

      expect(screen.getByTestId("editing-id").props.children).toBe("test-edit-id");
    });
  });
});
