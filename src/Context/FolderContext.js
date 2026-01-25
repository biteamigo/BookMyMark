import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { useDatabase } from "./DatabaseContext";

const FolderContext = createContext();

export const FolderProvider = ({ children }) => {
  const { folderRepository } = useDatabase();
  const [categories, setCategories] = useState([]);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load folders from database on mount
  const loadFolders = useCallback(() => {
    const folders = folderRepository.getAll();
    setCategories(folders);
    setIsLoading(false);
  }, [folderRepository]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const addFolder = useCallback((parentId = null) => {
    // Generate unique name using repository method
    const newName = folderRepository.generateUniqueName("New Folder");
    
    // Create folder in database
    const newFolder = folderRepository.create({
      name: newName,
      parentId: parentId,
      icon: null,
    });
    
    // Update local state
    setCategories((prev) => [...prev, newFolder]);
    setEditingFolderId(newFolder.id);
    
    return newFolder.id;
  }, [folderRepository]);

  const updateFolderName = useCallback((folderId, newName) => {
    // Update in database
    const updatedFolder = folderRepository.update(folderId, {
      name: newName || categories.find((c) => c.id === folderId)?.name,
    });
    
    if (updatedFolder) {
      // Update local state
      setCategories((prev) =>
        prev.map((cat) => (cat.id === folderId ? updatedFolder : cat))
      );
    }
    
    setEditingFolderId(null);
  }, [folderRepository, categories]);

  const deleteFolder = useCallback((folderId) => {
    // Delete from database
    const deleted = folderRepository.delete(folderId);
    
    if (deleted) {
      // Update local state
      setCategories((prev) => prev.filter((cat) => cat.id !== folderId));
    }
    
    return deleted;
  }, [folderRepository]);

  const cancelEditing = useCallback(() => {
    setEditingFolderId(null);
  }, []);

  const refreshFolders = useCallback(() => {
    loadFolders();
  }, [loadFolders]);

  return (
    <FolderContext.Provider
      value={{
        categories,
        editingFolderId,
        isLoading,
        addFolder,
        updateFolderName,
        deleteFolder,
        cancelEditing,
        refreshFolders,
      }}
    >
      {children}
    </FolderContext.Provider>
  );
};

export const useFolders = () => {
  const context = useContext(FolderContext);
  if (!context) {
    throw new Error("useFolders must be used within a FolderProvider");
  }
  return context;
};
