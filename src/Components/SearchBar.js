import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { TextInput } from "react-native-gesture-handler";

const SearchBar = (props) => {
  return (
    <View style={styles.backgroundStyle}>
      <FontAwesome name="search" style={styles.IconStyle} />
      <TextInput
        placeholder="Search"
        style={styles.InputStyle}
        value={props.searchTerm}
        onChangeText={(newSearchTerm) => {
          props.onSearchTermChange(newSearchTerm);
        }}
        onEndEditing={() => {
          props.onSumbit();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  backgroundStyle: {
    backgroundColor: "#D3D3D3",
    height: 50,
    borderRadius: 5,
    //margin: 30,
    flexDirection: "row",
  },
  InputStyle: {
    fontSize: 20,
    marginHorizontal: 10,
    flex: 1,
  },
  IconStyle: {
    alignSelf: "center",
    fontSize: 30,
    marginHorizontal: 10,
  },
});

export default SearchBar;
