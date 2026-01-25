/**
 * Repository for tag CRUD operations
 */
import { generateId, now } from "../seed";

/**
 * @typedef {Object} Tag
 * @property {string} id - Unique identifier
 * @property {string} name - Tag name (unique)
 * @property {number} createdAt - Creation timestamp
 */

export class TagRepository {
  /**
   * @param {import('expo-sqlite').SQLiteDatabase} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Get all tags
   * @returns {Tag[]}
   */
  getAll() {
    return this.db.getAllSync(
      "SELECT * FROM tags ORDER BY name ASC"
    );
  }

  /**
   * Get a tag by ID
   * @param {string} id
   * @returns {Tag|null}
   */
  getById(id) {
    return this.db.getFirstSync(
      "SELECT * FROM tags WHERE id = ?",
      [id]
    );
  }

  /**
   * Get a tag by name
   * @param {string} name
   * @returns {Tag|null}
   */
  getByName(name) {
    return this.db.getFirstSync(
      "SELECT * FROM tags WHERE name = ? COLLATE NOCASE",
      [name]
    );
  }

  /**
   * Create a new tag (or return existing if name exists)
   * @param {string} name
   * @returns {Tag}
   */
  create(name) {
    // Check if tag already exists
    const existing = this.getByName(name);
    if (existing) {
      return existing;
    }

    const newTag = {
      id: generateId(),
      name: name.trim().toLowerCase(),
      createdAt: now(),
    };

    this.db.runSync(
      `INSERT INTO tags (id, name, createdAt) VALUES (?, ?, ?)`,
      [newTag.id, newTag.name, newTag.createdAt]
    );

    return newTag;
  }

  /**
   * Delete a tag
   * @param {string} id
   * @returns {boolean}
   */
  delete(id) {
    const result = this.db.runSync(
      "DELETE FROM tags WHERE id = ?",
      [id]
    );
    return result.changes > 0;
  }

  /**
   * Add tag to a bookmark
   * @param {string} bookmarkId
   * @param {string} tagId
   */
  addToBookmark(bookmarkId, tagId) {
    try {
      this.db.runSync(
        `INSERT OR IGNORE INTO bookmark_tags (bookmarkId, tagId) VALUES (?, ?)`,
        [bookmarkId, tagId]
      );
    } catch (e) {
      // Ignore duplicate key errors
    }
  }

  /**
   * Remove tag from a bookmark
   * @param {string} bookmarkId
   * @param {string} tagId
   */
  removeFromBookmark(bookmarkId, tagId) {
    this.db.runSync(
      "DELETE FROM bookmark_tags WHERE bookmarkId = ? AND tagId = ?",
      [bookmarkId, tagId]
    );
  }

  /**
   * Get all tags for a bookmark
   * @param {string} bookmarkId
   * @returns {Tag[]}
   */
  getTagsForBookmark(bookmarkId) {
    return this.db.getAllSync(
      `SELECT t.* FROM tags t
       INNER JOIN bookmark_tags bt ON t.id = bt.tagId
       WHERE bt.bookmarkId = ?
       ORDER BY t.name ASC`,
      [bookmarkId]
    );
  }

  /**
   * Set tags for a bookmark (replaces existing tags)
   * @param {string} bookmarkId
   * @param {string[]} tagNames - Array of tag names
   */
  setTagsForBookmark(bookmarkId, tagNames) {
    // Remove existing tags
    this.db.runSync(
      "DELETE FROM bookmark_tags WHERE bookmarkId = ?",
      [bookmarkId]
    );

    // Add new tags
    tagNames.forEach((name) => {
      const tag = this.create(name);
      this.addToBookmark(bookmarkId, tag.id);
    });
  }

  /**
   * Search tags by name
   * @param {string} query
   * @returns {Tag[]}
   */
  search(query) {
    return this.db.getAllSync(
      "SELECT * FROM tags WHERE name LIKE ? ORDER BY name ASC",
      [`%${query}%`]
    );
  }

  /**
   * Get tag count
   * @returns {number}
   */
  count() {
    const result = this.db.getFirstSync("SELECT COUNT(*) as count FROM tags");
    return result.count;
  }

  /**
   * Get popular tags (most used)
   * @param {number} limit
   * @returns {Array<Tag & {usageCount: number}>}
   */
  getPopular(limit = 10) {
    return this.db.getAllSync(
      `SELECT t.*, COUNT(bt.bookmarkId) as usageCount
       FROM tags t
       LEFT JOIN bookmark_tags bt ON t.id = bt.tagId
       GROUP BY t.id
       ORDER BY usageCount DESC
       LIMIT ?`,
      [limit]
    );
  }

  /**
   * Delete unused tags (tags not associated with any bookmark)
   * @returns {number} Number of deleted tags
   */
  deleteUnused() {
    const result = this.db.runSync(
      `DELETE FROM tags WHERE id NOT IN (
         SELECT DISTINCT tagId FROM bookmark_tags
       )`
    );
    return result.changes;
  }
}

export default TagRepository;
