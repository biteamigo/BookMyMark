/**
 * Pass folder picker selection back to NewBookmarkScreen without relying on navigation params.
 * navigate(..., { merge: true }) does not update route.params on the existing screen with native stack modal.
 */
const LOG_TAG = '[FolderPickerBridge]';
let pendingFolderIds = null;

export function setPendingFolderPickerResult(ids) {
  pendingFolderIds = ids == null ? null : Array.isArray(ids) ? [...ids] : [ids];
  console.log(LOG_TAG, 'setPendingFolderPickerResult', 'count:', pendingFolderIds?.length ?? 0, 'ids:', pendingFolderIds);
}

export function getAndClearPendingFolderPickerResult() {
  const result = pendingFolderIds;
  pendingFolderIds = null;
  console.log(LOG_TAG, 'getAndClearPendingFolderPickerResult', 'returned:', result?.length ?? (result === null ? 'null' : 'non-array'), 'ids:', result);
  return result;
}
