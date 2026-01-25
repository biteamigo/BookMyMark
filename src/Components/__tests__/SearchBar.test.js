import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import SearchBar from "../SearchBar";

describe("SearchBar", () => {
  const mockOnSearchTermChange = jest.fn();
  const mockOnSubmit = jest.fn();

  const defaultProps = {
    searchTerm: "",
    onSearchTermChange: mockOnSearchTermChange,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    // Clear mock function calls before each test
    jest.clearAllMocks();
  });

  it("renders the search input with placeholder", () => {
    render(<SearchBar {...defaultProps} />);

    const input = screen.getByPlaceholderText("Search");
    expect(input).toBeOnTheScreen();
  });

  it("displays the provided search term", () => {
    render(<SearchBar {...defaultProps} searchTerm="test query" />);

    const input = screen.getByPlaceholderText("Search");
    expect(input.props.value).toBe("test query");
  });

  it("calls onSearchTermChange when text is entered", () => {
    render(<SearchBar {...defaultProps} />);

    const input = screen.getByPlaceholderText("Search");
    fireEvent.changeText(input, "new search");

    expect(mockOnSearchTermChange).toHaveBeenCalledTimes(1);
    expect(mockOnSearchTermChange).toHaveBeenCalledWith("new search");
  });

  it("calls onSubmit when editing ends", () => {
    render(<SearchBar {...defaultProps} />);

    const input = screen.getByPlaceholderText("Search");
    fireEvent(input, "endEditing");

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
  });

  it("renders the search icon", () => {
    const { UNSAFE_getByType } = render(<SearchBar {...defaultProps} />);

    // The mocked Ionicons component should be present
    const icon = UNSAFE_getByType("Ionicons");
    expect(icon.props.name).toBe("search");
  });
});
