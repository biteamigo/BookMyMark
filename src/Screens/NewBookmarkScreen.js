import React, { useState, useEffect, useRef } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePreventRemove } from '@react-navigation/native';
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
  const savedSuccessfullyRef = useRef(false);

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

  const handleSave = React.useCallback(() => {
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
    
    if (Object.keys(newErrors).length > 0) {
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
  }, [name, url, selectedFolderIds, tags, bookmarkRepository, tagRepository, navigation]);

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

    // Signal that we're leaving after save so usePreventRemove won't show "Discard Changes"
    savedSuccessfullyRef.current = true;
    navigation.goBack();
  };

  // Prevent going back with unsaved changes (unless we just saved)
  const hasUnsavedChanges = Boolean(name || url || tags.length > 0);

  usePreventRemove(hasUnsavedChanges, ({ data }) => {
    if (savedSuccessfullyRef.current) {
      navigation.dispatch(data.action);
      return;
    }
    Alert.alert(
      'Discard Changes?',
      'You have unsaved changes. Are you sure you want to go back?',
      [
        { text: 'Keep Editing', style: 'cancel', onPress: () => {} },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.dispatch(data.action)
        }
      ]
    );
  });

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

  // Set up navigation header (memoize to avoid re-creating on every render)
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image 
            source={require('../../assets/icon.png')} 
            style={{ width: 33, height: 25 }} 
          />
          <Text style={{ 
            fontFamily: 'NovaRound_400Regular', 
            fontSize: 17, 
            color: '#000',
            letterSpacing: 0.3,
            marginLeft: 2,
          }}>
            New Bookmark
          </Text>
        </View>
      ),
      headerRight: () => (
        <TouchableOpacity 
          onPress={handleSave}
          testID="save-button"
          style={{ 
            paddingVertical: 8,
            paddingLeft: 16,
            paddingRight: 8,
            marginRight: 8,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#007AFF' }}>
            Save
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleSave]);

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
          showsVerticalScrollIndicator={false}
        >
          {/* Main Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BASIC INFO</Text>
            
            {/* Bookmark Name */}
            <View style={styles.field}>
              <View style={styles.fieldHeader}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="create-outline" size={18} color="#007AFF" />
                  <Text style={styles.labelText}>Name</Text>
                  <Text style={styles.requiredText}>*</Text>
                </View>
              </View>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                placeholder="My favorite website..."
                placeholderTextColor="#A0A0A0"
                maxLength={100}
                testID="name-input"
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            {/* URL */}
            <View style={styles.field}>
              <View style={styles.fieldHeader}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="globe-outline" size={18} color="#007AFF" />
                  <Text style={styles.labelText}>Website URL</Text>
                  <Text style={styles.requiredText}>*</Text>
                </View>
              </View>
              <TextInput
                style={[styles.input, errors.url && styles.inputError]}
                value={url}
                onChangeText={(text) => {
                  setUrl(text);
                  if (errors.url) setErrors({ ...errors, url: undefined });
                }}
                placeholder="https://example.com"
                placeholderTextColor="#A0A0A0"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                testID="url-input"
              />
              {errors.url && <Text style={styles.errorText}>{errors.url}</Text>}
            </View>
          </View>

          {/* Organization Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ORGANIZATION</Text>
            
            {/* Folders */}
            <View style={styles.field}>
              <View style={styles.fieldHeader}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="folder-outline" size={18} color="#007AFF" />
                  <Text style={styles.labelText}>Folders</Text>
                  <Text style={styles.requiredText}>*</Text>
                </View>
                {selectedFolderIds.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{selectedFolderIds.length}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[styles.pickerButton, errors.folders && styles.inputError]}
                onPress={openFolderPicker}
                testID="folder-picker-button"
              >
                <Text style={selectedFolderIds.length > 0 ? styles.pickerTextSelected : styles.pickerTextPlaceholder}>
                  {selectedFolderIds.length > 0 
                    ? getSelectedFolderNames()
                    : 'Tap to select folders...'
                  }
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#007AFF" />
              </TouchableOpacity>
              {errors.folders && <Text style={styles.errorText}>{errors.folders}</Text>}
              <Text style={styles.helpText}>
                💡 Add to multiple folders for easy access
              </Text>
            </View>

            {/* Tags */}
            <View style={styles.field}>
              <View style={styles.fieldHeader}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="pricetags-outline" size={18} color="#007AFF" />
                  <Text style={styles.labelText}>Tags</Text>
                  <Text style={styles.optionalBadge}>Optional</Text>
                </View>
              </View>
              <TagsInput
                tags={tags}
                onChange={setTags}
                suggestions={allTags}
                placeholder="Add tags..."
              />
              <Text style={styles.helpText}>
                🔍 Use tags to find bookmarks faster
              </Text>
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    marginTop: 0,
  },
  container: {
    flex: 1,
  },
  // Form Styles
  formContainer: {
    flex: 1,
  },
  formContent: {
    paddingTop: 0,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 16,
    marginLeft: 4,
  },
  field: {
    marginBottom: 24,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  labelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  requiredText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  optionalBadge: {
    fontSize: 12,
    color: '#8E8E93',
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
    fontWeight: '500',
  },
  countBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // Input Styles
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 17,
    color: '#000',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.08)',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 1.5,
    backgroundColor: '#FFF5F5',
  },
  pickerButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.08)',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  pickerTextPlaceholder: {
    fontSize: 17,
    color: '#A0A0A0',
    flex: 1,
  },
  pickerTextSelected: {
    fontSize: 17,
    color: '#000',
    flex: 1,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 8,
    marginLeft: 4,
    fontWeight: '500',
  },
  helpText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    marginLeft: 4,
    lineHeight: 18,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default NewBookmarkScreen;
