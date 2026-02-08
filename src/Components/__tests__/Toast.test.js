import React from "react";
import { render, screen } from "@testing-library/react-native";
import Toast from "../Toast";

describe("Toast", () => {
  it("returns null when not visible", () => {
    const { queryByText } = render(
      <Toast message="Hello" visible={false} onHide={jest.fn()} />
    );
    expect(queryByText("Hello")).toBeNull();
  });

  it("renders message when visible", () => {
    render(<Toast message="Saved" visible={true} onHide={jest.fn()} />);
    expect(screen.getByText("Saved")).toBeOnTheScreen();
  });

  it("renders with custom duration prop", () => {
    render(
      <Toast message="Done" visible={true} onHide={jest.fn()} duration={5000} />
    );
    expect(screen.getByText("Done")).toBeOnTheScreen();
  });
});
