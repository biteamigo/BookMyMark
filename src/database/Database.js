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
  
  console.log("Database initialized successfully");
};

/**
 * Reset the database (drop all tables and recreate)
 * WARNING: This deletes all user data!
 * @param {SQLite.SQLiteDatabase} db
 */
export const resetDatabase = (db) => {
  // Drop all tables
  db.execSync(DROP_TABLES_SQL);
  
  // Recreate tables
  db.execSync(CREATE_TABLES_SQL);
  
  // Reseed initial data
  seedDatabase(db);
  
  console.log("Database reset successfully");
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
  getTableStats,
  exportToJSON,
};
