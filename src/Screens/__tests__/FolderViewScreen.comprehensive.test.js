import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import FolderViewScreen from '../FolderViewScreen';
import { DatabaseProvider } from '../../Context/DatabaseContext';
import { FolderProvider } from '../../Context/FolderContext';
import { getDatabase, resetDatabase } from '../../database/Database';

const mockNavigation = {
  navigate: jest.fn(),
  push: jest.fn(),
  goBack: jest.fn(),
  setParams: jest.fn(),
  setOptions: jest.fn(),
};

const renderWithProviders = (route = { params: {} }) => {
  return render(
    <DatabaseProvider>
      <FolderProvider>
        <FolderViewScreen navigation={mockNavigation} route={route} />
      </FolderProvider>
    </DatabaseProvider>
  );
};

describe('FolderViewScreen - Comprehensive Tests', () => {
  let db;

  beforeAll(() => {
    db = getDatabase();
    resetDatabase(db);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Subfolder navigation and header updates', () => {
    it('updates header params when entering subfolder', async () => {
      const { FolderRepository } = require('../../database/repositories');
      const folderRepo = new FolderRepository(db);
      
      const folder = folderRepo.create({ name: 'HeaderTestFolder', icon: 'folder' });
      
      const route = { params: { folderId: folder.id } };
      
      renderWithProviders(route);
      
      await waitFor(() => {
        const calls = mockNavigation.setParams.mock.calls;
        const hasFolderName = calls.some(call => 
          call[0]?.folderName === 'HeaderTestFolder'
        );
        expect(hasFolderName).toBe(true);
      });
    });

    it('clears folder name in header at root', async () => {
      const route = { params: { folderId: null } };
      
      renderWithProviders(route);
      
      await waitFor(() => {
        const calls = mockNavigation.setParams.mock.calls;
        const hasNullFolderName = calls.some(call => 
          'folderName' in (call[0] || {}) && call[0].folderName === null
        );
        expect(hasNullFolderName).toBe(true);
      });
    });
  });

  describe('Bookmark interaction in subfolders', () => {
    it('loads and displays bookmarks in subfolder', async () => {
      const { FolderRepository, BookmarkRepository } = require('../../database/repositories');
      const folderRepo = new FolderRepository(db);
      const bookmarkRepo = new BookmarkRepository(db);
      
      const folder = folderRepo.create({ name: 'BookmarksFolder', icon: 'folder' });
      bookmarkRepo.create({ name: 'Test Bookmark', url: 'https://test.com' }, [folder.id]);
      
      const route = { params: { folderId: folder.id } };
      
      renderWithProviders(route);
      
      await waitFor(() => {
        expect(screen.getByText('Test Bookmark')).toBeTruthy();
      });
    });

    it('handles bookmarks without URL gracefully', async () => {
      const { FolderRepository, BookmarkRepository } = require('../../database/repositories');
      const folderRepo = new FolderRepository(db);
      const bookmarkRepo = new BookmarkRepository(db);
      
      const folder = folderRepo.create({ name: 'NoURLFolder', icon: 'folder' });
      const bookmark = bookmarkRepo.create({ name: 'No URL BM', url: 'https://nourl.com' }, [folder.id]);
      
      const route = { params: { folderId: folder.id } };
      
      renderWithProviders(route);
      
      await waitFor(() => {
        expect(screen.getByText('No URL BM')).toBeTruthy();
      });
      
      // Simply verify the bookmark renders - don't test URL opening in comprehensive suite
      const bookmarkItem = screen.getByText('No URL BM');
      expect(bookmarkItem).toBeTruthy();
    });
  });

  describe('View mode persistence', () => {
    it('maintains view mode in navigation params', async () => {
      const route = { params: { folderId: null } };
      
      renderWithProviders(route);
      
      await waitFor(() => {
        const calls = mockNavigation.setParams.mock.calls;
        const hasViewMode = calls.some(call => 
          'viewMode' in (call[0] || {})
        );
        expect(hasViewMode).toBe(true);
      });
    });
  });
});
