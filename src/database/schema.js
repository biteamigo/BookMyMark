/**
 * Database schema for BookMyMark
 * 
 * Tables:
 * - folders: Stores folder/category information (supports nesting)
 * - bookmarks: Stores bookmark information
 * - tags: Stores tag names
 * - folder_bookmarks: Junction table for folders ↔ bookmarks (many-to-many)
 * - bookmark_tags: Junction table for bookmarks ↔ tags (many-to-many)
 * 
 * FTS5 Virtual Tables (for fast full-text search):
 * - folders_fts: Full-text search index for folders
 * - bookmarks_fts: Full-text search index for bookmarks
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

-- FTS5 Virtual Table for Folders (Full-Text Search)
CREATE VIRTUAL TABLE IF NOT EXISTS folders_fts USING fts5(
  id UNINDEXED,
  name,
  content='folders',
  content_rowid='rowid'
);

-- FTS5 Virtual Table for Bookmarks (Full-Text Search)
CREATE VIRTUAL TABLE IF NOT EXISTS bookmarks_fts USING fts5(
  id UNINDEXED,
  name,
  url,
  content='bookmarks',
  content_rowid='rowid'
);

-- Triggers to keep folders_fts synchronized
CREATE TRIGGER IF NOT EXISTS folders_ai AFTER INSERT ON folders BEGIN
  INSERT INTO folders_fts(rowid, id, name) VALUES (new.rowid, new.id, new.name);
END;

CREATE TRIGGER IF NOT EXISTS folders_au AFTER UPDATE ON folders BEGIN
  UPDATE folders_fts SET name = new.name WHERE id = new.id;
END;

-- FTS5 external content: must use 'delete' command (not DELETE) to avoid "missing row from content table"
CREATE TRIGGER IF NOT EXISTS folders_ad AFTER DELETE ON folders BEGIN
  INSERT INTO folders_fts(folders_fts, rowid, id, name) VALUES ('delete', old.rowid, old.id, old.name);
END;

-- Triggers to keep bookmarks_fts synchronized
CREATE TRIGGER IF NOT EXISTS bookmarks_ai AFTER INSERT ON bookmarks BEGIN
  INSERT INTO bookmarks_fts(rowid, id, name, url) VALUES (new.rowid, new.id, new.name, new.url);
END;

-- FTS5 external content: use 'delete' + INSERT (not UPDATE) to avoid corruption/malformed errors
CREATE TRIGGER IF NOT EXISTS bookmarks_au AFTER UPDATE ON bookmarks BEGIN
  INSERT INTO bookmarks_fts(bookmarks_fts, rowid, id, name, url) VALUES ('delete', old.rowid, old.id, old.name, old.url);
  INSERT INTO bookmarks_fts(rowid, id, name, url) VALUES (new.rowid, new.id, new.name, new.url);
END;

-- FTS5 external content: must use 'delete' command (not DELETE) to avoid "missing row from content table"
CREATE TRIGGER IF NOT EXISTS bookmarks_ad AFTER DELETE ON bookmarks BEGIN
  INSERT INTO bookmarks_fts(bookmarks_fts, rowid, id, name, url) VALUES ('delete', old.rowid, old.id, old.name, old.url);
END;

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

/** Recreate FTS5 DELETE triggers with correct 'delete' command (fixes "missing row from content table") */
export const FIX_FTS_DELETE_TRIGGERS_SQL = `
DROP TRIGGER IF EXISTS folders_ad;
DROP TRIGGER IF EXISTS bookmarks_ad;
CREATE TRIGGER folders_ad AFTER DELETE ON folders BEGIN
  INSERT INTO folders_fts(folders_fts, rowid, id, name) VALUES ('delete', old.rowid, old.id, old.name);
END;
CREATE TRIGGER bookmarks_ad AFTER DELETE ON bookmarks BEGIN
  INSERT INTO bookmarks_fts(bookmarks_fts, rowid, id, name, url) VALUES ('delete', old.rowid, old.id, old.name, old.url);
END;
`;

/** Recreate FTS5 UPDATE trigger for bookmarks: use 'delete' + INSERT instead of UPDATE (fixes "database disk image is malformed") */
export const FIX_FTS_BOOKMARKS_UPDATE_TRIGGER_SQL = `
DROP TRIGGER IF EXISTS bookmarks_au;
CREATE TRIGGER bookmarks_au AFTER UPDATE ON bookmarks BEGIN
  INSERT INTO bookmarks_fts(bookmarks_fts, rowid, id, name, url) VALUES ('delete', old.rowid, old.id, old.name, old.url);
  INSERT INTO bookmarks_fts(rowid, id, name, url) VALUES (new.rowid, new.id, new.name, new.url);
END;
`;

export const DROP_TABLES_SQL = `
DROP TABLE IF EXISTS bookmarks_fts;
DROP TABLE IF EXISTS folders_fts;
DROP TABLE IF EXISTS bookmark_tags;
DROP TABLE IF EXISTS folder_bookmarks;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS bookmarks;
DROP TABLE IF EXISTS folders;
`;

export const DATABASE_NAME = "bookmarks.db";
