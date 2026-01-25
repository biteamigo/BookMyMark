import React from "react";
import { View, StyleSheet, Modal, TouchableWithoutFeedback } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import MenuItem from "./MenuItem";

const DropdownMenu = ({ 
  visible, 
  onClose, 
  onSelect, 
  onNewFolder, 
  onNewBookmark,
  viewMode,
  onViewModeChange 
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.menuContainer}>
              <MenuItem
                icon={<Ionicons name="checkmark-circle-outline" size={24} color="#000" />}
                label="Select"
                onPress={() => {
                  onSelect?.();
                  onClose();
                }}
              />
              <View style={styles.divider} />
              <MenuItem
                icon={<MaterialCommunityIcons name="folder-plus-outline" size={24} color="#000" />}
                label="New Folder"
                onPress={() => {
                  onNewFolder?.();
                  onClose();
                }}
              />
              <View style={styles.divider} />
              <MenuItem
                icon={<MaterialCommunityIcons name="bookmark-plus-outline" size={24} color="#000" />}
                label="New Bookmark"
                onPress={() => {
                  onNewBookmark?.();
                  onClose();
                }}
              />
              
              {/* Separator for view mode options */}
              <View style={styles.thickDivider} />
              
              <MenuItem
                icon={<MaterialCommunityIcons name="view-grid-outline" size={24} color="#000" />}
                label="Grid"
                onPress={() => {
                  onViewModeChange?.('grid');
                  onClose();
                }}
                showCheckmark={viewMode === 'grid'}
              />
              <View style={styles.divider} />
              <MenuItem
                icon={<MaterialCommunityIcons name="view-list-outline" size={24} color="#000" />}
                label="List"
                onPress={() => {
                  onViewModeChange?.('list');
                  onClose();
                }}
                showCheckmark={viewMode === 'list'}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 100,
    paddingRight: 20,
  },
  menuContainer: {
    backgroundColor: "#fff",
    borderRadius: 14,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E0E0E0",
    marginLeft: 58,
  },
  thickDivider: {
    height: 8,
    backgroundColor: "#F2F2F7",
  },
});

export default DropdownMenu;
