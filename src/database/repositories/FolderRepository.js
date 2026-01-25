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
   * Search folders by name
   * @param {string} query
   * @returns {Folder[]}
   */
  search(query) {
    return this.db.getAllSync(
      "SELECT * FROM folders WHERE name LIKE ? ORDER BY name ASC",
      [`%${query}%`]
    );
  }
}

export default FolderRepository;
