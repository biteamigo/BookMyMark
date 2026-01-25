import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { NavigationContainer, useNavigation, useRoute } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FolderViewScreen from "./src/Screens/FolderViewScreen.js";
import NewFolderScreen from "./src/Screens/NewFolderScreen.js";
import DebugScreen from "./src/Screens/DebugScreen.js";
import EllipsisMenuButton from "./src/Components/EllipsisMenuButton.js";
import DebugButton from "./src/Components/DebugButton.js";
import { DatabaseProvider } from "./src/Context/DatabaseContext.js";
import { FolderProvider, useFolders } from "./src/Context/FolderContext.js";

const Stack = createNativeStackNavigator();

const HeaderTitle = () => (
  <View style={styles.headerViewStyle}>
    <Image source={require("./assets/icon.png")} style={{width:33,height:25}} />
    <Image source={require("./assets/bookMyMark.png")} style={{width:120,height:22}} />
  </View>
);

const HeaderRight = ({ route }) => {
  const { addFolder } = useFolders();
  const navigation = useNavigation();
  
  // Get view mode from route options (set by FolderViewScreen)
  const viewMode = route?.params?.viewMode || 'grid';
  const onViewModeChange = route?.params?.onViewModeChange;
  
  return (
    <View style={styles.headerRightContainer}>
      <DebugButton onPress={() => navigation.navigate("Debug")} />
      <EllipsisMenuButton
        onSelect={() => console.log("Select pressed")}
        onNewFolder={addFolder}
        onNewBookmark={() => console.log("New Bookmark pressed")}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
    </View>
  );
};

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="FolderView"
      screenOptions={({ route }) => ({
        headerTitle: () => <HeaderTitle />,
        headerRight: () => <HeaderRight route={route} />,
      })}
    >
      <Stack.Screen 
        name="FolderView" 
        component={FolderViewScreen}
        initialParams={{ folderId: null }}
        options={{
          title: "BookMyMark"
        }}
      />
      <Stack.Screen name="NewFolder" component={NewFolderScreen} />
      <Stack.Screen 
        name="Debug" 
        component={DebugScreen}
        options={{
          headerTitle: () => null,
          title: "Debug",
        }}
      />
    </Stack.Navigator>
  );
};

const App = () => {
  return (
    <DatabaseProvider>
      <FolderProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </FolderProvider>
    </DatabaseProvider>
  );
};

const styles = StyleSheet.create({
  headerViewStyle: {
    flexDirection: 'row',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default App;
