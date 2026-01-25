import { PAGE_MARGIN } from "../Constants";

describe("Constants", () => {
  describe("PAGE_MARGIN", () => {
    it("is defined", () => {
      expect(PAGE_MARGIN).toBeDefined();
    });

    it("is a number", () => {
      expect(typeof PAGE_MARGIN).toBe("number");
    });

    it("equals 30", () => {
      expect(PAGE_MARGIN).toBe(30);
    });

    it("is positive", () => {
      expect(PAGE_MARGIN).toBeGreaterThan(0);
    });
  });
});
