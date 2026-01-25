// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  return {
    Ionicons: (props) => React.createElement("Ionicons", props),
    MaterialCommunityIcons: (props) => React.createElement("MaterialCommunityIcons", props),
    FontAwesome: (props) => React.createElement("FontAwesome", props),
  };
});

// Mock @react-navigation/native
jest.mock("@react-navigation/native", () => {
  const actualNav = jest.requireActual("@react-navigation/native");
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setParams: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    NavigationContainer: ({ children }) => children,
  };
});

// Mock @react-navigation/native-stack
jest.mock("@react-navigation/native-stack", () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

// Mock expo-sqlite for testing
const mockDbData = {
  folders: [],
  bookmarks: [],
  tags: [],
  folder_bookmarks: [],
  bookmark_tags: [],
};

const createMockDatabase = () => ({
  execSync: jest.fn((sql) => {
    // Handle DROP/CREATE table operations
    if (sql.includes("DROP TABLE") || sql.includes("CREATE TABLE") || sql.includes("CREATE INDEX")) {
      return;
    }
    // Handle DELETE operations
    if (sql.includes("DELETE FROM")) {
      const tableName = sql.match(/DELETE FROM (\w+)/)?.[1];
      if (tableName && mockDbData[tableName]) {
        mockDbData[tableName] = [];
      }
    }
  }),
  runSync: jest.fn((sql, params) => {
    if (sql.includes("INSERT INTO folders")) {
      const folder = {
        id: params[0],
        name: params[1],
        parentId: params[2],
        icon: params[3],
        createdAt: params[4],
        updatedAt: params[5],
      };
      mockDbData.folders.push(folder);
      return { changes: 1 };
    }
    if (sql.includes("UPDATE folders")) {
      const id = params[4];
      const index = mockDbData.folders.findIndex(f => f.id === id);
      if (index !== -1) {
        mockDbData.folders[index] = {
          ...mockDbData.folders[index],
          name: params[0],
          parentId: params[1],
          icon: params[2],
          updatedAt: params[3],
        };
      }
      return { changes: index !== -1 ? 1 : 0 };
    }
    if (sql.includes("DELETE FROM folders")) {
      const id = params[0];
      const initialLength = mockDbData.folders.length;
      mockDbData.folders = mockDbData.folders.filter(f => f.id !== id);
      return { changes: initialLength - mockDbData.folders.length };
    }
    return { changes: 0 };
  }),
  getAllSync: jest.fn((sql, params) => {
    if (sql.includes("FROM folders")) {
      return mockDbData.folders;
    }
    if (sql.includes("FROM bookmarks")) {
      return mockDbData.bookmarks;
    }
    if (sql.includes("FROM tags")) {
      return mockDbData.tags;
    }
    return [];
  }),
  getFirstSync: jest.fn((sql, params) => {
    if (sql.includes("COUNT(*)")) {
      const tableName = sql.match(/FROM (\w+)/)?.[1];
      if (tableName && mockDbData[tableName]) {
        return { count: mockDbData[tableName].length };
      }
      return { count: 0 };
    }
    if (sql.includes("FROM folders WHERE id")) {
      return mockDbData.folders.find(f => f.id === params[0]) || null;
    }
    if (sql.includes("FROM folders WHERE name")) {
      return mockDbData.folders.find(f => f.name === params[0]) || null;
    }
    return null;
  }),
});

// Reset mock data before each test
beforeEach(() => {
  mockDbData.folders = [];
  mockDbData.bookmarks = [];
  mockDbData.tags = [];
  mockDbData.folder_bookmarks = [];
  mockDbData.bookmark_tags = [];
});

jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn(() => createMockDatabase()),
}));

// Silence console warnings during tests
jest.spyOn(console, "warn").mockImplementation(() => {});
jest.spyOn(console, "log").mockImplementation(() => {});
