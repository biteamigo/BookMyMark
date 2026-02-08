/**
 * Database initialization and management
 */
import * as SQLite from "expo-sqlite";
import { CREATE_TABLES_SQL, DROP_TABLES_SQL, FIX_FTS_DELETE_TRIGGERS_SQL, DATABASE_NAME } from "./schema";
import { seedDatabase } from "./seed";

let dbInstance = null;

/**
 * Get or create the database instance
 * @returns {SQLite.SQLiteDatabase}
 */
export const getDatabase = () => {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DATABASE_NAME);
    initializeDatabase(dbInstance);
  }
  return dbInstance;
};

/**
 * Initialize database tables
 * @param {SQLite.SQLiteDatabase} db
 */
const initializeDatabase = (db) => {
  // Enable foreign keys
  db.execSync("PRAGMA foreign_keys = ON;");
  // Make LIKE comparisons case-insensitive (so tag search matches regardless of case)
  db.execSync("PRAGMA case_sensitive_like = OFF;");

  // Create tables
  db.execSync(CREATE_TABLES_SQL);

  // Fix FTS5 DELETE triggers (correct 'delete' command so content table stays in sync)
  try {
    db.execSync(FIX_FTS_DELETE_TRIGGERS_SQL);
  } catch (e) {
    console.warn("FTS trigger fix skipped (tables may not exist yet):", e?.message);
  }

  // Seed initial data if needed
  seedDatabase(db);

  // Rebuild FTS indexes on every launch so they stay in sync with content tables (fixes "missing row" errors)
  rebuildFTSIndexes(db);

  console.log("Database initialized successfully");
};

/**
 * Execute multiple database operations in a transaction
 * All operations succeed or all fail (atomicity)
 * @param {SQLite.SQLiteDatabase} db
 * @param {Function} operations - Function containing database operations
 * @returns {*} Result of operations or throws error
 */
export const executeTransaction = (db, operations) => {
  try {
    db.execSync("BEGIN TRANSACTION;");
    const result = operations();
    db.execSync("COMMIT;");
    return result;
  } catch (error) {
    db.execSync("ROLLBACK;");
    console.error("Transaction failed, rolled back:", error);
    throw error;
  }
};

/**
 * Reset the database (drop all tables and recreate)
 * WARNING: This deletes all user data!
 * @param {SQLite.SQLiteDatabase} db
 */
export const resetDatabase = (db) => {
  try {
    // Drop FTS virtual tables first (individually to handle errors gracefully)
    try {
      db.execSync("DROP TABLE IF EXISTS bookmarks_fts;");
    } catch (e) {
      // Ignore if table doesn't exist
    }
    
    try {
      db.execSync("DROP TABLE IF EXISTS folders_fts;");
    } catch (e) {
      // Ignore if table doesn't exist
    }
    
    // Drop regular tables
    db.execSync(`
      DROP TABLE IF EXISTS bookmark_tags;
      DROP TABLE IF EXISTS folder_bookmarks;
      DROP TABLE IF EXISTS tags;
      DROP TABLE IF EXISTS bookmarks;
      DROP TABLE IF EXISTS folders;
    `);
  } catch (error) {
    console.warn("Error dropping tables:", error);
    // Continue anyway - tables might not exist
  }
  
  // Recreate tables
  db.execSync(CREATE_TABLES_SQL);
  
  // Reseed initial data
  seedDatabase(db);
  
  console.log("Database reset successfully");
};

/**
 * Check if FTS tables exist
 * @param {SQLite.SQLiteDatabase} db
 * @returns {boolean}
 */
const ftsTablesExist = (db) => {
  try {
    const result = db.getFirstSync(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name IN ('folders_fts', 'bookmarks_fts')"
    );
    return result.count === 2;
  } catch (error) {
    return false;
  }
};

/**
 * Rebuild FTS indexes from content tables (fixes "missing row from content table" errors).
 * Uses FTS5 'rebuild' command so the index is recreated from current folders/bookmarks.
 * @param {SQLite.SQLiteDatabase} db
 */
export const rebuildFTSIndexes = (db) => {
  try {
    if (!ftsTablesExist(db)) {
      return;
    }

    // FTS5 'rebuild' re-syncs the index from the content table (correct for content= tables)
    db.execSync("INSERT INTO folders_fts(folders_fts) VALUES('rebuild');");
    db.execSync("INSERT INTO bookmarks_fts(bookmarks_fts) VALUES('rebuild');");
  } catch (error) {
    console.error("Error rebuilding FTS indexes:", error);
  }
};

/**
 * Clear all data but keep the schema
 * @param {SQLite.SQLiteDatabase} db
 */
export const clearAllData = (db) => {
  db.execSync(`
    DELETE FROM bookmark_tags;
    DELETE FROM folder_bookmarks;
    DELETE FROM tags;
    DELETE FROM bookmarks;
    DELETE FROM folders;
  `);
  
  // FTS tables are automatically cleared by triggers
  
  console.log("All data cleared");
};

/**
 * Get table statistics for debugging
 * @param {SQLite.SQLiteDatabase} db
 * @returns {Object}
 */
export const getTableStats = (db) => {
  const folders = db.getFirstSync("SELECT COUNT(*) as count FROM folders");
  const bookmarks = db.getFirstSync("SELECT COUNT(*) as count FROM bookmarks");
  const tags = db.getFirstSync("SELECT COUNT(*) as count FROM tags");
  const folderBookmarks = db.getFirstSync("SELECT COUNT(*) as count FROM folder_bookmarks");
  const bookmarkTags = db.getFirstSync("SELECT COUNT(*) as count FROM bookmark_tags");
  
  return {
    folders: folders.count,
    bookmarks: bookmarks.count,
    tags: tags.count,
    folderBookmarks: folderBookmarks.count,
    bookmarkTags: bookmarkTags.count,
  };
};

/**
 * Export entire database as JSON (for debugging/backup)
 * @param {SQLite.SQLiteDatabase} db
 * @returns {Object}
 */
export const exportToJSON = (db) => {
  return {
    folders: db.getAllSync("SELECT * FROM folders"),
    bookmarks: db.getAllSync("SELECT * FROM bookmarks"),
    tags: db.getAllSync("SELECT * FROM tags"),
    folderBookmarks: db.getAllSync("SELECT * FROM folder_bookmarks"),
    bookmarkTags: db.getAllSync("SELECT * FROM bookmark_tags"),
    exportedAt: new Date().toISOString(),
  };
};

export default {
  getDatabase,
  resetDatabase,
  clearAllData,
  rebuildFTSIndexes,
  getTableStats,
  exportToJSON,
};
