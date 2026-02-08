/**
 * Shared search utilities: query normalization and FTS escaping.
 * Used by FolderRepository and BookmarkRepository for consistent search behavior.
 */

/**
 * Normalize a search query: trim and collapse internal whitespace.
 * Returns empty string if query is falsy or only whitespace.
 * @param {string} query - Raw search input
 * @returns {string}
 */
export function normalizeSearchQuery(query) {
  if (query == null || typeof query !== 'string') {
    return '';
  }
  const trimmed = query.trim();
  if (trimmed === '') {
    return '';
  }
  return trimmed.replace(/\s+/g, ' ');
}

/**
 * Escape FTS5 special characters and append prefix wildcard for substring matching.
 * Used for FTS MATCH queries. Caller should pass already-normalized query.
 * @param {string} query - Normalized search query
 * @returns {string} - FTS-safe query with trailing *
 */
export function escapeFtsQuery(query) {
  if (!query || typeof query !== 'string') {
    return '';
  }
  return query.trim().replace(/[:"*]/g, ' ') + '*';
}

/**
 * Build SQL LIKE pattern for substring match (e.g. %query%).
 * @param {string} query - Normalized search query
 * @returns {string}
 */
export function likePattern(query) {
  if (!query || typeof query !== 'string') {
    return '%';
  }
  return `%${query.trim()}%`;
}
