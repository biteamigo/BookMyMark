import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Keyboard,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePreventRemove } from '@react-navigation/native';
import SearchBar from '../Components/SearchBar';
import { setPendingFolderPickerResult } from '../Utils/folderPickerResult';
import { useDatabase } from '../Context/DatabaseContext';
import globalStyles from '../CSS/GlobalCss';

/**
 * FolderPickerScreen
 * 
 * Multi-select folder picker with search
 * @param {navigation} navigation - React Navigation object
 * @param {route} route - Route params: { selectedFolderIds: [], onSelect: (ids) => {} }
 */
const FolderPickerScreen = ({ navigation, route }) => {
  const { folderRepository } = useDatabase();
  const { selectedFolderIds = [] } = route.params || {};
  
  const [folders, setFolders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set(selectedFolderIds));
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [hierarchicalFolders, setHierarchicalFolders] = useState([]);
  const [showParentPicker, setShowParentPicker] = useState(false);
  const [parentPickerExpandedIds, setParentPickerExpandedIds] = useState(new Set());
  const selectedCountOpacity = useRef(new Animated.Value(0)).current;
  const selectedCountHeight = useRef(new Animated.Value(0)).current;
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  // When opening the picker again (or params change), sync local selection from params so the modal
  // reflects the parent's current selection. Use serialized ids so we only sync when selection changes.
  const selectedFolderIdsKey = JSON.stringify(route.params?.selectedFolderIds ?? []);
  React.useEffect(() => {
    const ids = route.params?.selectedFolderIds;
    if (ids && Array.isArray(ids)) {
      setSelectedIds(new Set(ids));
    }
  }, [selectedFolderIdsKey]);

  const hasChanges = selectedIds.size !== selectedFolderIds.length || 
    ![...selectedIds].every(id => selectedFolderIds.includes(id));

  // Prevent going back if creating folder
  usePreventRemove(isCreatingFolder, ({ data }) => {
    Alert.alert(
      'Discard New Folder?',
      'You are creating a new folder. Are you sure you want to go back?',
      [
        { text: 'Keep Editing', style: 'cancel', onPress: () => {} },
        { 
          text: 'Discard', 
          style: 'destructive', 
          onPress: () => {
            setIsCreatingFolder(false);
            setNewFolderName('');
            navigation.dispatch(data.action);
          }
        }
      ]
    );
  });

  useEffect(() => {
    loadFolders();
  }, []);

  // Set up navigation header
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Text style={{ 
          fontFamily: 'NovaRound_400Regular', 
          fontSize: 17, 
          color: '#000',
          letterSpacing: 0.3,
        }}>
          Select Folders
        </Text>
      ),
      headerRight: () => (
        <TouchableOpacity 
          onPress={handleDone}
          testID="done-button"
          style={{ 
            paddingVertical: 8,
            paddingLeft: 16,
            paddingRight: 8,
            marginRight: 8,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#007AFF' }}>
            Done
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleDone]);

  useEffect(() => {
    // Animate selected count banner
    if (selectedIds.size > 0) {
      Animated.parallel([
        Animated.timing(selectedCountOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(selectedCountHeight, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(selectedCountOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(selectedCountHeight, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [selectedIds.size]);

  useEffect(() => {
    if (searchTerm.trim()) {
      // When searching, build hierarchy for matched folders
      buildSearchHierarchy();
    } else {
      // When not searching, build hierarchical tree
      buildHierarchicalList();
    }
  }, [searchTerm, folders, expandedIds]);

  const buildSearchHierarchy = () => {
    const results = folderRepository.search(searchTerm);
    const hierarchyList = [];
    const addedIds = new Set();
    
    // Get full parent chain for a folder
    const getParentChain = (folderId) => {
      const chain = [];
      let current = folders.find(f => f.id === folderId);
      
      while (current) {
        chain.unshift(current);
        current = current.parentId ? folders.find(f => f.id === current.parentId) : null;
      }
      
      return chain;
    };
    
    const addFolderWithHierarchy = (folder) => {
      const chain = getParentChain(folder.id);
      
      chain.forEach((f, index) => {
        if (!addedIds.has(f.id)) {
          const children = folders.filter(child => child.parentId === f.id);
          const hasChildren = children.length > 0;
          const isExpanded = expandedIds.has(f.id);
          
          hierarchyList.push({
            ...f,
            level: index,
            hasChildren,
            isExpanded,
          });
          
          addedIds.add(f.id);
          
          // If expanded, add all children
          if (isExpanded && hasChildren) {
            children.forEach(child => {
              if (!addedIds.has(child.id)) {
                addFolderWithChildren(child, index + 1);
              }
            });
          }
        }
      });
    };
    
    const addFolderWithChildren = (folder, level) => {
      const children = folders.filter(f => f.parentId === folder.id);
      const hasChildren = children.length > 0;
      const isExpanded = expandedIds.has(folder.id);
      
      if (!addedIds.has(folder.id)) {
        hierarchyList.push({
          ...folder,
          level,
          hasChildren,
          isExpanded,
        });
        addedIds.add(folder.id);
      }
      
      if (isExpanded && hasChildren) {
        children.forEach(child => addFolderWithChildren(child, level + 1));
      }
    };
    
    // Build hierarchy for each matched folder
    results.forEach(folder => addFolderWithHierarchy(folder));
    
    setHierarchicalFolders(hierarchyList);
  };

  const buildHierarchicalList = () => {
    const result = [];
    
    const addFolderAndChildren = (folderId, level) => {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return;
      
      const children = folders.filter(f => f.parentId === folderId);
      const hasChildren = children.length > 0;
      const isExpanded = expandedIds.has(folderId);
      
      result.push({
        ...folder,
        level,
        hasChildren,
        isExpanded,
      });
      
      if (isExpanded && hasChildren) {
        children.forEach(child => addFolderAndChildren(child.id, level + 1));
      }
    };
    
    // Start with root folders
    const rootFolders = folders.filter(f => !f.parentId);
    rootFolders.forEach(folder => addFolderAndChildren(folder.id, 0));
    
    setHierarchicalFolders(result);
  };

  const loadFolders = () => {
    const allFolders = folderRepository.getAll();
    setFolders(allFolders);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }

    try {
      const newFolder = folderRepository.create({
        name: newFolderName.trim(),
        parentId: newFolderParentId,
        icon: 'folder',
      });

      // Auto-select the newly created folder
      const newSelected = new Set(selectedIds);
      newSelected.add(newFolder.id);
      setSelectedIds(newSelected);

      // Reset form
      setNewFolderName('');
      setNewFolderParentId(null);
      setIsCreatingFolder(false);
      setShowParentPicker(false);

      // Reload folders
      loadFolders();
    } catch (error) {
      Alert.alert('Error', 'Failed to create folder');
      console.error('Create folder error:', error);
    }
  };

  const toggleFolder = (folderId) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(folderId)) {
      newSelected.delete(folderId);
    } else {
      newSelected.add(folderId);
    }
    setSelectedIds(newSelected);
  };

  const toggleExpanded = (folderId) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedIds(newExpanded);
  };

  const hasSelectedDescendants = (folderId) => {
    // Check if any descendants (children, grandchildren, etc.) are selected
    const checkChildren = (id) => {
      const children = folders.filter(f => f.parentId === id);
      for (const child of children) {
        if (selectedIds.has(child.id)) return true;
        if (checkChildren(child.id)) return true;
      }
      return false;
    };
    return checkChildren(folderId);
  };

  const toggleParentPickerExpanded = (folderId) => {
    const newExpanded = new Set(parentPickerExpandedIds);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setParentPickerExpandedIds(newExpanded);
  };

  const renderParentFolderOptions = () => {
    const renderFolder = (folderId, level = 0) => {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return null;
      
      const children = folders.filter(f => f.parentId === folderId);
      const hasChildren = children.length > 0;
      const isExpanded = parentPickerExpandedIds.has(folderId);
      const indentWidth = level * 20;
      const isSelected = newFolderParentId === folder.id;
      
      return (
        <View key={folder.id}>
          <TouchableOpacity
            style={[
              styles.parentPickerItem,
              { paddingLeft: 12 + indentWidth },
              isSelected && styles.parentPickerItemSelected
            ]}
            onPress={() => {
              setNewFolderParentId(folder.id);
              setShowParentPicker(false);
            }}
          >
            {/* Chevron for expand/collapse */}
            {hasChildren ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  toggleParentPickerExpanded(folder.id);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.parentChevron}
              >
                <Ionicons
                  name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                  size={16}
                  color="#666"
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.parentChevronPlaceholder} />
            )}
            
            <MaterialCommunityIcons 
              name={folder.icon || 'folder'} 
              size={20} 
              color={isSelected ? "#007AFF" : "#666"} 
            />
            <Text style={[
              styles.parentPickerItemText,
              isSelected && styles.parentPickerItemTextSelected
            ]}>
              {folder.name}
            </Text>
          </TouchableOpacity>
          {isExpanded && children.map(child => renderFolder(child.id, level + 1))}
        </View>
      );
    };
    
    const rootFolders = folders.filter(f => !f.parentId);
    return rootFolders.map(folder => renderFolder(folder.id, 0));
  };

  const handleDone = React.useCallback(() => {
    const ids = Array.from(selectedIdsRef.current);
    setPendingFolderPickerResult(ids);
    navigation.goBack();
  }, [navigation]);

  const getFolderPath = (folder) => {
    if (!folder.parentId) return folder.name;
    
    const path = [];
    let current = folder;
    while (current) {
      path.unshift(current.name);
      current = current.parentId ? folderRepository.getById(current.parentId) : null;
    }
    return path.join(' > ');
  };

  const renderFolderItem = ({ item }) => {
    const isSelected = selectedIds.has(item.id);
    const hasDescendantsSelected = !isSelected && hasSelectedDescendants(item.id);
    const { level = 0, hasChildren = false, isExpanded = false } = item;
    const indentWidth = level * 24;

    return (
      <View style={[styles.folderItemWrapper, { paddingLeft: indentWidth }]}>
        <TouchableOpacity
          style={[
            styles.folderItem, 
            isSelected && styles.folderItemSelected,
            hasDescendantsSelected && styles.folderItemPartial
          ]}
          onPress={() => toggleFolder(item.id)}
          testID={`folder-picker-item-${item.name.replace(/\s+/g, "-")}`}
        >
          <View style={styles.folderInfo}>
            {/* Expand/Collapse Button */}
            {hasChildren ? (
              <TouchableOpacity
                onPress={(e) => {
                  e?.stopPropagation?.();
                  toggleExpanded(item.id);
                }}
                style={styles.expandButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                testID={`expand-folder-${item.id}`}
              >
                <Ionicons
                  name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.expandPlaceholder} />
            )}
            
            {/* Folder Icon */}
            <View style={[
              styles.iconContainer, 
              level > 0 && styles.iconNested,
              hasDescendantsSelected && styles.iconContainerPartial
            ]}>
              <MaterialCommunityIcons 
                name={item.icon || 'folder'} 
                size={22} 
                color={isSelected ? '#007AFF' : hasDescendantsSelected ? '#007AFF' : '#666'} 
              />
              {hasDescendantsSelected && (
                <View style={styles.blueDot} />
              )}
            </View>
            
            {/* Folder Name */}
            <View style={styles.folderTextContainer}>
              <Text style={[
                styles.folderName, 
                isSelected && styles.folderNameSelected,
                hasDescendantsSelected && styles.folderNamePartial
              ]}>
                {item.name}
              </Text>
            </View>
          </View>
          
          {/* Checkbox */}
          <View style={[
            styles.checkbox, 
            isSelected && styles.checkboxSelected,
            hasDescendantsSelected && styles.checkboxPartial
          ]}>
            {isSelected ? (
              <Ionicons name="checkmark" size={18} color="#FFF" />
            ) : hasDescendantsSelected ? (
              <View style={styles.partialDot} />
            ) : null}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[globalStyles.pageView, styles.safeArea]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onSubmit={() => {}}
        />
      </View>

      {/* Selected Count */}
      <Animated.View 
        style={[
          styles.selectedCountContainer,
          {
            opacity: selectedCountOpacity,
            maxHeight: selectedCountHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 50],
            }),
            marginBottom: selectedCountHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 16],
            }),
            overflow: 'hidden',
          }
        ]}
        pointerEvents={selectedIds.size > 0 ? 'auto' : 'none'}
      >
        <Text style={styles.selectedCountText}>
          ✓ {selectedIds.size} folder{selectedIds.size !== 1 ? 's' : ''} selected
        </Text>
      </Animated.View>

      {/* New Folder Button/Form */}
      <View style={styles.newFolderContainer}>
        {!isCreatingFolder ? (
          <TouchableOpacity
            style={styles.newFolderButton}
            onPress={() => setIsCreatingFolder(true)}
            testID="new-folder-button"
          >
            <Ionicons name="add-circle" size={24} color="#007AFF" />
            <Text style={styles.newFolderButtonText}>Create New Folder</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.newFolderForm}>
            <TextInput
              style={styles.newFolderInput}
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="Enter folder name..."
              placeholderTextColor="#999"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateFolder}
              testID="new-folder-input"
            />
            
            {/* Parent Folder Selector */}
            <View style={styles.parentFolderSelector}>
              <Text style={styles.parentFolderLabel}>Create inside:</Text>
              <TouchableOpacity
                style={styles.parentFolderDisplay}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowParentPicker(!showParentPicker);
                }}
              >
                <Ionicons name="folder-open-outline" size={20} color="#007AFF" />
                <Text style={styles.parentFolderText}>
                  {newFolderParentId 
                    ? getFolderPath(folders.find(f => f.id === newFolderParentId))
                    : 'Root (Top Level)'}
                </Text>
                <Ionicons 
                  name={showParentPicker ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#007AFF" 
                />
              </TouchableOpacity>
              
              {/* Expandable Parent Picker */}
              {showParentPicker && (
                <ScrollView style={styles.parentPickerList} nestedScrollEnabled={true}>
                  <TouchableOpacity
                    style={[
                      styles.parentPickerItem,
                      newFolderParentId === null && styles.parentPickerItemSelected
                    ]}
                    onPress={() => {
                      setNewFolderParentId(null);
                      setShowParentPicker(false);
                    }}
                  >
                    <View style={styles.parentChevronPlaceholder} />
                    <Ionicons name="home-outline" size={20} color={newFolderParentId === null ? "#007AFF" : "#666"} />
                    <Text style={[
                      styles.parentPickerItemText,
                      newFolderParentId === null && styles.parentPickerItemTextSelected
                    ]}>
                      Root (Top Level)
                    </Text>
                  </TouchableOpacity>
                  
                  {renderParentFolderOptions()}
                </ScrollView>
              )}
            </View>

            <View style={styles.newFolderActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsCreatingFolder(false);
                  setNewFolderName('');
                  setNewFolderParentId(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateFolder}
                testID="create-folder-button"
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Folders List */}
      <FlatList
        data={hierarchicalFolders}
        renderItem={renderFolderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        extraData={expandedIds}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={56} color="#D1D1D6" />
            <Text style={styles.emptyText}>
              {searchTerm ? 'No folders found' : 'No folders yet'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    marginTop: 0,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  selectedCountContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F5F8FB',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#A8C7FA',
  },
  selectedCountText: {
    fontSize: 13,
    color: '#5A7BA6',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  folderItemWrapper: {
    marginBottom: 8,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    borderRadius: 14,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.08)',
  },
  folderItemSelected: {
    backgroundColor: '#E8F4FF',
    shadowColor: '#007AFF',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  folderItemPartial: {
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  expandButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  expandPlaceholder: {
    width: 28,
    marginRight: 4,
  },
  folderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.1)',
  },
  iconNested: {
    backgroundColor: '#E8F4FF',
    borderColor: 'rgba(0, 122, 255, 0.15)',
  },
  iconContainerPartial: {
    position: 'relative',
  },
  blueDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  folderTextContainer: {
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  folderNameSelected: {
    color: '#007AFF',
  },
  folderPath: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 3,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#D1D1D6',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxPartial: {
    borderColor: '#007AFF',
    backgroundColor: '#FFF',
  },
  partialDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  folderNamePartial: {
    color: '#007AFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  newFolderContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  newFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F4FF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  newFolderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  newFolderForm: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  newFolderInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E0E5ED',
  },
  parentFolderSelector: {
    marginBottom: 16,
  },
  parentFolderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  parentFolderDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 122, 255, 0.2)',
    gap: 8,
  },
  parentFolderText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  parentPickerList: {
    marginTop: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E5ED',
    maxHeight: 250,
  },
  parentChevron: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  parentChevronPlaceholder: {
    width: 24,
    marginRight: 4,
  },
  parentPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  parentPickerItemSelected: {
    backgroundColor: '#E8F4FF',
  },
  parentPickerItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  parentPickerItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  newFolderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default FolderPickerScreen;
