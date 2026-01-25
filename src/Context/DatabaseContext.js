/**
 * Database Context - Provides database access throughout the app
 */
import React, { createContext, useContext, useMemo } from "react";
import { getDatabase } from "../database/Database";
import { FolderRepository } from "../database/repositories/FolderRepository";
import { BookmarkRepository } from "../database/repositories/BookmarkRepository";
import { TagRepository } from "../database/repositories/TagRepository";

const DatabaseContext = createContext(null);

/**
 * Database Provider component
 * Initializes the database and provides repositories to the app
 */
export const DatabaseProvider = ({ children }) => {
  // Initialize database and repositories
  const value = useMemo(() => {
    const db = getDatabase();
    
    return {
      db,
      folderRepository: new FolderRepository(db),
      bookmarkRepository: new BookmarkRepository(db),
      tagRepository: new TagRepository(db),
    };
  }, []);

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

/**
 * Hook to access the database and repositories
 * @returns {{
 *   db: import('expo-sqlite').SQLiteDatabase,
 *   folderRepository: FolderRepository,
 *   bookmarkRepository: BookmarkRepository,
 *   tagRepository: TagRepository
 * }}
 */
export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }
  return context;
};

/**
 * Hook to access just the folder repository
 * @returns {FolderRepository}
 */
export const useFolderRepository = () => {
  const { folderRepository } = useDatabase();
  return folderRepository;
};

/**
 * Hook to access just the bookmark repository
 * @returns {BookmarkRepository}
 */
export const useBookmarkRepository = () => {
  const { bookmarkRepository } = useDatabase();
  return bookmarkRepository;
};

/**
 * Hook to access just the tag repository
 * @returns {TagRepository}
 */
export const useTagRepository = () => {
  const { tagRepository } = useDatabase();
  return tagRepository;
};

export default DatabaseContext;
