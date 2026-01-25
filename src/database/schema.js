/**
 * Database schema for BookMyMark
 * 
 * Tables:
 * - folders: Stores folder/category information (supports nesting)
 * - bookmarks: Stores bookmark information
 * - tags: Stores tag names
 * - folder_bookmarks: Junction table for folders ↔ bookmarks (many-to-many)
 * - bookmark_tags: Junction table for bookmarks ↔ tags (many-to-many)
 */

export const CREATE_TABLES_SQL = `
-- Folders table (supports unlimited nesting via parentId)
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  parentId TEXT,
  icon TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (parentId) REFERENCES folders(id) ON DELETE CASCADE
);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  favicon TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  createdAt INTEGER NOT NULL
);

-- Junction table: Folders ↔ Bookmarks (many-to-many)
CREATE TABLE IF NOT EXISTS folder_bookmarks (
  folderId TEXT NOT NULL,
  bookmarkId TEXT NOT NULL,
  addedAt INTEGER NOT NULL,
  PRIMARY KEY (folderId, bookmarkId),
  FOREIGN KEY (folderId) REFERENCES folders(id) ON DELETE CASCADE,
  FOREIGN KEY (bookmarkId) REFERENCES bookmarks(id) ON DELETE CASCADE
);

-- Junction table: Bookmarks ↔ Tags (many-to-many)
CREATE TABLE IF NOT EXISTS bookmark_tags (
  bookmarkId TEXT NOT NULL,
  tagId TEXT NOT NULL,
  PRIMARY KEY (bookmarkId, tagId),
  FOREIGN KEY (bookmarkId) REFERENCES bookmarks(id) ON DELETE CASCADE,
  FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_folders_parentId ON folders(parentId);
CREATE INDEX IF NOT EXISTS idx_folders_name ON folders(name);
CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url);
CREATE INDEX IF NOT EXISTS idx_bookmarks_name ON bookmarks(name);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_folder_bookmarks_folderId ON folder_bookmarks(folderId);
CREATE INDEX IF NOT EXISTS idx_folder_bookmarks_bookmarkId ON folder_bookmarks(bookmarkId);
CREATE INDEX IF NOT EXISTS idx_bookmark_tags_bookmarkId ON bookmark_tags(bookmarkId);
CREATE INDEX IF NOT EXISTS idx_bookmark_tags_tagId ON bookmark_tags(tagId);
`;

export const DROP_TABLES_SQL = `
DROP TABLE IF EXISTS bookmark_tags;
DROP TABLE IF EXISTS folder_bookmarks;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS bookmarks;
DROP TABLE IF EXISTS folders;
`;

export const DATABASE_NAME = "bookmarks.db";
