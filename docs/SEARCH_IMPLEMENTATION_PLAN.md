# Search Functionality – Implementation Plan

## 1. Overview and Requirements

### 1.1 Goals
- When the user types in the search box (FolderViewScreen), show **search results** instead of the full folder contents.
- **Scope**: Search only within the folder (or root) the user is currently viewing.
- **Results**: Both **folders** and **bookmarks** that match the query.
- **Tags**: Include bookmark **tags** in the match (tags entered when creating the bookmark).

### 1.2 Out of Scope for This Plan
- Search in FolderPicker remains “global” over all folders (no change to scope).
- No cross-folder or “search everywhere” mode in FolderViewScreen.

### 1.3 Current State (Brief)
- **FolderViewScreen**: Has `searchTerm` state and `SearchBar`; `searchTerm` is **not** used to filter `items`. `loadItems()` always loads all subfolders + bookmarks for the current folder.
- **FolderPickerScreen**: Uses `folderRepository.search(searchTerm)` (global folder search by name) and builds a hierarchy; no bookmarks, no folder scoping.
- **FolderRepository.search(query)**: Returns all folders matching name (no `parentId` filter).
- **BookmarkRepository.search(query)** / **searchAll(query)**: Return all bookmarks matching name/URL or name/URL/tags (no folder filter).

---

## 2. Architecture and Principles

### 2.1 Principles
- **Single source of truth**: One place that decides “what to show” (folders + bookmarks) for the current folder and search term.
- **Scoped search**: Repository APIs accept an optional scope (e.g. `folderId` or `parentId`) so search is explicit and testable.
- **No duplication**: Shared utilities for query normalization and, optionally, debouncing; shared `SearchBar`; repository methods reused where possible.
- **Mobile-first**: Debounce typing to avoid excessive DB work and UI jank; keep search synchronous from user perspective (no loading spinner for local DB); clear empty state.
- **Accessibility**: Keep SearchBar accessible; ensure “no results” and result list are announced (e.g. `accessibilityLabel`, `accessibilityRole`).

### 2.2 Data Flow (FolderViewScreen)
1. User is in a folder (or root): `currentFolderId` (null = root).
2. User types in SearchBar: `searchTerm` updates.
3. **One effect or computed flow** derives:
   - If `searchTerm` is empty → show normal list (current `loadItems()` behavior).
   - If `searchTerm` is non-empty → show **scoped** search results (folders + bookmarks, including tag matches).
4. Same `items` array and same `renderItem` as today (folders first, then bookmarks; same types and shapes).

---

## 3. Repository Layer (Data Access)

### 3.1 FolderRepository

**Add: scoped folder search**

- **Method**: `searchInFolder(query, parentId)` (or overload `search(query, { parentId })`).
- **Semantics** (recursive):
  - `parentId === null`: search among **root folders** only (same as current “root” view).
  - `parentId === '<id>'`: search among **all descendant folders** of that folder (direct and nested subfolders).
- **Implementation**: Reuse existing FTS/LIKE logic; for non-null parentId get all descendant IDs via `getAllDescendantIds(parentId)`, then restrict results to `id IN (descendants)` (excluding the folder itself). No change to FTS table.
- **Returns**: Same `Folder[]` shape as `getSubfolders` / `getRootFolders`.
- **Edge cases**: Empty/whitespace query → return `[]`. Optional: minimum length (e.g. 1 character) before running search.

**FolderPicker**: Keeps using existing `search(query)` (global). No change.

### 3.2 BookmarkRepository

**Add: scoped bookmark search (name, URL, and tags)**

- **Method**: `searchInFolder(query, folderIdOrIds)`.
- **Semantics**: Return bookmarks that:
  - Are in the given folder(s)—single ID or array of IDs (e.g. current folder + all descendants)—via `folder_bookmarks`, and
  - Match the query by **name**, **URL**, or **tag name** (same semantics as current `searchAll`, but scoped to those folders).
- **Implementation**:
  - Caller (e.g. FolderViewScreen) passes `getAllDescendantIds(currentFolderId)` so bookmarks in the current folder and any descendant folder are included. Use `folderId IN (?,?,...)` for one DB round-trip.
- **Returns**: Same `Bookmark[]` shape as `getByFolder`.
- **Edge cases**: Empty/whitespace query → return `[]`. Tags: reuse existing tag-join pattern from `searchAll` so tags are included in the match.

**Existing**: `searchAll(query)` stays global; no change for other callers.

### 3.3 TagRepository
- No new API required. Tag matching is done inside `BookmarkRepository.searchInFolder` via existing tag tables and JOINs.

### 3.4 Shared Query Normalization (Optional but Recommended)
- **Location**: e.g. `src/Utils/searchUtils.js` (or under `database/` if you prefer).
- **Function**: `normalizeSearchQuery(query)` → trim, optionally collapse whitespace, and return empty string when appropriate. If FTS escaping is shared, it can live here too (FolderRepository and BookmarkRepository both use the same FTS-escape + wildcard pattern).
- **Use**: Call from `FolderRepository.search` / `searchInFolder` and `BookmarkRepository.searchAll` / `searchInFolder` so behavior is consistent and duplication is minimal.

### 3.5 Database schema and indexes (no changes required)

The current schema and indexes are sufficient for the scoped search plan. No DB migrations or schema changes are required.

**Why the current DB is enough**

- **Folders**
  - Scoped search adds a single predicate: `WHERE parentId IS ?` (or `IS NULL` for root) to the existing FTS/LIKE query. The `folders` table already has `parentId` and there is an index `idx_folders_parentId`. FTS5 stays as-is (name only); no need to put `parentId` into the FTS table.

- **Bookmarks**
  - Scoped search restricts to bookmarks in a folder via `folder_bookmarks`. Existing indexes `idx_folder_bookmarks_folderId` and `idx_folder_bookmarks_bookmarkId` support JOINs and `WHERE fb.folderId = ?`. Name/URL search continues to use `bookmarks_fts`; tag search uses `tags` + `bookmark_tags` with existing indexes (`idx_tags_name`, `idx_bookmark_tags_*`). No new tables or columns needed.

- **Tags**
  - Tag matching stays LIKE-based on `tags.name` (as in current `searchAll`). Tags are not in `bookmarks_fts`; the plan reuses the existing “FTS for name/URL + separate tag-LIKE query + merge” approach, with an extra filter by `folderId`. That is acceptable for typical mobile dataset sizes.

**Optional future considerations (out of scope for this plan)**

- **Tags in full-text search**: If tag lists grow very large and tag-only search becomes slow, you could later add a dedicated FTS table or include tag text in a bookmark search index. Not required for the current plan.
- **Composite indexes**: Current single-column indexes on `folder_bookmarks(folderId)` and `bookmark_tags(bookmarkId)` are enough for the planned scoped queries. Revisit only if profiling shows a bottleneck.

---

## 4. FolderViewScreen (UI and Behavior)

### 4.1 State and Derivation
- Keep: `searchTerm`, `items`, `currentFolderId`, and all existing state.
- **Single place that sets `items`**:
  - When `searchTerm` is empty: use current `loadItems()` (get subfolders + bookmarks for current folder, no search).
  - When `searchTerm` is non-empty: call new repository methods and combine:
    - Folders: `folderRepository.searchInFolder(searchTerm, currentFolderId)` (recursive: all descendants).
    - Bookmarks: only if not root: `bookmarkRepository.searchInFolder(searchTerm, folderRepository.getAllDescendantIds(currentFolderId))`; at root, bookmarks = `[]`.
  - Combine and sort the same way as today: folders first, then bookmarks; add `type: 'folder'` / `type: 'bookmark'`.
- **Dependencies**: Recompute when `currentFolderId` or `searchTerm` (and optionally `editingFolderId` for non-search path) change.

### 4.2 When to Run Search
- **Debounce**: Debounce `searchTerm` before running search (e.g. 200–300 ms) to avoid excessive DB calls and re-renders while typing. Use a single `useEffect` that depends on debounced value and `currentFolderId`.
- **Empty query**: When debounced search term is empty, show normal list (current `loadItems()`). No need to call search APIs.

### 4.3 UX Details
- **Placeholder**: Keep “Search” or refine to “Search in this folder” (optional).
- **Clear**: If SearchBar supports clear, clearing should set `searchTerm` to `''` and show full list again.
- **No results**: When `searchTerm` is non-empty and `items.length === 0`, show a single “No results” (or “No folders or bookmarks match”) message instead of an empty list. Use existing list empty-state pattern if any.
- **Keyboard**: Dismiss keyboard on scroll (optional; many RN apps do this). No mandatory change.

### 4.4 Accessibility
- Ensure the list or “no results” message has an `accessibilityLabel` that reflects whether we’re showing “search results” or “all items” and count (e.g. “3 results” / “No results”).

---

## 5. Sharing with FolderPickerScreen

### 5.1 What Stays Separate
- **FolderPickerScreen**: Continues to use `folderRepository.search(searchTerm)` (global folder search) and its own hierarchy building. It does not show bookmarks or tags; scope is “all folders.” No change to scope or to bookmark/tag logic.
- **FolderViewScreen**: Uses the new scoped APIs (`searchInFolder` for folders and bookmarks). Different use case, different APIs.

### 5.2 What to Share
- **SearchBar component**: Already shared; no change except optional placeholder text.
- **Query normalization**: Shared `normalizeSearchQuery` (and FTS escaping if extracted) used by:
  - `FolderRepository.search` and `FolderRepository.searchInFolder`
  - `BookmarkRepository.searchAll` and `BookmarkRepository.searchInFolder`
- **Debounce**: Optional shared hook, e.g. `useDebouncedValue(value, delay)`, used by FolderViewScreen (and optionally FolderPickerScreen) so both screens debounce the search input the same way. This avoids duplicating debounce logic.

### 5.3 What Not to Share
- Search **result building** (combining folders + bookmarks, hierarchy, etc.) is different:
  - FolderViewScreen: flat list of folders + bookmarks in current folder.
  - FolderPickerScreen: hierarchical folder list with parent chain.  
  So no shared “search result builder” beyond the repositories.

---

## 6. Implementation Order (Recommended)

1. **Utils**
   - Add `normalizeSearchQuery` (and optional FTS-escape helper) in `src/Utils/searchUtils.js`.
   - Optionally add `useDebouncedValue` in `src/Utils/useDebouncedValue.js` (or under a hooks folder).

2. **Repositories**
   - **FolderRepository**: Implement `searchInFolder(query, parentId)`; refactor existing `search` to use `normalizeSearchQuery` if desired.
   - **BookmarkRepository**: Implement `searchInFolder(query, folderId)` (name + URL + tags, scoped by folder); refactor `searchAll` to use shared normalization if desired.

3. **FolderViewScreen**
   - Introduce debounced search term (e.g. `debouncedSearchTerm = useDebouncedValue(searchTerm, 250)`).
   - In the effect that sets `items`: if `debouncedSearchTerm` is empty, call existing `loadItems()`; else call `searchInFolder` for folders and bookmarks and set `items` to the combined result.
   - Add empty-state UI when search is active and `items.length === 0`.
   - Optional: adjust placeholder and accessibility labels.

4. **Tests**
   - **FolderRepository**: Unit tests for `searchInFolder` (root and subfolder, empty query, no matches).
   - **BookmarkRepository**: Unit tests for `searchInFolder` (match by name, URL, tag; scoped to folder; empty query).
   - **FolderViewScreen**: Integration tests that type in search, assert results (and “no results”) and scope (e.g. only current folder’s subfolders and bookmarks). Mock repositories or use test DB.

5. **Cleanup**
   - Remove or replace `console.log("Search:", searchTerm)` in FolderViewScreen’s SearchBar `onSubmit` with no-op or a real “submit search” if you add that behavior later.

---

## 7. File and API Summary

| Area | File / API | Change |
|------|------------|--------|
| Utils | `src/Utils/searchUtils.js` | New: `normalizeSearchQuery` (and optional FTS escape). |
| Hooks | `src/Utils/useDebouncedValue.js` (or `src/hooks/`) | New: `useDebouncedValue(value, delay)`. |
| FolderRepository | `searchInFolder(query, parentId)` | New. Use in FolderViewScreen for scoped folder search. |
| BookmarkRepository | `searchInFolder(query, folderId)` | New. Use in FolderViewScreen for scoped bookmark+tag search. |
| FolderViewScreen | `FolderViewScreen.js` | Use debounced search term; when non-empty, set `items` from search APIs; add empty state. |
| FolderPickerScreen | No change to scope | Continue using `folderRepository.search(searchTerm)`; can adopt shared debounce and normalization. |
| SearchBar | No API change | Optional: placeholder or `onSubmit` behavior. |

---

## 8. Edge Cases and Behaviors

- **Root folder**: At root, “search” = search root folders only; bookmarks at root = `[]` (consistent with current product rule).
- **Empty / whitespace query**: Treated as “no search”; show full list.
- **Very long query**: Rely on DB and normalization; optional max length in UI.
- **Special characters**: FTS and LIKE handling already exist; reuse in scoped methods and normalization.
- **Tags**: Only bookmarks that are **in the current folder** and match by name, URL, or tag are returned; no cross-folder tag search in this scope.

---

## 9. Success Criteria

- User can type in the search box on FolderViewScreen and see only matching folders and bookmarks **in the current folder** (or root).
- Matching includes bookmark **tags**.
- No duplicate logic for query normalization (and optionally debounce) between FolderViewScreen and FolderPickerScreen.
- FolderPickerScreen behavior unchanged; FolderViewScreen uses new scoped APIs only for its own search.
- Tests cover repository scoping and FolderViewScreen search behavior.
- Build and existing tests (and coverage thresholds) remain passing.

---

*Document version: 1.0. No code changes have been made; this is an implementation plan only.*
