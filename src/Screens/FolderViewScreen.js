import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import SearchBar from "../Components/SearchBar";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { PAGE_MARGIN } from "../Utils/Constants";
import globalStyles from "../CSS/GlobalCss";
import { useFolders } from "../Context/FolderContext";
import { useDatabase } from "../Context/DatabaseContext";
import BottomActionBar from "../Components/BottomActionBar";

const FolderViewScreen = ({ navigation, route }) => {
  // Get folderId from route params (null = root level)
  const currentFolderId = route.params?.folderId || null;
  const isRoot = currentFolderId === null;
  
  const [searchTerm, setSearchTerm] = useState("");
  const { folderRepository, bookmarkRepository } = useDatabase();
  const { editingFolderId, updateFolderName } = useFolders();
  
  const [editingName, setEditingName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [items, setItems] = useState([]);
  const [currentFolderName, setCurrentFolderName] = useState("");
  
  // View mode: 'grid' or 'list' - default based on folder level
  const [viewMode, setViewMode] = useState(isRoot ? 'grid' : 'list');
  
  const inputRef = useRef(null);
  const flatListRef = useRef(null);

  // Load current folder name and update header
  useEffect(() => {
    if (!isRoot && currentFolderId) {
      const folder = folderRepository.getById(currentFolderId);
      if (folder) {
        setCurrentFolderName(folder.name);
        navigation.setParams({ folderName: folder.name });
      }
    } else {
      setCurrentFolderName("");
      navigation.setParams({ folderName: null });
    }
  }, [currentFolderId, isRoot, folderRepository, navigation]);

  // Load folders and bookmarks for current level
  const loadItems = () => {
    const folders = currentFolderId
      ? folderRepository.getSubfolders(currentFolderId)
      : folderRepository.getRootFolders();
    
    const bookmarks = currentFolderId
      ? bookmarkRepository.getByFolder(currentFolderId)
      : []; // No bookmarks at root for now
    
    // Combine and sort: folders first, then bookmarks
    const combined = [
      ...folders.map(f => ({ ...f, type: 'folder' })),
      ...bookmarks.map(b => ({ ...b, type: 'bookmark' }))
    ];
    
    setItems(combined);
  };

  useEffect(() => {
    loadItems();
  }, [currentFolderId, editingFolderId]);

  // When a folder starts being edited, set up the editing state
  useEffect(() => {
    if (editingFolderId) {
      const folderIndex = items.findIndex(
        (item) => item.type === 'folder' && item.id === editingFolderId
      );
      const folder = items[folderIndex];
      if (folder) {
        setEditingName(folder.name);
        setOriginalName(folder.name);
        setSelection({ start: 0, end: folder.name.length });
        
        // Scroll to show the edited folder
        const numColumns = viewMode === 'grid' ? 3 : 1;
        const rowIndex = viewMode === 'grid' ? Math.floor(folderIndex / numColumns) : folderIndex;
        
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: rowIndex,
            animated: true,
            viewPosition: 0.12,
          });
        }, 100);
      }
    }
  }, [editingFolderId, items, viewMode]);

  // Focus the input when editing starts
  useEffect(() => {
    if (editingFolderId && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [editingFolderId]);

  const handleSubmitEditing = () => {
    if (editingFolderId) {
      updateFolderName(editingFolderId, editingName.trim() || originalName);
      loadItems(); // Reload to show updated name
      
      // If we're editing the current folder (shown in header), update the header
      if (editingFolderId === currentFolderId) {
        const updatedName = editingName.trim() || originalName;
        setCurrentFolderName(updatedName);
        navigation.setParams({ folderName: updatedName });
      }
    }
  };

  const handleItemPress = (item) => {
    if (item.type === 'folder') {
      // Navigate to subfolder (same screen, different folderId)
      navigation.push('FolderView', { folderId: item.id });
    } else {
      // Open bookmark URL
      if (item.url) {
        Linking.openURL(item.url).catch(err => {
          console.error('Failed to open URL:', err);
        });
      }
    }
  };

  const renderItem = ({ item }) => {
    const isEditing = item.type === 'folder' && item.id === editingFolderId;
    const isGridView = viewMode === 'grid';
    
    if (item.type === 'folder') {
      return (
        <View style={isGridView ? styles.folderStyleGrid : styles.folderStyleList}>
          <TouchableOpacity
            style={isGridView ? styles.folderTouchableGrid : styles.folderTouchableList}
            onPress={() => !isEditing && handleItemPress(item)}
            disabled={isEditing}
          >
            <MaterialCommunityIcons
              name="folder"
              size={isGridView ? 90 : 40}
              style={styles.iconStyle}
            />
            {isEditing ? (
              <TextInput
                ref={inputRef}
                style={styles.editingInput}
                value={editingName}
                onChangeText={(text) => {
                  setEditingName(text);
                  setSelection(undefined);
                }}
                onSubmitEditing={handleSubmitEditing}
                onBlur={handleSubmitEditing}
                selection={selection}
                autoFocus={true}
              />
            ) : (
              <Text
                style={isGridView ? styles.folderTextGrid : styles.folderTextList}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {item.name}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      );
    } else {
      // Bookmark item
      return (
        <View style={styles.bookmarkContainer}>
          <TouchableOpacity
            style={styles.bookmarkTouchable}
            onPress={() => handleItemPress(item)}
          >
            <Ionicons
              name="bookmark"
              size={24}
              color="#FF9500"
              style={styles.bookmarkIcon}
            />
            <View style={styles.bookmarkTextContainer}>
              <Text style={styles.bookmarkName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.bookmarkUrl} numberOfLines={1}>
                {item.url}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }
  };

  // Expose view mode to navigation params for header access
  // Also listen for view mode changes from header
  useEffect(() => {
    navigation.setParams({
      viewMode: viewMode,
    });
  }, [viewMode, navigation]);

  // Listen for route param changes to update view mode
  useEffect(() => {
    const newViewMode = route.params?.viewMode;
    if (newViewMode && newViewMode !== viewMode) {
      setViewMode(newViewMode);
    }
  }, [route.params?.viewMode]);

  return (
    <KeyboardAvoidingView
      style={globalStyles.pageView}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={100}
    >
      <FlatList
        ref={flatListRef}
        data={items}
        numColumns={viewMode === 'grid' ? 3 : 1}
        key={viewMode} // Force re-render on layout change
        horizontal={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContents}
        columnWrapperStyle={viewMode === 'grid' ? styles.columnWrapper : undefined}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 200);
        }}
      />
      
      <View style={styles.searchBarContainer}>
        <SearchBar
          searchTerm={searchTerm}
          onSearchTermChange={(newSearchTerm) => {
            setSearchTerm(newSearchTerm);
          }}
          onSubmit={() => {
            console.log("Search:", searchTerm);
          }}
        />
      </View>
      
      <BottomActionBar
        currentFolderId={currentFolderId}
        onSelect={() => console.log("Select pressed")}
        onNewBookmark={() => console.log("New Bookmark pressed")}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  searchBarContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  listContents: {
    paddingTop: 60,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: "space-around",
  },
  
  // Grid layout (root level)
  folderStyleGrid: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
  },
  folderTouchableGrid: {
    alignItems: "center",
  },
  folderTextGrid: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 5,
    color: "#333",
  },
  
  // List layout (subfolders)
  folderStyleList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  folderTouchableList: {
    flexDirection: "row",
    alignItems: "center",
  },
  folderTextList: {
    fontSize: 16,
    marginLeft: 12,
    color: "#333",
    flex: 1,
  },
  
  // Common styles
  iconStyle: {
    color: "#5AC8FA",
  },
  editingInput: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 5,
    color: "#333",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 80,
  },
  
  // Bookmark styles
  bookmarkContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  bookmarkTouchable: {
    flexDirection: "row",
    alignItems: "center",
  },
  bookmarkIcon: {
    marginRight: 12,
  },
  bookmarkTextContainer: {
    flex: 1,
  },
  bookmarkName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  bookmarkUrl: {
    fontSize: 12,
    color: "#888",
  },
});

export default FolderViewScreen;
