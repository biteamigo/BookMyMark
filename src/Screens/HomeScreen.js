import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Text,
} from "react-native";
import SearchBar from "../Components/SearchBar";
import { Ionicons } from "@expo/vector-icons";
import { DEFAULT_CATEGORIES } from "../Utils/Constants";
import { ScrollView } from "react-native-gesture-handler";

const HomeScreen = (props) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  return (
    <View style={styles.pageView}>
      <Text>version7</Text>
      <SearchBar
        searchTerm={searchTerm}
        onSearchTermChange={(newSearchTerm) => {
          setSearchTerm(newSearchTerm);
        }}
        onSumbit={() => {
          getAPIResults(searchTerm);
        }}
      />

      <ScrollView>
        <FlatList
          showsHorizontalScrollIndicator={false}
          horizontal={true}
          data={categories}
          contentContainerStyle={styles.listContents}
          renderItem={({ item }) => {
            return (
              <View style={styles.folderStyle}>
                <TouchableOpacity>
                  <Ionicons
                    name="folder-outline"
                    size={100}
                    style={styles.iconStyle}
                  />
                  <Text style={styles.categoryTextStyle}>{item}</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          keyExtractor={(item) => {
            return item;
          }}
        />
      </ScrollView>
      <TouchableOpacity
        style={styles.newFolderButtonStyle}
        onPress={() => {
          return props.navigation.navigate("NewFolder");
        }}
      >
        <Image
          source={require("../../assets/plusSign.png")}
          style={styles.plusSignStyle}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  plusSignStyle: {
    width: 70,
    height: 70,
  },

  newFolderButtonStyle: {
    position: "absolute",
    right: 40,
    bottom: 100,
  },
  folderStyle: {
    padding: 30,
  },
  listContents: {
    flexDirection: "row",
    width: "100%",
    flexWrap: "wrap",
    // alignItems: 'center',
    // justifyContent: 'center',
  },

  iconStyle: {
    textShadowOffset: { width: 2, height: 2 },
    shadowColor: "#000000",
    shadowOpacity: 0.3,
    color: "orange",
  },

  pageView: { flex: 1, margin: 30 },

  categoryTextStyle: {
    fontSize: 18,
    alignContent: "center"
  }
});

export default HomeScreen;
