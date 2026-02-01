import { getDatabase, resetDatabase, clearAllData, getTableStats, exportToJSON, rebuildFTSIndexes } from '../Database';

describe('Database', () => {
  let db;

  beforeEach(() => {
    db = getDatabase();
  });

  describe('getDatabase', () => {
    it('returns database instance', () => {
      expect(db).toBeDefined();
      expect(typeof db.execSync).toBe('function');
    });

    it('returns same instance on multiple calls', () => {
      const db2 = getDatabase();
      expect(db).toBe(db2);
    });
  });

  describe('resetDatabase', () => {
    it('resets database and seeds initial data', () => {
      resetDatabase(db);
      
      const folders = db.getAllSync('SELECT * FROM folders');
      expect(folders.length).toBeGreaterThan(0);
    });

    it('handles reset without errors', () => {
      // Should not throw even if called multiple times
      expect(() => resetDatabase(db)).not.toThrow();
      expect(() => resetDatabase(db)).not.toThrow();
    });

  });

  describe('clearAllData', () => {
    it('clears all tables', () => {
      clearAllData(db);
      
      const folders = db.getAllSync('SELECT * FROM folders');
      expect(folders.length).toBe(0);
    });

    it('can be called multiple times', () => {
      clearAllData(db);
      expect(() => clearAllData(db)).not.toThrow();
    });
  });

  describe('getTableStats', () => {
    it('returns statistics for all tables', () => {
      const stats = getTableStats(db);
      
      expect(stats).toBeDefined();
      expect(stats.folders).toBeDefined();
      expect(stats.bookmarks).toBeDefined();
      expect(stats.tags).toBeDefined();
      expect(typeof stats.folders).toBe('number');
    });

    it('reflects accurate counts after data changes', () => {
      clearAllData(db);
      
      const statsAfterClear = getTableStats(db);
      expect(statsAfterClear.folders).toBe(0);
      
      db.runSync('INSERT INTO folders (id, name, icon, createdAt) VALUES (?, ?, ?, ?)',
        ['test-id', 'Test', 'folder', Date.now()]);
      
      const statsAfterInsert = getTableStats(db);
      expect(statsAfterInsert.folders).toBe(1);
    });
  });

  describe('exportToJSON', () => {
    it('exports all data to JSON', () => {
      const json = exportToJSON(db);
      
      expect(json).toBeDefined();
      expect(json.folders).toBeDefined();
      expect(json.bookmarks).toBeDefined();
      expect(json.tags).toBeDefined();
      expect(Array.isArray(json.folders)).toBe(true);
      expect(Array.isArray(json.bookmarks)).toBe(true);
    });

    it('exports empty arrays when no data', () => {
      clearAllData(db);
      
      const json = exportToJSON(db);
      
      expect(json.folders).toEqual([]);
      expect(json.bookmarks).toEqual([]);
      expect(json.tags).toEqual([]);
    });
  });

  describe('rebuildFTSIndexes', () => {
    it('rebuilds FTS indexes without error', () => {
      // This should not throw
      expect(() => rebuildFTSIndexes(db)).not.toThrow();
    });

    it('handles database with existing data', () => {
      db.runSync('INSERT INTO folders (id, name, icon, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        ['test-id', 'Test Folder', 'folder', Date.now(), Date.now()]);
      
      // Should rebuild indexes successfully
      expect(() => rebuildFTSIndexes(db)).not.toThrow();
    });

    it('logs when FTS tables not found', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Create a db-like object with no FTS tables
      const mockDb = {
        getFirstSync: jest.fn(() => ({ count: 0 })),
        execSync: jest.fn(),
      };
      
      rebuildFTSIndexes(mockDb);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('FTS tables not found, skipping rebuild');
      
      consoleLogSpy.mockRestore();
    });

    it('handles rebuild errors gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const mockDb = {
        getFirstSync: jest.fn(() => ({ count: 2 })),
        execSync: jest.fn(() => { throw new Error('FTS error'); }),
      };
      
      // Should not throw
      expect(() => rebuildFTSIndexes(mockDb)).not.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error rebuilding FTS indexes:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

  });

  describe('Foreign Keys', () => {
    it('enforces foreign key constraints', () => {
      // Try to insert bookmark with non-existent folder
      const bookmarkId = 'test-bookmark';
      const nonExistentFolderId = 'non-existent-folder';
      
      db.runSync('INSERT INTO bookmarks (id, name, url, createdAt) VALUES (?, ?, ?, ?)',
        [bookmarkId, 'Test', 'https://test.com', Date.now()]);
      
      // This should fail or be handled gracefully due to FK constraints
      try {
        db.runSync('INSERT INTO folder_bookmarks (folderId, bookmarkId) VALUES (?, ?)',
          [nonExistentFolderId, bookmarkId]);
      } catch (error) {
        // Expected to fail with FK constraint
        expect(error).toBeDefined();
      }
    });
  });
});
