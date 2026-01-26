import React from "react";
import { View, StyleSheet, Image, Text, Platform } from "react-native";
import { NavigationContainer, useNavigation, useRoute } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useFonts, NovaRound_400Regular } from '@expo-google-fonts/nova-round';
import * as SplashScreen from 'expo-splash-screen';
import FolderViewScreen from "./src/Screens/FolderViewScreen.js";
import NewFolderScreen from "./src/Screens/NewFolderScreen.js";
import NewBookmarkScreen from "./src/Screens/NewBookmarkScreen.js";
import FolderPickerScreen from "./src/Screens/FolderPickerScreen.js";
import DebugScreen from "./src/Screens/DebugScreen.js";
import EllipsisMenuButton from "./src/Components/EllipsisMenuButton.js";
import DebugButton from "./src/Components/DebugButton.js";
import { DatabaseProvider } from "./src/Context/DatabaseContext.js";
import { FolderProvider, useFolders } from "./src/Context/FolderContext.js";

// Keep the splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

const HeaderTitle = ({ route }) => {
  const folderName = route?.params?.folderName;
  const isRoot = !folderName;

  if (isRoot) {
    // Root level - show logo
    return (
      <View style={styles.headerViewStyle}>
        <Image source={require("./assets/icon.png")} style={{width:33,height:25}} />
        <Image source={require("./assets/bookMyMark.png")} style={{width:120,height:22}} />
      </View>
    );
  }

  // Subfolder - show icon + folder name
  return (
    <View style={styles.headerViewStyle}>
      <Image source={require("./assets/icon.png")} style={{width:33,height:25}} />
      <Text 
        style={styles.folderNameText}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {folderName}
      </Text>
    </View>
  );
};

const HeaderRight = ({ route }) => {
  const { addFolder } = useFolders();
  const navigation = useNavigation();
  
  // Get view mode and current folder from route params
  const viewMode = route?.params?.viewMode || 'grid';
  const currentFolderId = route?.params?.folderId || null;
  
  // Handler to change view mode via navigation params (serializable)
  const handleViewModeChange = React.useCallback((newMode) => {
    navigation.setParams({ viewMode: newMode });
  }, [navigation]);
  
  const handleNewBookmark = () => {
    navigation.navigate('NewBookmark', { currentFolderId });
  };
  
  return (
    <View style={styles.headerRightContainer}>
      <DebugButton onPress={() => navigation.navigate("Debug")} />
      <EllipsisMenuButton
        onSelect={() => console.log("Select pressed")}
        onNewFolder={addFolder}
        onNewBookmark={handleNewBookmark}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />
    </View>
  );
};

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="FolderView"
      screenOptions={({ route }) => ({
        headerTitle: () => <HeaderTitle route={route} />,
        headerRight: () => <HeaderRight route={route} />,
        headerBackTitleVisible: false,
        title: '', // Set empty title by default
      })}
    >
      <Stack.Screen 
        name="FolderView" 
        component={FolderViewScreen}
        initialParams={{ folderId: null }}
      />
      <Stack.Screen name="NewFolder" component={NewFolderScreen} />
      <Stack.Screen 
        name="NewBookmark" 
        component={NewBookmarkScreen}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen 
        name="FolderPicker" 
        component={FolderPickerScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
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
  const [fontsLoaded, fontError] = useFonts({
    NovaRound_400Regular,
  });

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

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
    alignItems: 'center',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderNameText: {
    fontSize: 17,
    fontFamily: 'NovaRound_400Regular',
    color: '#000',
    marginLeft: 2,
    maxWidth: 200,
    letterSpacing: 0.3,
  },
});

export default App;
