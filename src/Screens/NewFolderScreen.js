import React, { useState } from "react";
import { Text, StyleSheet, TextInput } from "react-native";

const NewFolderScreen = () => {
    return <>
    <Text> Create New Folder</Text>
    <TextInput style= {styles.InputStyle} dplaceholder="Foler Name"></TextInput>
    
    </>
}

const styles = StyleSheet.create({
    backgroundStyle: {
      backgroundColor: "#D3D3D3",
      height: 50,
      borderRadius: 5,
      margin: 30,
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

  export default NewFolderScreen;