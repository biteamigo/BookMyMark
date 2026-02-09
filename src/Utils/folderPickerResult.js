/**
 * Pass folder picker selection back to NewBookmarkScreen without relying on navigation params.
 * navigate(..., { merge: true }) does not update route.params on the existing screen with native stack modal.
 */
let pendingFolderIds = null;

export function setPendingFolderPickerResult(ids) {
  pendingFolderIds = ids == null ? null : Array.isArray(ids) ? [...ids] : [ids];
}

export function getAndClearPendingFolderPickerResult() {
  const result = pendingFolderIds;
  pendingFolderIds = null;
  return result;
}
