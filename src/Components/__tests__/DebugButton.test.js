import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import DebugButton from "../DebugButton";

describe("DebugButton", () => {
  const originalDev = global.__DEV__;

  afterEach(() => {
    global.__DEV__ = originalDev;
  });

  it("renders button when __DEV__ is true", () => {
    global.__DEV__ = true;
    const onPress = jest.fn();
    render(<DebugButton onPress={onPress} />);
    const button = screen.getByTestId("debug-button");
    expect(button).toBeOnTheScreen();
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("returns null when __DEV__ is false", () => {
    global.__DEV__ = false;
    const onPress = jest.fn();
    const { queryByTestId } = render(<DebugButton onPress={onPress} />);
    expect(queryByTestId("debug-button")).toBeNull();
  });
});
