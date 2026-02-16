import React, { useState } from "react";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DropdownMenu from "./DropdownMenu";

const EllipsisMenuButton = ({ 
  onSelect, 
  onNewFolder, 
  onNewBookmark,
  onDelete,
  onEdit,
  viewMode,
  onViewModeChange,
  isSelectionMode,
  selectedCount 
}) => {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View>
      <TouchableOpacity
        testID="header-menu"
        style={styles.button}
        onPress={() => setMenuVisible(true)}
      >
        <View style={styles.iconBackground}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#000" />
        </View>
      </TouchableOpacity>
      
      <DropdownMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onSelect={onSelect}
        onNewFolder={onNewFolder}
        onNewBookmark={onNewBookmark}
        onDelete={onDelete}
        onEdit={onEdit}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        isSelectionMode={isSelectionMode}
        selectedCount={selectedCount}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
  },
  iconBackground: {
    justifyContent: "center",
    alignItems: "center",
  },
});

export default EllipsisMenuButton;
