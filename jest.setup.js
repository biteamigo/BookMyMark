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
      setOptions: jest.fn(),
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
    // Handle DROP/CREATE table operations (including FTS)
    if (sql.includes("DROP TABLE") || sql.includes("CREATE TABLE") || sql.includes("CREATE INDEX") || sql.includes("CREATE TRIGGER") || sql.includes("CREATE VIRTUAL TABLE")) {
      return;
    }
    // Handle INSERT INTO FTS tables
    if (sql.includes("INSERT INTO folders_fts") || sql.includes("INSERT INTO bookmarks_fts")) {
      return; // FTS tables auto-managed by triggers
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
    // FOLDERS
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
    
    // BOOKMARKS
    if (sql.includes("INSERT INTO bookmarks")) {
      const bookmark = {
        id: params[0],
        name: params[1],
        url: params[2],
        favicon: params[3],
        createdAt: params[4],
        updatedAt: params[5],
      };
      mockDbData.bookmarks.push(bookmark);
      return { changes: 1 };
    }
    if (sql.includes("UPDATE bookmarks")) {
      const id = params[4];
      const index = mockDbData.bookmarks.findIndex(b => b.id === id);
      if (index !== -1) {
        mockDbData.bookmarks[index] = {
          ...mockDbData.bookmarks[index],
          name: params[0],
          url: params[1],
          favicon: params[2],
          updatedAt: params[3],
        };
      }
      return { changes: index !== -1 ? 1 : 0 };
    }
    if (sql.includes("DELETE FROM bookmarks")) {
      const id = params[0];
      const initialLength = mockDbData.bookmarks.length;
      mockDbData.bookmarks = mockDbData.bookmarks.filter(b => b.id !== id);
      return { changes: initialLength - mockDbData.bookmarks.length };
    }
    
    // FOLDER_BOOKMARKS (junction table)
    if (sql.includes("INSERT INTO folder_bookmarks") || sql.includes("INSERT OR IGNORE INTO folder_bookmarks")) {
      const fb = {
        folderId: params[0],
        bookmarkId: params[1],
        addedAt: params[2],
      };
      // Check if already exists
      const exists = mockDbData.folder_bookmarks.some(
        item => item.folderId === fb.folderId && item.bookmarkId === fb.bookmarkId
      );
      if (!exists) {
        mockDbData.folder_bookmarks.push(fb);
      }
      return { changes: exists ? 0 : 1 };
    }
    if (sql.includes("DELETE FROM folder_bookmarks")) {
      const initialLength = mockDbData.folder_bookmarks.length;
      mockDbData.folder_bookmarks = mockDbData.folder_bookmarks.filter(
        fb => !(fb.bookmarkId === params[0] && fb.folderId === params[1])
      );
      return { changes: initialLength - mockDbData.folder_bookmarks.length };
    }
    
    // TAGS
    if (sql.includes("INSERT INTO tags")) {
      const tag = {
        id: params[0],
        name: params[1],
        createdAt: params[2],
      };
      mockDbData.tags.push(tag);
      return { changes: 1 };
    }
    
    // BOOKMARK_TAGS (junction table)
    if (sql.includes("INSERT INTO bookmark_tags") || sql.includes("INSERT OR IGNORE INTO bookmark_tags")) {
      const bt = {
        bookmarkId: params[0],
        tagId: params[1],
      };
      const exists = mockDbData.bookmark_tags.some(
        item => item.bookmarkId === bt.bookmarkId && item.tagId === bt.tagId
      );
      if (!exists) {
        mockDbData.bookmark_tags.push(bt);
      }
      return { changes: exists ? 0 : 1 };
    }
    if (sql.includes("DELETE FROM bookmark_tags WHERE bookmarkId")) {
      const initialLength = mockDbData.bookmark_tags.length;
      mockDbData.bookmark_tags = mockDbData.bookmark_tags.filter(
        bt => bt.bookmarkId !== params[0]
      );
      return { changes: initialLength - mockDbData.bookmark_tags.length };
    }
    
    return { changes: 0 };
  }),
  getAllSync: jest.fn((sql, params) => {
    // FTS5 queries will throw errors, so catch and return empty
    if (sql.includes("folders_fts") || sql.includes("bookmarks_fts") || sql.includes("MATCH")) {
      // Throw error to trigger fallback to LIKE
      throw new Error("FTS5 not available in test environment");
    }
    
    // FOLDER SEARCH with LIKE (fallback)
    if (sql.includes("FROM folders") && sql.includes("LIKE")) {
      const pattern = params?.[0];
      if (pattern) {
        // Convert SQL LIKE pattern to regex
        const searchTerm = pattern.replace(/%/g, '');
        return mockDbData.folders.filter(f => 
          f.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      return mockDbData.folders;
    }
    // FOLDER queries (general)
    if (sql.includes("FROM folders")) {
      return mockDbData.folders;
    }
    // BOOKMARK BY FOLDER
    if (sql.includes("FROM bookmarks b") && sql.includes("folder_bookmarks fb")) {
      const folderId = params?.[0];
      const bookmarkIds = mockDbData.folder_bookmarks
        .filter(fb => fb.folderId === folderId)
        .map(fb => fb.bookmarkId);
      return mockDbData.bookmarks.filter(b => bookmarkIds.includes(b.id));
    }
    // BOOKMARK SEARCH with LIKE
    if (sql.includes("FROM bookmarks") && sql.includes("LIKE")) {
      const pattern = params?.[0];
      if (pattern) {
        const searchTerm = pattern.replace(/%/g, '');
        return mockDbData.bookmarks.filter(b => 
          b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.url.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      return mockDbData.bookmarks;
    }
    // BOOKMARKS (general)
    if (sql.includes("FROM bookmarks")) {
      return mockDbData.bookmarks;
    }
    // TAGS
    if (sql.includes("FROM tags")) {
      return mockDbData.tags;
    }
    // FOLDER_BOOKMARKS
    if (sql.includes("FROM folder_bookmarks")) {
      return mockDbData.folder_bookmarks;
    }
    return [];
  }),
  getFirstSync: jest.fn((sql, params) => {
    if (sql.includes("COUNT(*)")) {
      if (sql.includes("FROM bookmarks WHERE url")) {
        // urlExists check
        const count = mockDbData.bookmarks.filter(b => b.url === params?.[0]).length;
        return { count };
      }
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
    if (sql.includes("FROM bookmarks WHERE id")) {
      return mockDbData.bookmarks.find(b => b.id === params[0]) || null;
    }
    if (sql.includes("FROM tags WHERE name")) {
      return mockDbData.tags.find(t => t.name === params[0]) || null;
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

// Mock expo-splash-screen
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

// Mock expo-google-fonts
jest.mock("@expo-google-fonts/nova-round", () => ({
  useFonts: jest.fn(() => [true, null]),
  NovaRound_400Regular: "NovaRound_400Regular",
}));

// Silence console warnings during tests
jest.spyOn(console, "warn").mockImplementation(() => {});
jest.spyOn(console, "log").mockImplementation(() => {});
