# E2E Test Sheet – BookMyMark (Maestro)

All flows are **self-contained**: they assume only **seed data** (YouTube, Music, Recipes at root). You can run any flow in isolation.

| # | One-line description | Maestro flow / file | Detailed information | Notes |
|---|----------------------|---------------------|----------------------|--------|
| 1 | Root screen loads with main actions | `01-root-screen.yaml` | Asserts root FolderView shows Search, Select, New Folder, New Bookmark. Takes screenshot. | |
| 2 | All dropdown menu options visible | `02-dropdown-menu-options.yaml` | Open header ellipsis menu; assert Select, New Folder, New Bookmark, Grid, List are visible. | Uses `testID="header-menu"`. |
| 3 | Create folder at root | `03-create-folder-root.yaml` | Tap New Folder on root; assert new folder appears and seed folders (e.g. YouTube, Music) still visible. | Folder name is auto-generated (e.g. "New Folder"). |
| 4 | Create folder in a subfolder | `04-create-folder-subfolder.yaml` | Navigate into YouTube; tap New Folder; assert new folder appears in that subfolder. | |
| 5 | Navigation 2 levels deep, headers and back | `05-navigation-headers-back.yaml` | Root → YouTube → new child folder. Assert header shows folder name at each level. Back twice; assert root (Search, Music visible). | Verifies back stack and header titles. |
| 6 | Bookmark in subfolder with default folder only | `06-bookmark-subfolder-default-only.yaml` | From YouTube, New Bookmark; leave current folder selected; fill Name/URL; Save. Assert bookmark visible in YouTube. | "Default" = current folder pre-selected. |
| 7 | Bookmark in two subfolders via picker | `07-bookmark-two-subfolders.yaml` | From YouTube, New Bookmark; in picker also select Music; create bookmark. Verify it appears in both YouTube and Music. | |
| 8 | Bookmark from root with one folder | `08-bookmark-from-root-one-folder.yaml` | From root, New Bookmark; assert "Tap to select folders..." (no default); pick YouTube; create; navigate to YouTube and assert bookmark. | Confirms no pre-selected folder at root. |
| 9 | Bookmark from root with two folders | `09-bookmark-from-root-two-folders.yaml` | From root, New Bookmark; pick YouTube and Music; create; navigate to both and assert bookmark in each. | |
| 10 | Grid and list views (root and subfolder) | `10-grid-list-views.yaml` | At root switch to List then Grid via menu; go into subfolder; switch Grid then List via menu; assert content visible. | |
| 11 | Enter selection mode from bar and menu (root/subfolder, grid/list) | `11-selection-mode-entry.yaml` | Enter selection via bottom "Select" and via dropdown "Select" at root (grid/list) and in subfolder (grid/list). Assert "Selected (0)" and Edit/Delete. | |
| 12 | Select single folder/bookmark (root grid/list, subfolder grid/list) | `12-select-single-items.yaml` | Select one folder at root (grid, then list); one folder in subfolder (grid, list); one bookmark in subfolder (list, grid). Assert "Selected (1)". | Creates folder + bookmark in YouTube. |
| 13 | Multi-select and action bar count | `13-multi-select-count.yaml` | Root: select multiple folders (seed); assert "Selected (3)". Subfolder: create folder + bookmark, select both; assert "Selected (2)". | |
| 14 | Bookmark validation and optional/multiple tags | `14-bookmark-validation.yaml` | Assert cannot save without name (error message); without URL; without folder. Create without tag; create with multiple tags and verify in folder. | Uses back between validation cases. |
| 15 | Back from New Bookmark with no input – no alert | `15-back-no-alert.yaml` | From root open New Bookmark, back without typing → no Discard alert. From subfolder same; confirm return to same subfolder. | |
| 16 | Back from New Bookmark with Name/URL typed – discard alert | `16-back-discard-alert.yaml` | Type in Name or URL then back; assert "Discard Changes?", "Keep Editing", "Discard". Tap Discard; from root and subfolder; confirm subfolder return. | |
| 17 | Edit/Delete visibility and disabled state in selection | `17-selection-edit-delete-state.yaml` | In selection mode assert Edit and Delete in bar and menu. With 0 selected they are visible (disabled/greyed). With 1 folder or 1 bookmark: enabled. With 2 bookmarks or 2 folders: Edit disabled, Delete enabled. | Creates bookmarks in YouTube for 1/2 bookmark cases. |
| 18 | Exit selection mode via bar and menu | `18-exit-selection-mode.yaml` | Enter selection, select one item; exit via "Selected (1)" on bar; re-enter and exit via "Selected (1)" in dropdown. Assert back to "Select" and New Folder/New Bookmark. | |
| 19 | Delete one/two folders, one/two bookmarks, mixed | `19-delete-items.yaml` | Delete 1 folder at root; 2 folders at root; 1 bookmark in subfolder; 2 bookmarks in subfolder; 1 folder + 1 bookmark in subfolder. Confirms "Confirm Delete" and "Delete"; toast "deleted". | Creates temporary items then deletes. |
| 20 | Rename folder via Edit and save | `20-edit-folder-rename.yaml` | Select a folder, Edit; change name in inline input; exit selection; assert new name visible. | Uses `testID="folder-name-edit-input"`. |
| 21 | Edit bookmark name, URL, add/delete tags | `21-edit-bookmark.yaml` | Create bookmark; select, Edit; change name, Save; Edit again, change URL; add tag; Edit, remove tag. | |
| 22 | Move bookmark to other folder; add to another folder | `22-move-and-add-bookmark-folders.yaml` | Move: edit bookmark, pick only target folder (deselect source), Save; verify not in old folder, in new. Add: edit bookmark, add second folder in picker; verify in both. | Uses seed Music, Recipes. |
| 23 | Create folder from picker (root and inside folder) | `23-create-folder-from-picker.yaml` | In New Bookmark open Folder Picker; create folder at root, select it; create bookmark; verify folder at root and bookmark inside. Then create subfolder inside YouTube from picker; create bookmark in it; navigate and verify. | |
| 24 | Search folder/bookmark/tag from root and from parent | `24-search.yaml` | From root: search folder by name; bookmark by name; bookmark by tag. From parent (YouTube): search subfolder by name; bookmark by name; bookmark by tag. Assert results visible. | Creates subfolder, bookmarks, and tag in flow. |
| 25 | Search from folder for non-descendant – no results | `25-search-non-parent.yaml` | From YouTube search for "Recipes" (sibling); for bookmark name only in Music; for tag only in Music. Assert "No folders or bookmarks match". | Creates bookmark in Music first. |
| 26 | Duplicate URL alert (create and edit) | `26-duplicate-url.yaml` | Create one bookmark with URL; try to create another with same URL → assert "Duplicate URL" alert; Cancel. Edit a different bookmark to same URL → assert "Duplicate URL" alert; Cancel. | |
| 27 | Delete folder – cascade warning in dialog | `27-delete-cascade-copy.yaml` | Create folder with content (bookmark inside); select folder at root, Delete; assert "Confirm Delete" and "This will also delete any content in the selected folder(s)."; Cancel. | |
| 28 | Delete bookmark from one folder only (stays in others) | `28-delete-bookmark-one-folder-only.yaml` | Create bookmark in YouTube and Music; from YouTube select and delete it; assert toast "deleted" and bookmark gone from YouTube; open Music and assert bookmark still visible. | |

---

## Flow order and dependencies

Every flow is **isolated**: it only assumes **seed data** (YouTube, Music, Recipes). Run any single flow or any subset in any order.

---

## Extra tests not implemented (reported only)

These are **not** in the E2E Test Sheet above.

- **Folder picker "Discard New Folder?"** – In the Folder Picker screen you can tap "Create New Folder" and start creating a folder (name, parent). If you press the device **back** button or the header back **before** saving, the app shows an alert **"Discard New Folder?"** with "Keep Editing" and "Discard" so you don’t lose the form by accident. An E2E would: open Folder Picker → Create New Folder → type a name (or just open the form) → trigger back → assert that alert appears.
- **Accessibility (labels / screen reader)** – Screen readers (e.g. TalkBack on Android, VoiceOver on iOS) use **accessibility labels** to announce what each element is (e.g. "New Folder button"). Testing this means either giving elements proper `accessibilityLabel` (and related props) and/or running the app with a screen reader and checking that key actions are announced and navigable. That’s **accessibility testing** (often with dedicated tools or Maestro plus accessibility APIs).
- **Error / offline (DB or network error toasts)** – If something goes wrong (e.g. SQLite fails, or the app had network calls that fail), the app may show a **toast or alert** like "Failed to save" or "Error loading." Testing that means **simulating failure** (e.g. mocking the DB to throw, or disconnecting network) and then asserting the error message appears. That’s **error-path / offline** testing.
