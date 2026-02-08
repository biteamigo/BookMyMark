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
    useFocusEffect: jest.fn(() => {
      // No-op in tests to avoid infinite loops
      // The initial useEffect will handle data loading
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
      const initialLength = mockDbData.folders.length;
      if (sql.includes("IN (")) {
        const ids = params || [];
        mockDbData.folders = mockDbData.folders.filter(f => !ids.includes(f.id));
      } else {
        const id = params[0];
        mockDbData.folders = mockDbData.folders.filter(f => f.id !== id);
      }
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
      const initialLength = mockDbData.bookmarks.length;
      const id = params[0];
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
      if (sql.includes("IN (")) {
        const folderIds = params || [];
        mockDbData.folder_bookmarks = mockDbData.folder_bookmarks.filter(
          fb => !folderIds.includes(fb.folderId)
        );
      } else {
        mockDbData.folder_bookmarks = mockDbData.folder_bookmarks.filter(
          fb => !(fb.bookmarkId === params[0] && fb.folderId === params[1])
        );
      }
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
    
    // FOLDER SEARCH with LIKE scoped by parentId (searchInFolder fallback, single level)
    if (sql.includes("FROM folders") && sql.includes("LIKE") && (sql.includes("parentId IS NULL") || sql.includes("parentId = ?"))) {
      const pattern = params?.[0];
      const parentId = params?.length === 2 ? params[1] : null;
      const searchTerm = pattern ? pattern.replace(/%/g, '').toLowerCase() : '';
      return mockDbData.folders.filter(f => {
        const nameMatch = !searchTerm || (f.name && f.name.toLowerCase().includes(searchTerm));
        const parentMatch = parentId === null || parentId === undefined
          ? (f.parentId == null || f.parentId === undefined)
          : (f.parentId === parentId);
        return nameMatch && parentMatch;
      });
    }
    // FOLDER SEARCH with id IN (searchInFolder recursive: match name and id in descendant list)
    if (sql.includes("FROM folders") && sql.includes("LIKE") && sql.includes("id IN (")) {
      const pattern = params?.[0];
      const ids = (params && params.length > 1) ? params.slice(1) : [];
      const searchTerm = pattern ? pattern.replace(/%/g, '').toLowerCase() : '';
      return mockDbData.folders.filter(f =>
        ids.includes(f.id) && (!searchTerm || (f.name && f.name.toLowerCase().includes(searchTerm)))
      );
    }
    // FOLDER SEARCH with LIKE (fallback, global)
    if (sql.includes("FROM folders") && sql.includes("LIKE")) {
      const pattern = params?.[0];
      if (pattern) {
        const searchTerm = pattern.replace(/%/g, '');
        return mockDbData.folders.filter(f =>
          f.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      return mockDbData.folders;
    }
    // FOLDER queries - root (parentId IS NULL)
    if (sql.includes("FROM folders") && sql.includes("parentId IS NULL")) {
      return mockDbData.folders.filter(f => f.parentId == null || f.parentId === undefined);
    }
    // FOLDER queries - subfolders (parentId = ?)
    if (sql.includes("FROM folders") && sql.includes("parentId = ?") && params && params[0] !== undefined) {
      return mockDbData.folders.filter(f => f.parentId === params[0]);
    }
    // FOLDER queries (general)
    if (sql.includes("FROM folders")) {
      return mockDbData.folders;
    }
    // getFolders(bookmarkId): SELECT folderId FROM folder_bookmarks WHERE bookmarkId = ?
    if (sql.includes("folder_bookmarks") && sql.includes("WHERE bookmarkId = ?") && params && params.length === 1 && !sql.includes("NOT IN")) {
      return mockDbData.folder_bookmarks
        .filter(fb => fb.bookmarkId === params[0])
        .map(fb => ({ folderId: fb.folderId }));
    }
    // BOOKMARK SEARCH IN FOLDER with folderId IN (searchInFolder recursive: multiple folder IDs + 3x pattern)
    if (sql.includes("FROM bookmarks b") && sql.includes("folder_bookmarks fb") && sql.includes("folderId IN (") && params && params.length >= 4) {
      const numFolderIds = params.length - 3;
      const folderIds = params.slice(0, numFolderIds);
      const pattern = params[numFolderIds];
      const searchTerm = pattern ? pattern.replace(/%/g, '').toLowerCase() : '';
      const bookmarkIdsInFolders = new Set(
        mockDbData.folder_bookmarks
          .filter(fb => folderIds.includes(fb.folderId))
          .map(fb => fb.bookmarkId)
      );
      const bookmarksInFolders = mockDbData.bookmarks.filter(b => bookmarkIdsInFolders.has(b.id));
      if (!searchTerm) return bookmarksInFolders;
      const nameOrUrlMatch = bookmarksInFolders.filter(b =>
        (b.name && b.name.toLowerCase().includes(searchTerm)) ||
        (b.url && b.url.toLowerCase().includes(searchTerm))
      );
      const tagMatchBookmarkIds = new Set();
      mockDbData.bookmark_tags.forEach(bt => {
        if (!bookmarkIdsInFolders.has(bt.bookmarkId)) return;
        const tag = mockDbData.tags.find(t => t.id === bt.tagId);
        if (tag && tag.name && tag.name.toLowerCase().includes(searchTerm)) {
          tagMatchBookmarkIds.add(bt.bookmarkId);
        }
      });
      const tagMatchBookmarks = mockDbData.bookmarks.filter(b => tagMatchBookmarkIds.has(b.id));
      const seen = new Set();
      const combined = [];
      for (const b of [...nameOrUrlMatch, ...tagMatchBookmarks]) {
        if (!seen.has(b.id)) {
          seen.add(b.id);
          combined.push(b);
        }
      }
      return combined;
    }
    // BOOKMARK SEARCH IN FOLDER (searchInFolder LIKE fallback: single folderId + 3x pattern)
    if (sql.includes("FROM bookmarks b") && sql.includes("folder_bookmarks fb") && sql.includes("b.name LIKE") && !sql.includes("folderId IN (") && params && params.length >= 4) {
      const folderId = params[0];
      const pattern = params[1];
      const searchTerm = pattern ? pattern.replace(/%/g, '').toLowerCase() : '';
      const bookmarkIdsInFolder = new Set(
        mockDbData.folder_bookmarks
          .filter(fb => fb.folderId === folderId)
          .map(fb => fb.bookmarkId)
      );
      const bookmarksInFolder = mockDbData.bookmarks.filter(b => bookmarkIdsInFolder.has(b.id));
      if (!searchTerm) return bookmarksInFolder;
      const nameOrUrlMatch = bookmarksInFolder.filter(b =>
        (b.name && b.name.toLowerCase().includes(searchTerm)) ||
        (b.url && b.url.toLowerCase().includes(searchTerm))
      );
      const tagMatchBookmarkIds = new Set();
      mockDbData.bookmark_tags.forEach(bt => {
        if (!bookmarkIdsInFolder.has(bt.bookmarkId)) return;
        const tag = mockDbData.tags.find(t => t.id === bt.tagId);
        if (tag && tag.name && tag.name.toLowerCase().includes(searchTerm)) {
          tagMatchBookmarkIds.add(bt.bookmarkId);
        }
      });
      const tagMatchBookmarks = mockDbData.bookmarks.filter(b => tagMatchBookmarkIds.has(b.id));
      const seen = new Set();
      const combined = [];
      for (const b of [...nameOrUrlMatch, ...tagMatchBookmarks]) {
        if (!seen.has(b.id)) {
          seen.add(b.id);
          combined.push(b);
        }
      }
      return combined;
    }
    // countFolderContents: SELECT DISTINCT b.id ... WHERE fb.folderId = ?
    if (sql.includes("folder_bookmarks") && sql.includes("bookmarks b") && params && params.length === 1) {
      const folderId = params[0];
      const ids = [...new Set(
        mockDbData.folder_bookmarks
          .filter(fb => fb.folderId === folderId)
          .map(fb => fb.bookmarkId)
      )];
      return ids.map(id => ({ id }));
    }
    // cascadeDelete: SELECT DISTINCT bookmarkId FROM folder_bookmarks WHERE folderId IN (...)
    if (sql.includes("folder_bookmarks") && sql.includes("bookmarkId") && sql.includes("IN (")) {
      const folderIds = params || [];
      const out = [];
      const seen = new Set();
      mockDbData.folder_bookmarks
        .filter(fb => folderIds.includes(fb.folderId))
        .forEach(fb => {
          if (!seen.has(fb.bookmarkId)) {
            seen.add(fb.bookmarkId);
            out.push({ bookmarkId: fb.bookmarkId });
          }
        });
      return out;
    }
    // cascadeDelete: SELECT folderId FROM folder_bookmarks WHERE bookmarkId = ? AND folderId NOT IN (...)
    if (sql.includes("folder_bookmarks") && sql.includes("folderId") && params) {
      const [bookmarkId, ...folderIds] = params;
      return mockDbData.folder_bookmarks
        .filter(fb => fb.bookmarkId === bookmarkId && !folderIds.includes(fb.folderId))
        .map(fb => ({ folderId: fb.folderId }));
    }
    // BOOKMARK BY FOLDER (getByFolder: single param folderId)
    if (sql.includes("FROM bookmarks b") && sql.includes("folder_bookmarks fb") && params && params.length === 1) {
      const folderId = params[0];
      const bookmarkIds = mockDbData.folder_bookmarks
        .filter(fb => fb.folderId === folderId)
        .map(fb => fb.bookmarkId);
      return mockDbData.bookmarks.filter(b => bookmarkIds.includes(b.id));
    }
    // BOOKMARK SEARCH BY TAG (searchByTag, or tag branch of searchAll): INNER JOIN bookmark_tags + tags, t.name LIKE ? (case-insensitive)
    if (sql.includes("FROM bookmarks b") && sql.includes("INNER JOIN bookmark_tags") && sql.includes("INNER JOIN tags") && sql.includes("t.name LIKE") && params && params.length === 1) {
      const pattern = params[0];
      const searchTerm = (pattern && pattern.replace(/%/g, '')) || '';
      if (!searchTerm) return [];
      const bookmarkIdsWithTag = new Set();
      mockDbData.bookmark_tags.forEach(bt => {
        const tag = mockDbData.tags.find(t => t.id === bt.tagId);
        if (tag && tag.name && tag.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          bookmarkIdsWithTag.add(bt.bookmarkId);
        }
      });
      return mockDbData.bookmarks.filter(b => bookmarkIdsWithTag.has(b.id));
    }
    // BOOKMARK SEARCH with LIKE (global: searchAll fallback - name, url, or tag)
    if (sql.includes("FROM bookmarks") && sql.includes("LIKE") && !sql.includes("folder_bookmarks")) {
      const pattern = params?.[0];
      if (pattern) {
        const searchTerm = pattern.replace(/%/g, '').toLowerCase();
        const nameOrUrlMatch = mockDbData.bookmarks.filter(b =>
          (b.name && b.name.toLowerCase().includes(searchTerm)) ||
          (b.url && b.url.toLowerCase().includes(searchTerm))
        );
        const tagMatchBookmarkIds = new Set();
        mockDbData.bookmark_tags.forEach(bt => {
          const tag = mockDbData.tags.find(t => t.id === bt.tagId);
          if (tag && tag.name && tag.name.toLowerCase().includes(searchTerm)) {
            tagMatchBookmarkIds.add(bt.bookmarkId);
          }
        });
        const tagMatchBookmarks = mockDbData.bookmarks.filter(b => tagMatchBookmarkIds.has(b.id));
        const seen = new Set();
        const combined = [];
        for (const b of [...nameOrUrlMatch, ...tagMatchBookmarks]) {
          if (!seen.has(b.id)) {
            seen.add(b.id);
            combined.push(b);
          }
        }
        return combined;
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
    // FOLDER_BOOKMARKS (general)
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
    if (sql.includes("FROM tags WHERE id")) {
      return mockDbData.tags.find(t => t.id === params[0]) || null;
    }
    if (sql.includes("sqlite_master")) {
      return { count: 2 };
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

// Mock react-native-safe-area-context
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children, style }) => {
    const React = require("react");
    const { View } = require("react-native");
    return <View style={style}>{children}</View>;
  },
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Silence console warnings during tests
jest.spyOn(console, "warn").mockImplementation(() => {});
jest.spyOn(console, "log").mockImplementation(() => {});
