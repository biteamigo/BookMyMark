/**
 * Database initialization and management
 */
import * as SQLite from "expo-sqlite";
import { CREATE_TABLES_SQL, DROP_TABLES_SQL, DATABASE_NAME } from "./schema";
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
  
  // Create tables
  db.execSync(CREATE_TABLES_SQL);
  
  // Seed initial data if needed
  seedDatabase(db);
  
  // Rebuild FTS indexes only if there's data (triggers will handle new inserts)
  // This avoids errors on fresh databases
  const folderCount = db.getFirstSync("SELECT COUNT(*) as count FROM folders");
  if (folderCount && folderCount.count > 0) {
    rebuildFTSIndexes(db);
  }
  
  console.log("Database initialized successfully");
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
 * Rebuild FTS indexes from existing data
 * This syncs the FTS virtual tables with the actual data tables
 * @param {SQLite.SQLiteDatabase} db
 */
export const rebuildFTSIndexes = (db) => {
  try {
    // Check if FTS tables exist first
    if (!ftsTablesExist(db)) {
      console.log("FTS tables not found, skipping rebuild");
      return;
    }

    // Clear existing FTS data
    db.execSync("DELETE FROM folders_fts;");
    db.execSync("DELETE FROM bookmarks_fts;");
    
    // Rebuild folders FTS index
    db.execSync(`
      INSERT INTO folders_fts(rowid, id, name)
      SELECT rowid, id, name FROM folders;
    `);
    
    // Rebuild bookmarks FTS index
    db.execSync(`
      INSERT INTO bookmarks_fts(rowid, id, name, url)
      SELECT rowid, id, name, url FROM bookmarks;
    `);
    
    console.log("FTS indexes rebuilt successfully");
  } catch (error) {
    console.error("Error rebuilding FTS indexes:", error);
    // Non-fatal - continue anyway
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
