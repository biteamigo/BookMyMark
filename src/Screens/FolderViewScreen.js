import React, { useState, useRef, useEffect, useCallback } from "react";
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
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import SearchBar from "../Components/SearchBar";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { PAGE_MARGIN } from "../Utils/Constants";
import globalStyles from "../CSS/GlobalCss";
import { useFolders } from "../Context/FolderContext";
import { useDatabase } from "../Context/DatabaseContext";
import BottomActionBar from "../Components/BottomActionBar";
import { getIconForUrl } from "../Utils/IconMapper";
import Toast from "../Components/Toast";
import { executeTransaction } from "../database/Database";

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
  
  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  
  // Toast notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  
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

  // Reload items when screen comes into focus (e.g., after creating a bookmark)
  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [currentFolderId])
  );

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
    // If in selection mode, toggle item selection
    if (isSelectionMode) {
      toggleItemSelection(item);
      return;
    }

    // Normal behavior when not in selection mode
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

  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      // Exiting selection mode - clear all selections
      setSelectedItems(new Set());
      setIsSelectionMode(false);
    } else {
      // Entering selection mode
      setIsSelectionMode(true);
    }
  };

  const toggleItemSelection = (item) => {
    const itemKey = `${item.type}-${item.id}`;
    const newSelected = new Set(selectedItems);
    
    if (newSelected.has(itemKey)) {
      newSelected.delete(itemKey);
    } else {
      newSelected.add(itemKey);
    }
    
    setSelectedItems(newSelected);
  };

  const showToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);
  };

  const handleDelete = () => {
    if (selectedItems.size === 0) return;

    // Parse selected items
    const folders = [];
    const bookmarks = [];
    
    selectedItems.forEach((itemKey) => {
      const [type, id] = itemKey.split('-');
      if (type === 'folder') {
        folders.push(id);
      } else if (type === 'bookmark') {
        bookmarks.push(id);
      }
    });

    // Build confirmation message
    const folderCount = folders.length;
    const bookmarkCount = bookmarks.length;
    
    let message = 'Delete ';
    const parts = [];
    if (folderCount > 0) {
      parts.push(`${folderCount} folder${folderCount > 1 ? 's' : ''}`);
    }
    if (bookmarkCount > 0) {
      parts.push(`${bookmarkCount} bookmark${bookmarkCount > 1 ? 's' : ''}`);
    }
    message += parts.join(' and ') + '?';
    
    // Add folder cascade warning if any folder is selected
    if (folderCount > 0) {
      message += '\n\nThis will also delete any content in the selected folder(s).';
    }

    Alert.alert(
      'Confirm Delete',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDelete(folders, bookmarks),
        },
      ]
    );
  };

  const performDelete = (folderIds, bookmarkIds) => {
    try {
      executeTransaction(folderRepository.db, () => {
        let totalDeleted = 0;
        
        // Delete folders with cascade
        folderIds.forEach((folderId) => {
          const result = folderRepository.cascadeDelete(folderId);
          totalDeleted += result.deletedFolders + result.deletedBookmarks;
        });
        
        // Delete bookmarks (context-aware)
        bookmarkIds.forEach((bookmarkId) => {
          const result = bookmarkRepository.deleteFromFolder(bookmarkId, currentFolderId);
          if (result.deletedPermanently || result.removedFromFolder) {
            totalDeleted++;
          }
        });
        
        // Show toast with count
        const itemText = totalDeleted === 1 ? 'item' : 'items';
        showToast(`${totalDeleted} ${itemText} deleted`);
        
        // Exit selection mode
        setIsSelectionMode(false);
        setSelectedItems(new Set());
        
        // Navigate away if current folder was deleted
        if (folderIds.includes(currentFolderId)) {
          navigation.goBack();
        } else {
          // Reload items
          loadItems();
        }
      });
    } catch (error) {
      console.error('Delete failed:', error);
      Alert.alert('Error', 'Failed to delete items. Please try again.');
    }
  };

  const renderItem = ({ item }) => {
    const isEditing = item.type === 'folder' && item.id === editingFolderId;
    const isGridView = viewMode === 'grid';
    const itemKey = `${item.type}-${item.id}`;
    const isSelected = selectedItems.has(itemKey);
    
    if (item.type === 'folder') {
      return (
        <View style={isGridView ? styles.folderStyleGrid : styles.folderStyleList}>
          <TouchableOpacity
            style={[
              isGridView ? styles.folderTouchableGrid : styles.folderTouchableList,
              isSelected && styles.selectedItem
            ]}
            onPress={() => !isEditing && handleItemPress(item)}
            disabled={isEditing}
          >
            {isSelectionMode && (
              <View style={styles.selectionIndicator}>
                <Ionicons
                  name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                  size={28}
                  color={isSelected ? "#007AFF" : "#8E8E93"}
                />
              </View>
            )}
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
      const bookmarkIcon = getIconForUrl(item.url);
      const IconComponent = bookmarkIcon.library === 'Ionicons' ? Ionicons : MaterialCommunityIcons;
      
      if (isGridView) {
        return (
          <View style={styles.bookmarkStyleGrid}>
            <TouchableOpacity
              style={[styles.bookmarkTouchableGrid, isSelected && styles.selectedItem]}
              onPress={() => handleItemPress(item)}
            >
              {isSelectionMode && (
                <View style={styles.selectionIndicator}>
                  <Ionicons
                    name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                    size={28}
                    color={isSelected ? "#007AFF" : "#8E8E93"}
                  />
                </View>
              )}
              <View style={styles.bookmarkIconGridWrapper}>
                <IconComponent
                  name={bookmarkIcon.name}
                  size={70}
                  color={bookmarkIcon.color}
                />
              </View>
              <Text
                style={styles.bookmarkTextGrid}
                numberOfLines={2}
                ellipsizeMode="middle"
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          </View>
        );
      } else {
        return (
          <View style={styles.bookmarkContainer}>
            <TouchableOpacity
              style={[styles.bookmarkTouchable, isSelected && styles.selectedItem]}
              onPress={() => handleItemPress(item)}
            >
              {isSelectionMode && (
                <View style={styles.selectionIndicator}>
                  <Ionicons
                    name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                    size={28}
                    color={isSelected ? "#007AFF" : "#8E8E93"}
                  />
                </View>
              )}
              <IconComponent
                name={bookmarkIcon.name}
                size={32}
                color={bookmarkIcon.color}
                style={styles.bookmarkIcon}
              />
              <View style={styles.bookmarkTextContainer}>
                <Text style={styles.bookmarkName} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        );
      }
    }
  };

  // Expose view mode, selection toggle, and delete handler to navigation params for header access
  useEffect(() => {
    navigation.setParams({
      viewMode: viewMode,
      _toggleSelectionMode: toggleSelectionMode,
      _handleDelete: handleDelete,
      isSelectionMode: isSelectionMode,
      selectedCount: selectedItems.size,
    });
  }, [viewMode, navigation, isSelectionMode, selectedItems.size]);

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
        onSelect={toggleSelectionMode}
        onNewBookmark={() => navigation.navigate('NewBookmark', { currentFolderId })}
        onDelete={handleDelete}
        isSelectionMode={isSelectionMode}
        selectedCount={selectedItems.size}
      />
      
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
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
  selectedItem: {
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    borderRadius: 8,
  },
  selectionIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
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
  
  // Bookmark styles - Grid view
  bookmarkStyleGrid: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
  },
  bookmarkTouchableGrid: {
    alignItems: "center",
    width: '100%',
  },
  bookmarkIconGridWrapper: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  bookmarkTextGrid: {
    fontSize: 14,
    textAlign: "center",
    color: "#333",
    paddingHorizontal: 4,
    width: '100%',
  },
  
  // Bookmark styles - List view
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
