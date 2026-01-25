import React, { useState } from "react";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DropdownMenu from "./DropdownMenu";

const EllipsisMenuButton = ({ 
  onSelect, 
  onNewFolder, 
  onNewBookmark,
  viewMode,
  onViewModeChange 
}) => {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View>
      <TouchableOpacity
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
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
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
