/**
 * Repository for bookmark CRUD operations
 */
import { generateId, now } from "../seed";

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
   * Delete a bookmark
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
       WHERE t.name LIKE ?
       ORDER BY b.createdAt DESC`,
      [`%${tagName}%`]
    );
  }

  /**
   * Combined search (name, URL, or tags) using FTS5
   * @param {string} query
   * @returns {Bookmark[]}
   */
  searchAll(query) {
    if (!query || query.trim() === '') {
      return [];
    }

    const ftsQuery = query.trim().replace(/[:"*]/g, ' ') + '*';
    
    try {
      // Search bookmarks using FTS5
      const bookmarkResults = this.db.getAllSync(
        `SELECT b.* FROM bookmarks b
         INNER JOIN bookmarks_fts fts ON b.id = fts.id
         WHERE bookmarks_fts MATCH ?
         ORDER BY rank, b.createdAt DESC`,
        [ftsQuery]
      );

      // Also search by tags (tags are typically small, LIKE is fine)
      const tagResults = this.db.getAllSync(
        `SELECT DISTINCT b.* FROM bookmarks b
         INNER JOIN bookmark_tags bt ON b.id = bt.bookmarkId
         INNER JOIN tags t ON bt.tagId = t.id
         WHERE t.name LIKE ?
         ORDER BY b.createdAt DESC`,
        [`%${query}%`]
      );

      // Merge and deduplicate results by id
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
      // Fallback to LIKE if FTS query fails
      console.warn('FTS searchAll failed, falling back to LIKE:', error.message);
      return this.db.getAllSync(
        `SELECT DISTINCT b.* FROM bookmarks b
         LEFT JOIN bookmark_tags bt ON b.id = bt.bookmarkId
         LEFT JOIN tags t ON bt.tagId = t.id
         WHERE b.name LIKE ? OR b.url LIKE ? OR t.name LIKE ?
         ORDER BY b.createdAt DESC`,
        [`%${query}%`, `%${query}%`, `%${query}%`]
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
