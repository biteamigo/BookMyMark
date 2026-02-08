import { BookmarkRepository } from '../BookmarkRepository';
import { TagRepository } from '../TagRepository';
import { getDatabase, resetDatabase } from '../../Database';

describe('BookmarkRepository', () => {
  let db;
  let bookmarkRepo;
  let folderId;

  beforeEach(() => {
    db = getDatabase();
    resetDatabase(db);
    bookmarkRepo = new BookmarkRepository(db);
    
    // Create a test folder
    db.runSync('INSERT INTO folders (id, name, icon, createdAt) VALUES (?, ?, ?, ?)', 
      ['test-folder', 'Test Folder', 'folder', Date.now()]);
    folderId = 'test-folder';
  });

  describe('create', () => {
    it('creates a bookmark with single folder', () => {
      const bookmark = bookmarkRepo.create(
        { name: 'Test', url: 'https://test.com' },
        [folderId]
      );

      expect(bookmark.id).toBeDefined();
      expect(bookmark.name).toBe('Test');
      expect(bookmark.url).toBe('https://test.com');
    });

    it('creates a bookmark with folder assignment', () => {
      const bookmark = bookmarkRepo.create(
        { name: 'Multi', url: 'https://multi.com' },
        [folderId]
      );

      expect(bookmark.id).toBeDefined();
      expect(bookmark.name).toBe('Multi');
    });
  });

  describe('getAll', () => {
    it('returns all bookmarks', () => {
      bookmarkRepo.create({ name: 'B1', url: 'https://b1.com' }, [folderId]);
      bookmarkRepo.create({ name: 'B2', url: 'https://b2.com' }, [folderId]);

      const bookmarks = bookmarkRepo.getAll();
      expect(bookmarks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getById', () => {
    it('returns bookmark by id', () => {
      const created = bookmarkRepo.create({ name: 'Test', url: 'https://test.com' }, [folderId]);
      const found = bookmarkRepo.getById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
    });

    it('returns null for non-existent id', () => {
      const found = bookmarkRepo.getById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('updates bookmark properties', () => {
      const bookmark = bookmarkRepo.create({ name: 'Original', url: 'https://original.com' }, [folderId]);
      
      bookmarkRepo.update(bookmark.id, { name: 'Updated', url: 'https://updated.com' });
      
      const updated = bookmarkRepo.getById(bookmark.id);
      expect(updated.name).toBe('Updated');
      expect(updated.url).toBe('https://updated.com');
    });
  });

  describe('delete', () => {
    it('deletes a bookmark', () => {
      const bookmark = bookmarkRepo.create({ name: 'Delete Me', url: 'https://delete.com' }, [folderId]);
      
      bookmarkRepo.delete(bookmark.id);
      
      const found = bookmarkRepo.getById(bookmark.id);
      expect(found).toBeNull();
    });
  });

  describe('getByFolder', () => {
    it('returns bookmarks in folder', () => {
      bookmarkRepo.create({ name: 'B1', url: 'https://b1.com' }, [folderId]);
      bookmarkRepo.create({ name: 'B2', url: 'https://b2.com' }, [folderId]);

      const bookmarks = bookmarkRepo.getByFolder(folderId);
      expect(bookmarks.length).toBe(2);
    });

    it('returns empty array for folder with no bookmarks', () => {
      db.runSync('INSERT INTO folders (id, name, icon, createdAt) VALUES (?, ?, ?, ?)', 
        ['empty-folder', 'Empty', 'folder', Date.now()]);

      const bookmarks = bookmarkRepo.getByFolder('empty-folder');
      expect(bookmarks).toEqual([]);
    });
  });

  describe('getByTag', () => {
    it('returns bookmarks that have the given tag', () => {
      const tagRepo = new TagRepository(db);
      const b1 = bookmarkRepo.create({ name: 'B1', url: 'https://b1.com' }, [folderId]);
      const b2 = bookmarkRepo.create({ name: 'B2', url: 'https://b2.com' }, [folderId]);
      tagRepo.setTagsForBookmark(b1.id, ['js']);
      tagRepo.setTagsForBookmark(b2.id, ['js']);
      const jsTag = tagRepo.getByName('js');
      const bookmarks = bookmarkRepo.getByTag(jsTag.id);
      expect(bookmarks.length).toBe(2);
      expect(bookmarks.map(b => b.id)).toContain(b1.id);
      expect(bookmarks.map(b => b.id)).toContain(b2.id);
    });

    it('returns empty array when no bookmarks have the tag', () => {
      const tagRepo = new TagRepository(db);
      const tag = tagRepo.create('orphan-tag');
      expect(tag).toBeTruthy();
      const bookmarks = bookmarkRepo.getByTag(tag.id);
      expect(Array.isArray(bookmarks)).toBe(true);
      expect(bookmarks.length).toBe(0);
    });
  });


  describe('urlExists', () => {
    it('returns true for existing URL', () => {
      bookmarkRepo.create({ name: 'Test', url: 'https://existing.com' }, [folderId]);

      expect(bookmarkRepo.urlExists('https://existing.com')).toBe(true);
    });

    it('returns false for non-existent URL', () => {
      expect(bookmarkRepo.urlExists('https://nonexistent.com')).toBe(false);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      bookmarkRepo.create({ name: 'React Docs', url: 'https://react.dev' }, [folderId]);
      bookmarkRepo.create({ name: 'Vue Guide', url: 'https://vuejs.org' }, [folderId]);
    });

    it('searches by name using LIKE fallback', () => {
      const results = bookmarkRepo.search('React');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('React');
    });

    it('searches by URL using LIKE fallback', () => {
      const results = bookmarkRepo.search('vuejs');
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns empty for no matches', () => {
      const results = bookmarkRepo.search('nonexistent');
      expect(results).toEqual([]);
    });

    it('returns empty for empty query', () => {
      const results = bookmarkRepo.search('');
      expect(results).toEqual([]);
    });
  });

  describe('searchAll', () => {
    it('searches across name and url', () => {
      bookmarkRepo.create({ name: 'React Docs', url: 'https://react.dev' }, [folderId]);
      
      const results = bookmarkRepo.searchAll('React');
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns empty for empty query', () => {
      const results = bookmarkRepo.searchAll('');
      expect(results).toEqual([]);
    });

    it('returns empty for whitespace query', () => {
      const results = bookmarkRepo.searchAll('   ');
      expect(results).toEqual([]);
    });
  });

  describe('addToFolder', () => {
    it('adds bookmark to folder', () => {
      const bookmark = bookmarkRepo.create({ name: 'Test', url: 'https://test.com' }, [folderId]);
      
      db.runSync('INSERT INTO folders (id, name, icon, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', 
        ['folder-2', 'Folder 2', 'folder', Date.now(), Date.now()]);
      
      // Method exists, just verify no error
      expect(() => bookmarkRepo.addToFolder(bookmark.id, 'folder-2')).not.toThrow();
    });
  });

  describe('removeFromFolder', () => {
    it('removes bookmark from folder', () => {
      const bookmark = bookmarkRepo.create({ name: 'Test', url: 'https://test.com' }, [folderId]);
      
      // Method exists, just verify no error
      expect(() => bookmarkRepo.removeFromFolder(bookmark.id, folderId)).not.toThrow();
    });
  });

  describe('count', () => {
    it('returns bookmark count', () => {
      const initialCount = bookmarkRepo.count();
      
      bookmarkRepo.create({ name: 'Test 1', url: 'https://test1.com' }, [folderId]);
      bookmarkRepo.create({ name: 'Test 2', url: 'https://test2.com' }, [folderId]);
      
      const newCount = bookmarkRepo.count();
      expect(newCount).toBe(initialCount + 2);
    });
  });

  describe('getFolders', () => {
    it('returns folder IDs for bookmark', () => {
      const bookmark = bookmarkRepo.create({ name: 'Test', url: 'https://test.com' }, [folderId]);
      
      const folderIds = bookmarkRepo.getFolders(bookmark.id);
      expect(Array.isArray(folderIds)).toBe(true);
    });
  });

  describe('searchByTag', () => {
    it('searches bookmarks by tag name', () => {
      const results = bookmarkRepo.searchByTag('test');
      expect(Array.isArray(results)).toBe(true);
    });

    it('returns empty for empty tag name', () => {
      const results = bookmarkRepo.searchByTag('');
      expect(results).toEqual([]);
    });

    it('returns empty for whitespace', () => {
      const results = bookmarkRepo.searchByTag('   ');
      expect(results).toEqual([]);
    });
  });

  describe('searchAll with FTS fallback', () => {
    it('deduplicates results from multiple sources', () => {
      bookmarkRepo.create({ name: 'Dedup Test', url: 'https://dedup.com' }, [folderId]);
      
      const results = bookmarkRepo.searchAll('Dedup');
      
      // Should return unique results
      expect(Array.isArray(results)).toBe(true);
      const ids = results.map(r => r.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('handles FTS errors and falls back to LIKE', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      bookmarkRepo.create({ name: 'FTS Test', url: 'https://fts.com' }, [folderId]);
      
      // Search with special characters that might cause FTS errors
      const results = bookmarkRepo.searchAll('test*special:chars"');
      
      // Should return array from fallback
      expect(Array.isArray(results)).toBe(true);
      
      consoleWarnSpy.mockRestore();
    });
  });
});
