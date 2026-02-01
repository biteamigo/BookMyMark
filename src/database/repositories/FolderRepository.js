/**
 * Repository for folder CRUD operations
 */
import { generateId, now } from "../seed";

/**
 * @typedef {Object} Folder
 * @property {string} id - Unique identifier
 * @property {string} name - Folder name
 * @property {string|null} parentId - Parent folder ID (null for root folders)
 * @property {string|null} icon - Custom icon identifier
 * @property {number} createdAt - Creation timestamp
 * @property {number} updatedAt - Last update timestamp
 */

export class FolderRepository {
  /**
   * @param {import('expo-sqlite').SQLiteDatabase} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Get all folders
   * @returns {Folder[]}
   */
  getAll() {
    return this.db.getAllSync(
      "SELECT * FROM folders ORDER BY createdAt ASC"
    );
  }

  /**
   * Get root folders (no parent)
   * @returns {Folder[]}
   */
  getRootFolders() {
    return this.db.getAllSync(
      "SELECT * FROM folders WHERE parentId IS NULL ORDER BY createdAt ASC"
    );
  }

  /**
   * Get subfolders of a folder
   * @param {string} parentId
   * @returns {Folder[]}
   */
  getSubfolders(parentId) {
    return this.db.getAllSync(
      "SELECT * FROM folders WHERE parentId = ? ORDER BY createdAt ASC",
      [parentId]
    );
  }

  /**
   * Get a folder by ID
   * @param {string} id
   * @returns {Folder|null}
   */
  getById(id) {
    return this.db.getFirstSync(
      "SELECT * FROM folders WHERE id = ?",
      [id]
    );
  }

  /**
   * Create a new folder
   * @param {Partial<Folder>} folder - Folder data (id, createdAt, updatedAt are optional)
   * @returns {Folder}
   */
  create(folder) {
    const timestamp = now();
    const newFolder = {
      id: folder.id || generateId(),
      name: folder.name,
      parentId: folder.parentId || null,
      icon: folder.icon || null,
      createdAt: folder.createdAt || timestamp,
      updatedAt: folder.updatedAt || timestamp,
    };

    this.db.runSync(
      `INSERT INTO folders (id, name, parentId, icon, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newFolder.id, newFolder.name, newFolder.parentId, newFolder.icon, newFolder.createdAt, newFolder.updatedAt]
    );

    return newFolder;
  }

  /**
   * Update a folder
   * @param {string} id
   * @param {Partial<Folder>} updates
   * @returns {Folder|null}
   */
  update(id, updates) {
    const existing = this.getById(id);
    if (!existing) return null;

    const updatedFolder = {
      ...existing,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: now(),
    };

    this.db.runSync(
      `UPDATE folders SET name = ?, parentId = ?, icon = ?, updatedAt = ? WHERE id = ?`,
      [updatedFolder.name, updatedFolder.parentId, updatedFolder.icon, updatedFolder.updatedAt, id]
    );

    return updatedFolder;
  }

  /**
   * Delete a folder
   * @param {string} id
   * @returns {boolean}
   */
  delete(id) {
    const result = this.db.runSync(
      "DELETE FROM folders WHERE id = ?",
      [id]
    );
    return result.changes > 0;
  }

  /**
   * Check if a folder name exists (for generating unique names)
   * @param {string} name
   * @returns {boolean}
   */
  nameExists(name) {
    const result = this.db.getFirstSync(
      "SELECT COUNT(*) as count FROM folders WHERE name = ?",
      [name]
    );
    return result.count > 0;
  }

  /**
   * Generate a unique folder name (e.g., "New Folder", "New Folder 1", etc.)
   * @param {string} baseName
   * @returns {string}
   */
  generateUniqueName(baseName = "New Folder") {
    if (!this.nameExists(baseName)) {
      return baseName;
    }

    let counter = 1;
    while (this.nameExists(`${baseName} ${counter}`)) {
      counter++;
    }
    return `${baseName} ${counter}`;
  }

  /**
   * Get folder count
   * @returns {number}
   */
  count() {
    const result = this.db.getFirstSync("SELECT COUNT(*) as count FROM folders");
    return result.count;
  }

  /**
   * Search folders by name using FTS5
   * @param {string} query
   * @returns {Folder[]}
   */
  search(query) {
    if (!query || query.trim() === '') {
      return [];
    }

    // Escape FTS5 special characters and add prefix wildcard for substring matching
    const ftsQuery = query.trim().replace(/[:"*]/g, ' ') + '*';
    
    try {
      return this.db.getAllSync(
        `SELECT f.* FROM folders f
         INNER JOIN folders_fts fts ON f.id = fts.id
         WHERE folders_fts MATCH ?
         ORDER BY rank, f.name ASC`,
        [ftsQuery]
      );
    } catch (error) {
      // Fallback to LIKE if FTS query fails
      console.warn('FTS search failed, falling back to LIKE:', error.message);
      return this.db.getAllSync(
        "SELECT * FROM folders WHERE name LIKE ? ORDER BY name ASC",
        [`%${query}%`]
      );
    }
  }

  /**
   * Get all descendant folder IDs (recursive)
   * @param {string} folderId - Parent folder ID
   * @returns {string[]} Array of folder IDs including the parent
   */
  getAllDescendantIds(folderId) {
    const descendants = [folderId];
    const queue = [folderId];
    
    while (queue.length > 0) {
      const currentId = queue.shift();
      const children = this.getSubfolders(currentId);
      
      for (const child of children) {
        descendants.push(child.id);
        queue.push(child.id);
      }
    }
    
    return descendants;
  }

  /**
   * Count all items in a folder (bookmarks + subfolders, recursive)
   * @param {string} folderId
   * @returns {{bookmarkCount: number, folderCount: number, totalCount: number}}
   */
  countFolderContents(folderId) {
    const folderIds = this.getAllDescendantIds(folderId);
    
    // Count subfolders (excluding the folder itself)
    const folderCount = folderIds.length - 1;
    
    // Count bookmarks in all folders (including duplicates across folders)
    let bookmarkCount = 0;
    const countedBookmarks = new Set();
    
    for (const id of folderIds) {
      const bookmarks = this.db.getAllSync(
        `SELECT DISTINCT b.id 
         FROM bookmarks b
         JOIN folder_bookmarks fb ON b.id = fb.bookmarkId
         WHERE fb.folderId = ?`,
        [id]
      );
      
      for (const bookmark of bookmarks) {
        if (!countedBookmarks.has(bookmark.id)) {
          countedBookmarks.add(bookmark.id);
          bookmarkCount++;
        }
      }
    }
    
    return {
      bookmarkCount,
      folderCount,
      totalCount: bookmarkCount + folderCount
    };
  }

  /**
   * Delete a folder and all its contents (CASCADE)
   * This deletes:
   * - All subfolders recursively
   * - All bookmarks that are ONLY in this folder tree
   * - All junction table entries
   * @param {string} folderId
   * @returns {{deletedBookmarks: number, deletedFolders: number}}
   */
  cascadeDelete(folderId) {
    // Get all folder IDs that will be deleted (including subfolders)
    const folderIdsToDelete = this.getAllDescendantIds(folderId);
    
    // Get all bookmarks in these folders
    const placeholders = folderIdsToDelete.map(() => '?').join(',');
    const bookmarksInFolders = this.db.getAllSync(
      `SELECT DISTINCT bookmarkId 
       FROM folder_bookmarks 
       WHERE folderId IN (${placeholders})`,
      folderIdsToDelete
    );
    
    let deletedBookmarks = 0;
    
    // For each bookmark, check if it exists in other folders
    for (const { bookmarkId } of bookmarksInFolders) {
      const otherFolders = this.db.getAllSync(
        `SELECT folderId 
         FROM folder_bookmarks 
         WHERE bookmarkId = ? AND folderId NOT IN (${placeholders})`,
        [bookmarkId, ...folderIdsToDelete]
      );
      
      // If bookmark doesn't exist in any other folder, delete it permanently
      if (otherFolders.length === 0) {
        this.db.runSync("DELETE FROM bookmarks WHERE id = ?", [bookmarkId]);
        deletedBookmarks++;
      }
    }
    
    // Delete all junction entries for these folders
    this.db.runSync(
      `DELETE FROM folder_bookmarks WHERE folderId IN (${placeholders})`,
      folderIdsToDelete
    );
    
    // Delete all folders (CASCADE will handle remaining references)
    this.db.runSync(
      `DELETE FROM folders WHERE id IN (${placeholders})`,
      folderIdsToDelete
    );
    
    return {
      deletedBookmarks,
      deletedFolders: folderIdsToDelete.length
    };
  }
}

export default FolderRepository;
