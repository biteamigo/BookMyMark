import { createAppContainer } from "react-navigation";
import { createStackNavigator } from "react-navigation-stack";
import HomeScreen from "./src/Screens/HomeScreen.js";
import NewFolderScreen from "./src/Screens/NewFolderScreen.js";
import { View, StyleSheet, Image } from "react-native";

const navigator = createStackNavigator(
  {
    Home: HomeScreen,
    NewFolder: NewFolderScreen
  },
  {
    initialRouteName: "Home",
    defaultNavigationOptions: {
      headerTitle: () => {
        return (<View style={styles.headerViewStyle}>
          <Image source={require("./assets/icon.png")} style={{width:33,height:25 }} />
          <Image source={require("./assets/bookMyMark.png")} style={{width:120,height:22 }} />
          </View>
        );
      },
    },
  }
);

const styles = StyleSheet.create({
  headerViewStyle: {
    flexDirection: 'row'
  },
  headerTextStyle: {
    fontSize: 20,
    color: 'orange'
  }
});

export default createAppContainer(navigator);
