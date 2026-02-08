/**
 * Repository for bookmark CRUD operations
 */
import { generateId, now } from "../seed";
import { normalizeSearchQuery, escapeFtsQuery, likePattern } from "../../Utils/searchUtils";

/**
 * @typedef {Object} Bookmark
 * @property {string} id - Unique identifier
 * @property {string} name - Bookmark name/title
 * @property {string} url - Bookmark URL
 * @property {string|null} favicon - Favicon URL or base64
 * @property {number} createdAt - Creation timestamp
 * @property {number} updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} BookmarkWithFolders
 * @property {string} id
 * @property {string} name
 * @property {string} url
 * @property {string|null} favicon
 * @property {number} createdAt
 * @property {number} updatedAt
 * @property {string[]} folderIds - Array of folder IDs this bookmark belongs to
 * @property {string[]} tagNames - Array of tag names
 */

export class BookmarkRepository {
  /**
   * @param {import('expo-sqlite').SQLiteDatabase} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Get all bookmarks
   * @returns {Bookmark[]}
   */
  getAll() {
    return this.db.getAllSync(
      "SELECT * FROM bookmarks ORDER BY createdAt DESC"
    );
  }

  /**
   * Get a bookmark by ID
   * @param {string} id
   * @returns {Bookmark|null}
   */
  getById(id) {
    return this.db.getFirstSync(
      "SELECT * FROM bookmarks WHERE id = ?",
      [id]
    );
  }

  /**
   * Get bookmarks in a specific folder
   * @param {string} folderId
   * @returns {Bookmark[]}
   */
  getByFolder(folderId) {
    return this.db.getAllSync(
      `SELECT b.* FROM bookmarks b
       INNER JOIN folder_bookmarks fb ON b.id = fb.bookmarkId
       WHERE fb.folderId = ?
       ORDER BY fb.addedAt DESC`,
      [folderId]
    );
  }

  /**
   * Get bookmarks with a specific tag
   * @param {string} tagId
   * @returns {Bookmark[]}
   */
  getByTag(tagId) {
    return this.db.getAllSync(
      `SELECT b.* FROM bookmarks b
       INNER JOIN bookmark_tags bt ON b.id = bt.bookmarkId
       WHERE bt.tagId = ?
       ORDER BY b.createdAt DESC`,
      [tagId]
    );
  }

  /**
   * Create a new bookmark
   * @param {Partial<Bookmark>} bookmark
   * @param {string[]} folderIds - Folders to add this bookmark to
   * @returns {Bookmark}
   */
  create(bookmark, folderIds = []) {
    const timestamp = now();
    const newBookmark = {
      id: bookmark.id || generateId(),
      name: bookmark.name,
      url: bookmark.url,
      favicon: bookmark.favicon || null,
      createdAt: bookmark.createdAt || timestamp,
      updatedAt: bookmark.updatedAt || timestamp,
    };

    this.db.runSync(
      `INSERT INTO bookmarks (id, name, url, favicon, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newBookmark.id, newBookmark.name, newBookmark.url, newBookmark.favicon, newBookmark.createdAt, newBookmark.updatedAt]
    );

    // Add to folders
    folderIds.forEach((folderId) => {
      this.addToFolder(newBookmark.id, folderId);
    });

    return newBookmark;
  }

  /**
   * Update a bookmark
   * @param {string} id
   * @param {Partial<Bookmark>} updates
   * @returns {Bookmark|null}
   */
  update(id, updates) {
    const existing = this.getById(id);
    if (!existing) return null;

    const updatedBookmark = {
      ...existing,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: now(),
    };

    this.db.runSync(
      `UPDATE bookmarks SET name = ?, url = ?, favicon = ?, updatedAt = ? WHERE id = ?`,
      [updatedBookmark.name, updatedBookmark.url, updatedBookmark.favicon, updatedBookmark.updatedAt, id]
    );

    return updatedBookmark;
  }

  /**
   * Delete a bookmark (permanently)
   * @param {string} id
   * @returns {boolean}
   */
  delete(id) {
    const result = this.db.runSync(
      "DELETE FROM bookmarks WHERE id = ?",
      [id]
    );
    return result.changes > 0;
  }

  /**
   * Remove bookmark from a specific folder (context-aware delete)
   * If bookmark exists in other folders, only remove from this folder
   * If bookmark only exists in this folder, delete permanently
   * @param {string} bookmarkId
   * @param {string} folderId
   * @returns {{removedFromFolder: boolean, deletedPermanently: boolean}}
   */
  deleteFromFolder(bookmarkId, folderId) {
    // Check how many folders this bookmark belongs to
    const folders = this.getFolders(bookmarkId);
    
    // Remove from this folder
    this.removeFromFolder(bookmarkId, folderId);
    
    // If it was the last folder, delete the bookmark permanently
    if (folders.length === 1 && folders[0] === folderId) {
      this.delete(bookmarkId);
      return { removedFromFolder: true, deletedPermanently: true };
    }
    
    return { removedFromFolder: true, deletedPermanently: false };
  }

  /**
   * Add bookmark to a folder
   * @param {string} bookmarkId
   * @param {string} folderId
   */
  addToFolder(bookmarkId, folderId) {
    const timestamp = now();
    try {
      this.db.runSync(
        `INSERT OR IGNORE INTO folder_bookmarks (folderId, bookmarkId, addedAt) 
         VALUES (?, ?, ?)`,
        [folderId, bookmarkId, timestamp]
      );
    } catch (e) {
      // Ignore duplicate key errors
    }
  }

  /**
   * Remove bookmark from a folder
   * @param {string} bookmarkId
   * @param {string} folderId
   */
  removeFromFolder(bookmarkId, folderId) {
    this.db.runSync(
      "DELETE FROM folder_bookmarks WHERE bookmarkId = ? AND folderId = ?",
      [bookmarkId, folderId]
    );
  }

  /**
   * Get all folders a bookmark belongs to
   * @param {string} bookmarkId
   * @returns {string[]} Array of folder IDs
   */
  getFolders(bookmarkId) {
    const results = this.db.getAllSync(
      "SELECT folderId FROM folder_bookmarks WHERE bookmarkId = ?",
      [bookmarkId]
    );
    return results.map((r) => r.folderId);
  }

  /**
   * Search bookmarks by name or URL using FTS5
   * @param {string} query
   * @returns {Bookmark[]}
   */
  search(query) {
    if (!query || query.trim() === '') {
      return [];
    }

    // Escape FTS5 special characters and add prefix wildcard for substring matching
    const ftsQuery = query.trim().replace(/[:"*]/g, ' ') + '*';
    
    try {
      return this.db.getAllSync(
        `SELECT b.* FROM bookmarks b
         INNER JOIN bookmarks_fts fts ON b.id = fts.id
         WHERE bookmarks_fts MATCH ?
         ORDER BY rank, b.createdAt DESC`,
        [ftsQuery]
      );
    } catch (error) {
      // Fallback to LIKE if FTS query fails (e.g., invalid syntax)
      console.warn('FTS search failed, falling back to LIKE:', error.message);
      return this.db.getAllSync(
        `SELECT * FROM bookmarks 
         WHERE name LIKE ? OR url LIKE ? 
         ORDER BY createdAt DESC`,
        [`%${query}%`, `%${query}%`]
      );
    }
  }

  /**
   * Search bookmarks by tag name
   * @param {string} tagName
   * @returns {Bookmark[]}
   */
  searchByTag(tagName) {
    if (!tagName || tagName.trim() === '') {
      return [];
    }

    return this.db.getAllSync(
      `SELECT DISTINCT b.* FROM bookmarks b
       INNER JOIN bookmark_tags bt ON b.id = bt.bookmarkId
       INNER JOIN tags t ON bt.tagId = t.id
       WHERE t.name LIKE ? COLLATE NOCASE
       ORDER BY b.createdAt DESC`,
      [`%${tagName.trim()}%`]
    );
  }

  /**
   * Combined search (name, URL, or tags) using FTS5
   * @param {string} query
   * @returns {Bookmark[]}
   */
  searchAll(query) {
    const normalized = normalizeSearchQuery(query);
    if (normalized === '') {
      return [];
    }
    const ftsQuery = escapeFtsQuery(normalized);
    const like = likePattern(normalized);
    try {
      const bookmarkResults = this.db.getAllSync(
        `SELECT b.* FROM bookmarks b
         INNER JOIN bookmarks_fts fts ON b.id = fts.id
         WHERE bookmarks_fts MATCH ?
         ORDER BY rank, b.createdAt DESC`,
        [ftsQuery]
      );
      const tagResults = this.db.getAllSync(
        `SELECT DISTINCT b.* FROM bookmarks b
         INNER JOIN bookmark_tags bt ON b.id = bt.bookmarkId
         INNER JOIN tags t ON bt.tagId = t.id
         WHERE t.name LIKE ? COLLATE NOCASE
         ORDER BY b.createdAt DESC`,
        [like]
      );
      const seen = new Set();
      const combined = [];
      for (const bookmark of [...bookmarkResults, ...tagResults]) {
        if (!seen.has(bookmark.id)) {
          seen.add(bookmark.id);
          combined.push(bookmark);
        }
      }
      return combined;
    } catch (error) {
      console.warn('FTS searchAll failed, falling back to LIKE:', error.message);
      return this.db.getAllSync(
        `SELECT DISTINCT b.* FROM bookmarks b
         LEFT JOIN bookmark_tags bt ON b.id = bt.bookmarkId
         LEFT JOIN tags t ON bt.tagId = t.id
         WHERE b.name LIKE ? OR b.url LIKE ? OR t.name LIKE ? COLLATE NOCASE
         ORDER BY b.createdAt DESC`,
        [like, like, like]
      );
    }
  }

  /**
   * Search bookmarks by name, URL, or tag within one or more folders (e.g. current folder + all descendants).
   * @param {string} query - Search query
   * @param {string|string[]} folderIdOrIds - Single folder ID or array of folder IDs to search in
   * @returns {Bookmark[]}
   */
  searchInFolder(query, folderIdOrIds) {
    const normalized = normalizeSearchQuery(query);
    if (normalized === '') {
      return [];
    }
    const folderIds = Array.isArray(folderIdOrIds) ? folderIdOrIds : [folderIdOrIds];
    if (folderIds.length === 0) {
      return [];
    }
    const ftsQuery = escapeFtsQuery(normalized);
    const like = likePattern(normalized);
    const inPlaceholders = folderIds.map(() => '?').join(',');
    try {
      const bookmarkResults = this.db.getAllSync(
        `SELECT b.* FROM bookmarks b
         INNER JOIN folder_bookmarks fb ON b.id = fb.bookmarkId AND fb.folderId IN (${inPlaceholders})
         INNER JOIN bookmarks_fts fts ON b.id = fts.id
         WHERE bookmarks_fts MATCH ?
         ORDER BY rank, b.createdAt DESC`,
        [...folderIds, ftsQuery]
      );
      const tagResults = this.db.getAllSync(
        `SELECT DISTINCT b.* FROM bookmarks b
         INNER JOIN folder_bookmarks fb ON b.id = fb.bookmarkId AND fb.folderId IN (${inPlaceholders})
         INNER JOIN bookmark_tags bt ON b.id = bt.bookmarkId
         INNER JOIN tags t ON bt.tagId = t.id
         WHERE t.name LIKE ? COLLATE NOCASE
         ORDER BY b.createdAt DESC`,
        [...folderIds, like]
      );
      const seen = new Set();
      const combined = [];
      for (const bookmark of [...bookmarkResults, ...tagResults]) {
        if (!seen.has(bookmark.id)) {
          seen.add(bookmark.id);
          combined.push(bookmark);
        }
      }
      return combined;
    } catch (error) {
      console.warn('FTS searchInFolder failed, falling back to LIKE:', error.message);
      return this.db.getAllSync(
        `SELECT DISTINCT b.* FROM bookmarks b
         INNER JOIN folder_bookmarks fb ON b.id = fb.bookmarkId AND fb.folderId IN (${inPlaceholders})
         LEFT JOIN bookmark_tags bt ON b.id = bt.bookmarkId
         LEFT JOIN tags t ON bt.tagId = t.id
         WHERE b.name LIKE ? OR b.url LIKE ? OR t.name LIKE ? COLLATE NOCASE
         ORDER BY b.createdAt DESC`,
        [...folderIds, like, like, like]
      );
    }
  }

  /**
   * Get bookmark count
   * @returns {number}
   */
  count() {
    const result = this.db.getFirstSync("SELECT COUNT(*) as count FROM bookmarks");
    return result.count;
  }

  /**
   * Check if URL already exists
   * @param {string} url
   * @returns {boolean}
   */
  urlExists(url) {
    const result = this.db.getFirstSync(
      "SELECT COUNT(*) as count FROM bookmarks WHERE url = ?",
      [url]
    );
    return result.count > 0;
  }
}

export default BookmarkRepository;
