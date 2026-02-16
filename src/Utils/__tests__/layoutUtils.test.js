import { getGridNumColumns, GRID_COLUMN_WIDTH, GRID_GAP, GRID_SIDE_MARGIN, GRID_LIST_PADDING } from "../layoutUtils";

describe("layoutUtils", () => {
  describe("getGridNumColumns", () => {
    it("returns 2 when content width is below 3-column minimum", () => {
      expect(getGridNumColumns(300)).toBe(2);
      expect(getGridNumColumns(341)).toBe(2);
    });

    it("returns 3 when content width is at or above 3-column minimum", () => {
      // 3 * (90 + 24) = 342
      expect(getGridNumColumns(342)).toBe(3);
      expect(getGridNumColumns(358)).toBe(3);
      expect(getGridNumColumns(500)).toBe(3);
    });

    it("uses consistent threshold (342) so 3 columns fit on typical phones with GRID_SIDE_MARGIN", () => {
      const contentWidth390 = 390 - 2 * GRID_SIDE_MARGIN; // 358
      expect(getGridNumColumns(contentWidth390)).toBe(3);
    });
  });

  describe("constants", () => {
    it("exports GRID_COLUMN_WIDTH, GRID_GAP, GRID_SIDE_MARGIN, and GRID_LIST_PADDING", () => {
      expect(GRID_COLUMN_WIDTH).toBe(90);
      expect(GRID_GAP).toBe(24);
      expect(GRID_SIDE_MARGIN).toBe(6);
      expect(GRID_LIST_PADDING).toBe(22);
    });
  });
});
