/**
 * Layout utilities for responsive grid and consistent spacing.
 * Used by FolderViewScreen and tests.
 */

export const GRID_COLUMN_WIDTH = 90;
export const GRID_GAP = 24;

/** Horizontal margin from screen edge in grid view (smaller than PAGE_MARGIN for more columns). */
export const GRID_SIDE_MARGIN = 6;

/** Horizontal padding inside the grid list (inset of the row from list edges). */
export const GRID_LIST_PADDING = 22;

/** Minimum content width (after horizontal margins) needed to show 3 grid columns without clipping. */
const MIN_CONTENT_WIDTH_FOR_3_COLUMNS = 3 * (GRID_COLUMN_WIDTH + GRID_GAP);

/**
 * Returns the number of grid columns that fit in the given content width.
 * Uses 2 columns on narrow screens to avoid clipping; 3 columns otherwise.
 * @param {number} contentWidth - Available width (e.g. screen width minus 2 * PAGE_MARGIN).
 * @returns {2 | 3}
 */
export function getGridNumColumns(contentWidth) {
  if (contentWidth >= MIN_CONTENT_WIDTH_FOR_3_COLUMNS) {
    return 3;
  }
  return 2;
}

/** Search bar height (px) for list top padding. */
export const SEARCH_BAR_HEIGHT = 50;

/** Space reserved at bottom for the action bar (pill + offset from screen edge). */
export const BOTTOM_BAR_OFFSET = 100;
