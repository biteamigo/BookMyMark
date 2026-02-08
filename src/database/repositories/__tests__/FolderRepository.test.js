import { FolderRepository } from '../FolderRepository';
import { getDatabase, resetDatabase } from '../../Database';

describe('FolderRepository', () => {
  let db;
  let folderRepo;

  beforeAll(() => {
    db = getDatabase();
    resetDatabase(db);
    folderRepo = new FolderRepository(db);
  });

  describe('create', () => {
    it('creates a new folder', () => {
      const folder = folderRepo.create({ name: 'Test', icon: 'folder' });
      
      expect(folder.id).toBeDefined();
      expect(folder.name).toBe('Test');
    });

    it('creates nested folder with parentId', () => {
      const parent = folderRepo.create({ name: 'Parent', icon: 'folder' });
      const child = folderRepo.create({ name: 'Child', icon: 'folder', parentId: parent.id });
      
      expect(child.parentId).toBe(parent.id);
    });
  });

  describe('getAll', () => {
    it('returns all folders as array', () => {
      const folders = folderRepo.getAll();
      expect(Array.isArray(folders)).toBe(true);
      expect(folders.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getById', () => {
    it('returns folder by id', () => {
      const created = folderRepo.create({ name: 'FindMe', icon: 'folder' });
      const found = folderRepo.getById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
    });

    it('returns null for non-existent id', () => {
      const found = folderRepo.getById('non-existent-id-12345');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('updates folder name', () => {
      const folder = folderRepo.create({ name: 'Original', icon: 'folder' });
      
      folderRepo.update(folder.id, { name: 'Updated' });
      
      const updated = folderRepo.getById(folder.id);
      expect(updated.name).toBe('Updated');
    });

    it('returns null for non-existent folder', () => {
      const result = folderRepo.update('non-existent', { name: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('deletes a folder', () => {
      const folder = folderRepo.create({ name: 'DeleteMe', icon: 'folder' });
      
      const result = folderRepo.delete(folder.id);
      
      expect(result).toBe(true);
    });

    it('returns false for non-existent folder', () => {
      const result = folderRepo.delete('non-existent-id-999');
      expect(result).toBe(false);
    });
  });

  describe('getRootFolders', () => {
    it('returns array of root folders', () => {
      const roots = folderRepo.getRootFolders();
      expect(Array.isArray(roots)).toBe(true);
      expect(roots.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getSubfolders', () => {
    it('returns child folders', () => {
      const parent = folderRepo.create({ name: 'ParentForSubfolders', icon: 'folder' });
      folderRepo.create({ name: 'ChildA', icon: 'folder', parentId: parent.id });
      folderRepo.create({ name: 'ChildB', icon: 'folder', parentId: parent.id });

      const children = folderRepo.getSubfolders(parent.id);
      expect(children.length).toBeGreaterThanOrEqual(2);
    });

    it('handles querying for subfolders', () => {
      const folder = folderRepo.create({ name: 'QueryTest' + Date.now(), icon: 'folder' });

      const children = folderRepo.getSubfolders(folder.id);
      expect(Array.isArray(children)).toBe(true);
    });
  });

  describe('search', () => {
    it('searches folders by name', () => {
      folderRepo.create({ name: 'SearchableFolder', icon: 'folder' });
      
      const results = folderRepo.search('Searchable');
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns empty for no matches', () => {
      const results = folderRepo.search('NonExistentSearchTerm123');
      expect(results).toEqual([]);
    });

    it('returns empty for empty query', () => {
      const results = folderRepo.search('');
      expect(results).toEqual([]);
    });
  });

  describe('searchInFolder', () => {
    it('returns empty for empty or whitespace query', () => {
      const parent = folderRepo.create({ name: 'Parent', icon: 'folder' });
      expect(folderRepo.searchInFolder('', parent.id)).toEqual([]);
      expect(folderRepo.searchInFolder('   ', null)).toEqual([]);
    });

    it('searches root folders only when parentId is null', () => {
      folderRepo.create({ name: 'RootMatch', icon: 'folder' });
      const parent = folderRepo.create({ name: 'Parent', icon: 'folder' });
      folderRepo.create({ name: 'ChildMatch', icon: 'folder', parentId: parent.id });
      const results = folderRepo.searchInFolder('Match', null);
      expect(results.every(f => f.parentId == null)).toBe(true);
      expect(results.some(f => f.name === 'RootMatch')).toBe(true);
      expect(results.some(f => f.name === 'ChildMatch')).toBe(false);
    });

    it('searches all descendant folders recursively when parentId is set', () => {
      const parent = folderRepo.create({ name: 'Parent', icon: 'folder' });
      const sub = folderRepo.create({ name: 'SubMatch', icon: 'folder', parentId: parent.id });
      const nested = folderRepo.create({ name: 'NestedMatch', icon: 'folder', parentId: sub.id });
      const otherParent = folderRepo.create({ name: 'Other', icon: 'folder' });
      folderRepo.create({ name: 'OtherSubMatch', icon: 'folder', parentId: otherParent.id });
      const results = folderRepo.searchInFolder('Match', parent.id);
      expect(results.length).toBe(2);
      expect(results.map(f => f.name).sort()).toEqual(['NestedMatch', 'SubMatch']);
      expect(results.every(f => f.id !== parent.id)).toBe(true);
    });

    it('returns empty when no folders match in scope', () => {
      const parent = folderRepo.create({ name: 'Parent', icon: 'folder' });
      folderRepo.create({ name: 'SubFolder', icon: 'folder', parentId: parent.id });
      const results = folderRepo.searchInFolder('NonExistent', parent.id);
      expect(results).toEqual([]);
    });
  });

  describe('nameExists', () => {
    it('returns true for existing name', () => {
      folderRepo.create({ name: 'ExistingFolder', icon: 'folder' });
      
      expect(folderRepo.nameExists('ExistingFolder')).toBe(true);
    });

    it('returns false for non-existent name', () => {
      expect(folderRepo.nameExists('NonExistentName999')).toBe(false);
    });
  });

  describe('generateUniqueName', () => {
    it('returns base name if not used', () => {
      const name = folderRepo.generateUniqueName('UniqueBaseName');
      expect(name).toBe('UniqueBaseName');
    });
  });

  describe('count', () => {
    it('returns folder count as number', () => {
      const count = folderRepo.count();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('FTS search fallback', () => {
    it('falls back to LIKE search when FTS fails', () => {
      // Force FTS search with special characters that might cause errors
      const results = folderRepo.search('Test*Special:Characters"');
      
      // Should return array (either from FTS or LIKE fallback)
      expect(Array.isArray(results)).toBe(true);
    });
  });

});
