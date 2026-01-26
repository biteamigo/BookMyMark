import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import FolderPickerScreen from '../FolderPickerScreen';
import { DatabaseProvider } from '../../Context/DatabaseContext';
import { getDatabase } from '../../database/Database';

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setParams: jest.fn(),
  setOptions: jest.fn(),
};

const renderWithProviders = (component) => {
  return render(
    <DatabaseProvider>
      {component}
    </DatabaseProvider>
  );
};

describe('FolderPickerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Add test folders
    const db = getDatabase();
    const { FolderRepository } = require('../../database/repositories');
    const folderRepo = new FolderRepository(db);
    
    folderRepo.create({ name: 'YouTube', icon: 'youtube' });
    folderRepo.create({ name: 'Music', icon: 'music' });
    folderRepo.create({ name: 'Recipes', icon: 'food' });
  });

  it('renders header with title and buttons', () => {
    renderWithProviders(
      <FolderPickerScreen 
        navigation={mockNavigation} 
        route={{ params: {} }}
      />
    );
    
    expect(screen.getByText('Select Folders')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
  });

  it('renders list of folders', async () => {
    renderWithProviders(
      <FolderPickerScreen 
        navigation={mockNavigation} 
        route={{ params: {} }}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('YouTube')).toBeTruthy();
      expect(screen.getByText('Music')).toBeTruthy();
      expect(screen.getByText('Recipes')).toBeTruthy();
    });
  });

  it('renders with pre-selected folders', async () => {
    const db = getDatabase();
    const { FolderRepository } = require('../../database/repositories');
    const folderRepo = new FolderRepository(db);
    const folders = folderRepo.getAll();
    const firstFolderId = folders[0]?.id;

    renderWithProviders(
      <FolderPickerScreen 
        navigation={mockNavigation} 
        route={{ params: { selectedFolderIds: [firstFolderId] } }}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('1 folder selected')).toBeTruthy();
    });
  });

  it('toggles folder selection when tapped', async () => {
    renderWithProviders(
      <FolderPickerScreen 
        navigation={mockNavigation} 
        route={{ params: {} }}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('YouTube')).toBeTruthy();
    });

    const db = getDatabase();
    const { FolderRepository } = require('../../database/repositories');
    const folderRepo = new FolderRepository(db);
    const folders = folderRepo.getAll();
    const firstFolder = folders[0];

    const folderItem = screen.getByTestId(`folder-item-${firstFolder.id}`);
    fireEvent.press(folderItem);
    
    await waitFor(() => {
      expect(screen.getByText('1 folder selected')).toBeTruthy();
    });
  });

  it('allows multiple folder selection', async () => {
    renderWithProviders(
      <FolderPickerScreen 
        navigation={mockNavigation} 
        route={{ params: {} }}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('YouTube')).toBeTruthy();
    });

    const db = getDatabase();
    const { FolderRepository } = require('../../database/repositories');
    const folderRepo = new FolderRepository(db);
    const folders = folderRepo.getAll();

    // Select first folder
    fireEvent.press(screen.getByTestId(`folder-item-${folders[0].id}`));
    
    await waitFor(() => {
      expect(screen.getByText('1 folder selected')).toBeTruthy();
    });

    // Select second folder
    fireEvent.press(screen.getByTestId(`folder-item-${folders[1].id}`));
    
    await waitFor(() => {
      expect(screen.getByText('2 folders selected')).toBeTruthy();
    });
  });

  it('deselects folder when tapped again', async () => {
    const db = getDatabase();
    const { FolderRepository } = require('../../database/repositories');
    const folderRepo = new FolderRepository(db);
    const folders = folderRepo.getAll();
    const firstFolderId = folders[0]?.id;

    renderWithProviders(
      <FolderPickerScreen 
        navigation={mockNavigation} 
        route={{ params: { selectedFolderIds: [firstFolderId] } }}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('1 folder selected')).toBeTruthy();
    });

    // Tap to deselect
    const folderItem = screen.getByTestId(`folder-item-${firstFolderId}`);
    fireEvent.press(folderItem);
    
    await waitFor(() => {
      expect(screen.queryByText('1 folder selected')).toBeNull();
    });
  });

  it('calls onSelect with selected folder IDs when Done is pressed', async () => {
    const mockOnSelect = jest.fn();
    
    renderWithProviders(
      <FolderPickerScreen 
        navigation={mockNavigation} 
        route={{ params: { onSelect: mockOnSelect } }}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('YouTube')).toBeTruthy();
    });

    const db = getDatabase();
    const { FolderRepository } = require('../../database/repositories');
    const folderRepo = new FolderRepository(db);
    const folders = folderRepo.getAll();

    // Select a folder
    fireEvent.press(screen.getByTestId(`folder-item-${folders[0].id}`));
    
    // Press Done
    const doneButton = screen.getByTestId('done-button');
    fireEvent.press(doneButton);
    
    expect(mockOnSelect).toHaveBeenCalledWith([folders[0].id]);
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('goes back when Cancel is pressed', () => {
    renderWithProviders(
      <FolderPickerScreen 
        navigation={mockNavigation} 
        route={{ params: {} }}
      />
    );
    
    const cancelButton = screen.getByTestId('cancel-button');
    fireEvent.press(cancelButton);
    
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('filters folders by search term', async () => {
    renderWithProviders(
      <FolderPickerScreen 
        navigation={mockNavigation} 
        route={{ params: {} }}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('YouTube')).toBeTruthy();
      expect(screen.getByText('Music')).toBeTruthy();
    });

    // Search for "music"
    const searchInput = screen.getByPlaceholderText('Search');
    fireEvent.changeText(searchInput, 'music');
    
    await waitFor(() => {
      expect(screen.getByText('Music')).toBeTruthy();
      expect(screen.queryByText('YouTube')).toBeNull();
    });
  });

  it('shows empty state when no folders exist', () => {
    // Clear folders
    const db = getDatabase();
    const { FolderRepository } = require('../../database/repositories');
    const folderRepo = new FolderRepository(db);
    folderRepo.getAll().forEach(f => folderRepo.delete(f.id));

    renderWithProviders(
      <FolderPickerScreen 
        navigation={mockNavigation} 
        route={{ params: {} }}
      />
    );
    
    expect(screen.getByText('No folders yet')).toBeTruthy();
  });

  it('shows "no folders found" when search has no results', async () => {
    renderWithProviders(
      <FolderPickerScreen 
        navigation={mockNavigation} 
        route={{ params: {} }}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('YouTube')).toBeTruthy();
    });

    const searchInput = screen.getByPlaceholderText('Search');
    fireEvent.changeText(searchInput, 'NonexistentFolder');
    
    await waitFor(() => {
      expect(screen.getByText('No folders found')).toBeTruthy();
    });
  });
});
