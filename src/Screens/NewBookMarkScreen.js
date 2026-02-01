import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TagsInput from '../Components/TagsInput';
import { useDatabase } from '../Context/DatabaseContext';
import globalStyles from '../CSS/GlobalCss';

/**
 * NewBookmarkScreen
 * 
 * Full-screen form for creating bookmarks
 * @param {navigation} navigation - React Navigation object
 * @param {route} route - Route params: { currentFolderId: null }
 */
const NewBookmarkScreen = ({ navigation, route }) => {
  const { bookmarkRepository, folderRepository, tagRepository } = useDatabase();
  const { currentFolderId } = route.params || {};
  
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedFolderIds, setSelectedFolderIds] = useState(
    currentFolderId ? [currentFolderId] : []
  );
  const [tags, setTags] = useState([]);
  const [errors, setErrors] = useState({});
  const [allTags, setAllTags] = useState([]);

  useEffect(() => {
    // Load existing tags for autocomplete
    const existingTags = tagRepository.getAll().map(t => t.name);
    setAllTags(existingTags);
  }, []);

  const validateForm = () => {
    const newErrors = {};

    // Validate name
    if (!name.trim()) {
      newErrors.name = 'Bookmark name is required';
    } else if (name.length > 100) {
      newErrors.name = 'Name must be less than 100 characters';
    }

    // Validate URL
    if (!url.trim()) {
      newErrors.url = 'URL is required';
    } else {
      // Auto-prefix with https:// if no protocol
      let validUrl = url.trim();
      if (!validUrl.match(/^https?:\/\//i)) {
        validUrl = 'https://' + validUrl;
      }
      
      // Basic URL validation
      try {
        new URL(validUrl);
      } catch (e) {
        newErrors.url = 'Please enter a valid URL';
      }
    }

    // Validate at least one folder
    if (selectedFolderIds.length === 0) {
      newErrors.folders = 'Please select at least one folder';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    try {
      // Normalize URL
      let finalUrl = url.trim();
      if (!finalUrl.match(/^https?:\/\//i)) {
        finalUrl = 'https://' + finalUrl;
      }

      // Check if URL already exists
      if (bookmarkRepository.urlExists(finalUrl)) {
        Alert.alert(
          'Duplicate URL',
          'This URL already exists. Do you want to add it anyway?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Add Anyway', onPress: () => saveBookmark(finalUrl) }
          ]
        );
        return;
      }

      saveBookmark(finalUrl);
    } catch (error) {
      Alert.alert('Error', 'Failed to save bookmark. Please try again.');
      console.error('Save bookmark error:', error);
    }
  };

  const saveBookmark = (finalUrl) => {
    // Create bookmark
    const bookmark = bookmarkRepository.create(
      {
        name: name.trim(),
        url: finalUrl,
      },
      selectedFolderIds
    );

    // Add tags
    if (tags.length > 0) {
      tagRepository.setTagsForBookmark(bookmark.id, tags);
    }

    // Navigate back
    navigation.goBack();
  };

  const handleCancel = () => {
    if (name || url || tags.length > 0) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to cancel?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const openFolderPicker = () => {
    navigation.navigate('FolderPicker', {
      selectedFolderIds: selectedFolderIds,
      _onSelect: (ids) => {
        setSelectedFolderIds(ids);
        setErrors({ ...errors, folders: undefined });
      },
    });
  };

  const getSelectedFolderNames = () => {
    return selectedFolderIds
      .map(id => folderRepository.getById(id))
      .filter(Boolean)
      .map(f => f.name)
      .join(', ');
  };

  return (
    <SafeAreaView style={[globalStyles.pageView, styles.safeArea]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Form */}
        <ScrollView 
          style={styles.formContainer}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Card */}
          <View style={styles.headerCard}>
            <TouchableOpacity 
              onPress={handleCancel}
              style={styles.closeButton}
              testID="cancel-button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={32} color="#8E8E93" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Bookmark</Text>
            <TouchableOpacity 
              onPress={handleSave}
              testID="save-button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Bookmark Name */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldCard}>
              <View style={styles.fieldLabel}>
                <Ionicons name="bookmark-outline" size={20} color="#007AFF" />
                <Text style={styles.labelText}>Bookmark Name</Text>
                <Text style={styles.requiredText}>*</Text>
              </View>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                placeholder="Enter bookmark name..."
                placeholderTextColor="#999"
                maxLength={100}
                testID="name-input"
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>
          </View>

          {/* URL */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldCard}>
              <View style={styles.fieldLabel}>
                <Ionicons name="link-outline" size={20} color="#007AFF" />
                <Text style={styles.labelText}>URL</Text>
                <Text style={styles.requiredText}>*</Text>
              </View>
              <TextInput
                style={[styles.input, errors.url && styles.inputError]}
                value={url}
                onChangeText={(text) => {
                  setUrl(text);
                  if (errors.url) setErrors({ ...errors, url: undefined });
                }}
                placeholder="https://example.com"
                placeholderTextColor="#999"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                testID="url-input"
              />
              {errors.url && <Text style={styles.errorText}>{errors.url}</Text>}
            </View>
          </View>

          {/* Folders */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldCard}>
              <View style={styles.fieldLabel}>
                <Ionicons name="folder-open-outline" size={20} color="#007AFF" />
                <Text style={styles.labelText}>Add to Folders</Text>
                <Text style={styles.requiredText}>*</Text>
              </View>
              <TouchableOpacity
                style={[styles.pickerButton, errors.folders && styles.inputError]}
                onPress={openFolderPicker}
                testID="folder-picker-button"
              >
                <Text style={selectedFolderIds.length > 0 ? styles.pickerTextSelected : styles.pickerTextPlaceholder}>
                  {selectedFolderIds.length > 0 
                    ? getSelectedFolderNames()
                    : 'Select folders...'
                  }
                </Text>
                <View style={styles.pickerRight}>
                  {selectedFolderIds.length > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{selectedFolderIds.length}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color="#007AFF" />
                </View>
              </TouchableOpacity>
              {errors.folders && <Text style={styles.errorText}>{errors.folders}</Text>}
              <Text style={styles.helpText}>
                You can add this bookmark to multiple folders
              </Text>
            </View>
          </View>

          {/* Tags */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldCard}>
              <View style={styles.fieldLabel}>
                <Ionicons name="pricetag-outline" size={20} color="#007AFF" />
                <Text style={styles.labelText}>Tags</Text>
                <Text style={styles.optionalText}>(optional)</Text>
              </View>
              <TagsInput
                tags={tags}
                onChange={setTags}
                suggestions={allTags}
                placeholder="Add tag..."
              />
              <Text style={styles.helpText}>
                Tags help you find bookmarks faster
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 0,
  },
  closeButton: {
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  saveText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  formContent: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.08)',
  },
  fieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  labelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  requiredText: {
    fontSize: 15,
    color: '#FF3B30',
    marginLeft: 4,
  },
  optionalText: {
    fontSize: 13,
    color: '#999',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    borderWidth: 1.5,
    borderColor: '#E0E5ED',
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  pickerButton: {
    backgroundColor: '#F8FAFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  pickerTextPlaceholder: {
    fontSize: 16,
    color: '#999',
    flex: 1,
  },
  pickerTextSelected: {
    fontSize: 16,
    color: '#000',
    flex: 1,
    fontWeight: '500',
  },
  pickerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 8,
    minWidth: 32,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    marginTop: 8,
    marginLeft: 4,
    fontWeight: '500',
  },
  helpText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    marginLeft: 4,
  },
});

export default NewBookmarkScreen;
