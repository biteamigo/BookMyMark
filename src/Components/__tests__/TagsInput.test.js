import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import TagsInput from '../TagsInput';

describe('TagsInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with placeholder', () => {
    render(<TagsInput tags={[]} onChange={mockOnChange} placeholder="Add tag..." />);
    
    expect(screen.getByPlaceholderText('Add tag...')).toBeTruthy();
  });

  it('displays existing tags as chips', () => {
    render(<TagsInput tags={['React', 'JavaScript', 'Tutorial']} onChange={mockOnChange} />);
    
    expect(screen.getByText('React')).toBeTruthy();
    expect(screen.getByText('JavaScript')).toBeTruthy();
    expect(screen.getByText('Tutorial')).toBeTruthy();
  });

  it('adds a new tag when input is submitted', () => {
    render(<TagsInput tags={[]} onChange={mockOnChange} />);
    
    const input = screen.getByTestId('tag-input');
    fireEvent.changeText(input, 'NewTag');
    fireEvent(input, 'submitEditing');
    
    expect(mockOnChange).toHaveBeenCalledWith(['NewTag']);
  });

  it('trims whitespace when adding tags', () => {
    render(<TagsInput tags={[]} onChange={mockOnChange} />);
    
    const input = screen.getByTestId('tag-input');
    fireEvent.changeText(input, '  SpacedTag  ');
    fireEvent(input, 'submitEditing');
    
    expect(mockOnChange).toHaveBeenCalledWith(['SpacedTag']);
  });

  it('does not add duplicate tags', () => {
    render(<TagsInput tags={['React']} onChange={mockOnChange} />);
    
    const input = screen.getByTestId('tag-input');
    fireEvent.changeText(input, 'React');
    fireEvent(input, 'submitEditing');
    
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('does not add empty tags', () => {
    render(<TagsInput tags={[]} onChange={mockOnChange} />);
    
    const input = screen.getByTestId('tag-input');
    fireEvent.changeText(input, '   ');
    fireEvent(input, 'submitEditing');
    
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('removes a tag when close button is pressed', () => {
    render(<TagsInput tags={['React', 'JavaScript']} onChange={mockOnChange} />);
    
    const removeButton = screen.getByTestId('remove-tag-React');
    fireEvent.press(removeButton);
    
    expect(mockOnChange).toHaveBeenCalledWith(['JavaScript']);
  });

  it('shows add button when input has text', () => {
    render(<TagsInput tags={[]} onChange={mockOnChange} />);
    
    // Add button should not be visible initially
    expect(screen.queryByTestId('add-tag-button')).toBeNull();
    
    // Type something
    const input = screen.getByTestId('tag-input');
    fireEvent.changeText(input, 'NewTag');
    
    // Add button should now be visible
    expect(screen.getByTestId('add-tag-button')).toBeTruthy();
  });

  it('adds tag when add button is pressed', () => {
    render(<TagsInput tags={[]} onChange={mockOnChange} />);
    
    const input = screen.getByTestId('tag-input');
    fireEvent.changeText(input, 'ButtonTag');
    
    const addButton = screen.getByTestId('add-tag-button');
    fireEvent.press(addButton);
    
    expect(mockOnChange).toHaveBeenCalledWith(['ButtonTag']);
  });

  it('clears input after adding a tag', () => {
    const { rerender } = render(<TagsInput tags={[]} onChange={mockOnChange} />);
    
    const input = screen.getByTestId('tag-input');
    fireEvent.changeText(input, 'TestTag');
    fireEvent(input, 'submitEditing');
    
    // Simulate re-render with updated tags
    rerender(<TagsInput tags={['TestTag']} onChange={mockOnChange} />);
    
    expect(input.props.value).toBe('');
  });

  it('shows suggestions when typing', () => {
    render(
      <TagsInput 
        tags={[]} 
        onChange={mockOnChange} 
        suggestions={['React', 'React Native', 'Redux']}
      />
    );
    
    const input = screen.getByTestId('tag-input');
    fireEvent.changeText(input, 'Rea');
    
    expect(screen.getByText('React')).toBeTruthy();
    expect(screen.getByText('React Native')).toBeTruthy();
  });

  it('filters suggestions based on input', () => {
    render(
      <TagsInput 
        tags={[]} 
        onChange={mockOnChange} 
        suggestions={['React', 'JavaScript', 'Redux']}
      />
    );
    
    const input = screen.getByTestId('tag-input');
    fireEvent.changeText(input, 'red');
    
    expect(screen.getByText('Redux')).toBeTruthy();
    expect(screen.queryByText('React')).toBeNull();
    expect(screen.queryByText('JavaScript')).toBeNull();
  });

  it('excludes already added tags from suggestions', () => {
    render(
      <TagsInput 
        tags={['React']} 
        onChange={mockOnChange} 
        suggestions={['React', 'React Native', 'Redux']}
      />
    );
    
    const input = screen.getByTestId('tag-input');
    fireEvent.changeText(input, 'rea');
    
    // React should not show because it's already added
    expect(screen.queryByText('React')).toBeTruthy(); // Shown in chip
    expect(screen.getByText('React Native')).toBeTruthy(); // In suggestions
  });

  it('adds tag from suggestion when clicked', () => {
    render(
      <TagsInput 
        tags={[]} 
        onChange={mockOnChange} 
        suggestions={['React', 'Redux']}
      />
    );
    
    const input = screen.getByTestId('tag-input');
    fireEvent.changeText(input, 'rea');
    
    const suggestion = screen.getByTestId('suggestion-React');
    fireEvent.press(suggestion);
    
    expect(mockOnChange).toHaveBeenCalledWith(['React']);
  });

  it('hides suggestions when input is empty', () => {
    render(
      <TagsInput 
        tags={[]} 
        onChange={mockOnChange} 
        suggestions={['React', 'Redux']}
      />
    );
    
    const input = screen.getByTestId('tag-input');
    
    // Type something to show suggestions
    fireEvent.changeText(input, 'rea');
    expect(screen.queryByTestId('suggestion-React')).toBeTruthy();
    
    // Clear input
    fireEvent.changeText(input, '');
    expect(screen.queryByTestId('suggestion-React')).toBeNull();
  });
});
