import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFolders } from "../Context/FolderContext";

const BottomActionBar = ({ currentFolderId, onSelect, onNewBookmark }) => {
  const { addFolder } = useFolders();

  const handleNewFolder = () => {
    addFolder(currentFolderId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={onSelect}
        >
          <Ionicons name="checkmark-circle-outline" size={24} color="#000" />
          <Text style={styles.actionText}>Select</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handleNewFolder}
        >
          <MaterialCommunityIcons name="folder-plus-outline" size={24} color="#000" />
          <Text style={styles.actionText}>New Folder</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={onNewBookmark}
        >
          <MaterialCommunityIcons name="bookmark-plus-outline" size={24} color="#000" />
          <Text style={styles.actionText}>New Bookmark</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 245, 247, 0.75)",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  actionButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    width: 95,
  },
  actionText: {
    fontSize: 12,
    color: "#000",
    marginTop: 4,
    fontWeight: "600",
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
    backgroundColor: "#C0C0C0",
  },
});

export default BottomActionBar;
