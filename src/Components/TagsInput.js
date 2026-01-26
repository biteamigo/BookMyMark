import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * TagsInput Component
 * 
 * A chip-based tag input with autocomplete suggestions
 * @param {string[]} tags - Array of current tags
 * @param {Function} onChange - Callback when tags change
 * @param {string[]} suggestions - Array of suggested tags
 * @param {string} placeholder - Placeholder text
 */
const TagsInput = ({ tags = [], onChange, suggestions = [], placeholder = 'Add tag...' }) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filter suggestions based on input and exclude already added tags
  const filteredSuggestions = suggestions
    .filter(s => 
      s.toLowerCase().includes(inputValue.toLowerCase()) && 
      !tags.includes(s)
    )
    .slice(0, 5); // Limit to 5 suggestions

  const addTag = (tag) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onChange([...tags, trimmedTag]);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const removeTag = (tagToRemove) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  const handleInputChange = (text) => {
    setInputValue(text);
    setShowSuggestions(text.length > 0);
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  return (
    <View style={styles.container}>
      {/* Tags Display */}
      {tags.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tagsContainer}
          contentContainerStyle={styles.tagsContent}
        >
          {tags.map((tag, index) => (
            <View key={index} style={styles.chip}>
              <Text style={styles.chipText}>{tag}</Text>
              <TouchableOpacity 
                onPress={() => removeTag(tag)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                testID={`remove-tag-${tag}`}
              >
                <Ionicons name="close-circle" size={18} color="#666" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Input Field */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={handleInputChange}
          onSubmitEditing={handleSubmit}
          placeholder={placeholder}
          placeholderTextColor="#999"
          returnKeyType="done"
          testID="tag-input"
        />
        {inputValue.length > 0 && (
          <TouchableOpacity 
            onPress={handleSubmit}
            style={styles.addButton}
            testID="add-tag-button"
          >
            <Ionicons name="add-circle" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Autocomplete Suggestions */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {filteredSuggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => addTag(suggestion)}
              testID={`suggestion-${suggestion}`}
            >
              <Ionicons name="pricetag-outline" size={16} color="#666" />
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  tagsContainer: {
    marginBottom: 12,
    maxHeight: 50,
  },
  tagsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FF',
    borderRadius: 18,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#C7E3FF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  chipText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 6,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#E0E5ED',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 4,
  },
  addButton: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    marginTop: 12,
    backgroundColor: '#FFF',
    borderRadius: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.1)',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    fontWeight: '500',
  },
});

export default TagsInput;
