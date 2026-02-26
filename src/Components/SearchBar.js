import React from "react";
import { View, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const SearchBar = (props) => {
  return (
    <View style={styles.backgroundStyle}>
      <Ionicons name="search" style={styles.IconStyle} />
      <TextInput
        testID="search-input"
        placeholder="Search"
        placeholderTextColor="#999"
        style={styles.InputStyle}
        value={props.searchTerm}
        onChangeText={(newSearchTerm) => {
          props.onSearchTermChange(newSearchTerm);
        }}
        onEndEditing={() => {
          props.onSubmit();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  backgroundStyle: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    height: 50,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "rgba(224, 224, 224, 0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  InputStyle: {
    fontSize: 18,
    marginLeft: 10,
    flex: 1,
    color: "#333",
  },
  IconStyle: {
    fontSize: 22,
    color: "#666",
  },
});

export default SearchBar;
