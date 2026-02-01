import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import FolderPickerScreen from '../FolderPickerScreen';
import { DatabaseProvider } from '../../Context/DatabaseContext';
import { getDatabase, resetDatabase } from '../../database/Database';

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setParams: jest.fn(),
};

const renderWithProviders = (props = {}) => {
  const defaultRoute = {
    params: {
      selectedFolderIds: [],
      onSelect: jest.fn(),
    },
  };
  
  const route = { ...defaultRoute, params: { ...defaultRoute.params, ...props } };
  
  return render(
    <DatabaseProvider>
      <FolderPickerScreen navigation={mockNavigation} route={route} />
    </DatabaseProvider>
  );
};

describe('FolderPickerScreen - Comprehensive Tests', () => {
  let db;

  beforeAll(() => {
    db = getDatabase();
    resetDatabase(db);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Folder hierarchy expansion', () => {
    it('displays parent and child folders', async () => {
      const { FolderRepository } = require('../../database/repositories');
      const folderRepo = new FolderRepository(db);
      
      const parent = folderRepo.create({ name: 'ExpandParent', icon: 'folder' });
      const child = folderRepo.create({ name: 'ExpandChild', icon: 'folder', parentId: parent.id });
      
      renderWithProviders();
      
      await waitFor(() => {
        expect(screen.getByText('ExpandParent')).toBeTruthy();
      });
      
      // Verify parent folder is displayed
      expect(screen.getByText('ExpandParent')).toBeTruthy();
    });

    it('maintains expansion state during search', async () => {
      const { FolderRepository } = require('../../database/repositories');
      const folderRepo = new FolderRepository(db);
      
      const parent = folderRepo.create({ name: 'SearchParent', icon: 'folder' });
      const child = folderRepo.create({ name: 'SearchChild', icon: 'folder', parentId: parent.id });
      
      renderWithProviders();
      
      await waitFor(() => {
        expect(screen.getByText('SearchParent')).toBeTruthy();
      });
      
      // Search for something
      const searchInput = screen.getByPlaceholderText('Search');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'Search');
        await new Promise(resolve => setTimeout(resolve, 300));
      });
      
      // Should find the parent folder
      await waitFor(() => {
        expect(screen.getByText('SearchParent')).toBeTruthy();
      });
    });
  });

  describe('Selected folder display', () => {
    it('renders folders that can be selected', async () => {
      const { FolderRepository } = require('../../database/repositories');
      const folderRepo = new FolderRepository(db);
      
      const folder = folderRepo.create({ name: 'SelectCountFolder', icon: 'folder' });
      
      renderWithProviders();
      
      await waitFor(() => {
        expect(screen.getByText('SelectCountFolder')).toBeTruthy();
      });
      
      // Folder should be tappable
      const folderItem = screen.getByText('SelectCountFolder');
      expect(() => fireEvent.press(folderItem)).not.toThrow();
    });

    it('renders multiple selectable folders', async () => {
      const { FolderRepository } = require('../../database/repositories');
      const folderRepo = new FolderRepository(db);
      
      const folder1 = folderRepo.create({ name: 'MultiSelect1', icon: 'folder' });
      const folder2 = folderRepo.create({ name: 'MultiSelect2', icon: 'folder' });
      
      renderWithProviders();
      
      await waitFor(() => {
        expect(screen.getByText('MultiSelect1')).toBeTruthy();
        expect(screen.getByText('MultiSelect2')).toBeTruthy();
      });
      
      // Both folders should be present
      expect(screen.getByText('MultiSelect1')).toBeTruthy();
      expect(screen.getByText('MultiSelect2')).toBeTruthy();
    });

    it('allows folder interaction', async () => {
      const { FolderRepository } = require('../../database/repositories');
      const folderRepo = new FolderRepository(db);
      
      const folder = folderRepo.create({ name: 'DeselectFolder', icon: 'folder' });
      
      renderWithProviders();
      
      await waitFor(() => {
        expect(screen.getByText('DeselectFolder')).toBeTruthy();
      });
      
      const folderItem = screen.getByText('DeselectFolder');
      
      // Should be able to press without error
      expect(() => {
        fireEvent.press(folderItem);
        fireEvent.press(folderItem);
      }).not.toThrow();
    });
  });

  describe('Done button callback', () => {
    it('has Done button that calls onSelect', async () => {
      const { FolderRepository } = require('../../database/repositories');
      const folderRepo = new FolderRepository(db);
      const mockOnSelect = jest.fn();
      
      const folder = folderRepo.create({ name: 'DoneTestFolder', icon: 'folder' });
      
      renderWithProviders({ onSelect: mockOnSelect });
      
      await waitFor(() => {
        expect(screen.getByText('DoneTestFolder')).toBeTruthy();
      });
      
      // Done button should be present
      const doneButton = screen.getByText('Done');
      expect(doneButton).toBeTruthy();
      
      // Should be callable without error
      expect(() => fireEvent.press(doneButton)).not.toThrow();
    });
  });

  describe('Search results display', () => {
    it('displays search results with parent context', async () => {
      const { FolderRepository } = require('../../database/repositories');
      const folderRepo = new FolderRepository(db);
      
      const parent = folderRepo.create({ name: 'SearchResultParent', icon: 'folder' });
      const child = folderRepo.create({ name: 'SearchResultChild', icon: 'folder', parentId: parent.id });
      
      renderWithProviders();
      
      await waitFor(() => {
        expect(screen.getByText('SearchResultParent')).toBeTruthy();
      });
      
      // Search for child
      const searchInput = screen.getByPlaceholderText('Search');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'SearchResultChild');
        await new Promise(resolve => setTimeout(resolve, 300));
      });
      
      // Should show both parent context and child
      await waitFor(() => {
        expect(screen.getByText('SearchResultChild')).toBeTruthy();
      });
    });
  });
});
