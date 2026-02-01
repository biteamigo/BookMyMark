import React from "react";
import { TouchableOpacity, Text, StyleSheet, View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const MenuItem = ({ icon, label, onPress, imageSource, showCheckmark, disabled, textColor }) => {
  return (
    <TouchableOpacity 
      style={[styles.container, disabled && styles.disabled]} 
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.iconContainer}>
        {imageSource ? (
          <Image source={imageSource} style={styles.image} />
        ) : (
          icon
        )}
      </View>
      <Text style={[styles.label, textColor && { color: textColor }]}>{label}</Text>
      {showCheckmark && (
        <Ionicons name="checkmark" size={20} color="#007AFF" style={styles.checkmark} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 30,
    alignItems: "center",
    marginRight: 12,
  },
  image: {
    width: 28,
    height: 28,
    resizeMode: "contain",
  },
  label: {
    fontSize: 17,
    color: "#000",
    flex: 1,
  },
  checkmark: {
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default MenuItem;
