import React from "react";
import { render, screen } from "@testing-library/react-native";
import BookMark from "../BookMark";

describe("BookMark Component", () => {
  describe("rendering", () => {
    it("renders with icon and bookmark props", () => {
      const mockBookMark = {
        id: "1",
        name: "Test Bookmark",
        bookMarkURL: "https://example.com",
      };

      render(<BookMark icon="test-icon" bookMark={mockBookMark} />);

      // Component renders "icon" text
      expect(screen.getByText("icon")).toBeOnTheScreen();
    });

    it("renders without crashing with undefined props", () => {
      render(<BookMark icon={undefined} bookMark={undefined} />);

      expect(screen.getByText("icon")).toBeOnTheScreen();
    });

    it("renders without crashing with null props", () => {
      render(<BookMark icon={null} bookMark={null} />);

      expect(screen.getByText("icon")).toBeOnTheScreen();
    });

    it("renders with complex bookmark object", () => {
      const mockBookMark = {
        id: "123",
        name: "Complex Bookmark",
        bookMarkURL: "https://complex.example.com/path?query=value",
        categories: [{ id: "1", name: "Category 1" }],
      };

      render(<BookMark icon="folder-icon" bookMark={mockBookMark} />);

      expect(screen.getByText("icon")).toBeOnTheScreen();
    });
  });
});
