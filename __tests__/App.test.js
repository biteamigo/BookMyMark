import React from "react";
import { render } from "@testing-library/react-native";
import App from "../App";

// Since App uses navigation which is heavily mocked, we test what we can
describe("App", () => {
  describe("rendering", () => {
    it("renders without crashing", () => {
      expect(() => render(<App />)).not.toThrow();
    });

    it("creates a valid component structure", () => {
      const { UNSAFE_root } = render(<App />);
      
      // Root should exist
      expect(UNSAFE_root).toBeDefined();
    });
  });

  describe("exports", () => {
    it("exports a valid React component", () => {
      expect(App).toBeDefined();
      expect(typeof App).toBe("function");
    });

    it("App is a function component", () => {
      // App should be a function (React functional component)
      expect(App.length).toBe(0); // No required props
    });
  });
});
