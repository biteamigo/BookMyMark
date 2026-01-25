/**
 * Debug Button - Shows only in development mode
 * Provides quick access to the debug screen
 */
import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const DebugButton = ({ onPress }) => {
  // Only show in development mode
  if (!__DEV__) {
    return null;
  }

  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Ionicons name="bug-outline" size={22} color="#FF9500" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
    marginRight: 8,
  },
});

export default DebugButton;
