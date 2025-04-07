import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { SearchBar } from './SearchBar';

describe('SearchBar component', () => {
  let onSearchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSearchMock = vi.fn();
  });

  test('should render correctly with default props', () => {
    const { container } = render(<SearchBar onSearch={onSearchMock} />);

    expect(container).toBeDefined();
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  test('should render with custom placeholder', () => {
    render(<SearchBar onSearch={onSearchMock} placeholder="Custom search" />);

    expect(screen.getByPlaceholderText('Custom search')).toBeInTheDocument();
  });

  test('should call onSearch after user input with debounce', async () => {
    render(<SearchBar onSearch={onSearchMock} />);

    const input = screen.getByPlaceholderText('Search...');
    await userEvent.type(input, 'test query');

    await waitFor(
      () => {
        expect(onSearchMock).toHaveBeenCalledWith('test query');
      },
      { timeout: 350 }
    );
  });

  test('should clear search when X button is clicked', async () => {
    render(<SearchBar onSearch={onSearchMock} />);

    const input = screen.getByPlaceholderText('Search...');
    await userEvent.type(input, 'test query');

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button'));

    expect(input).toHaveValue('');

    await waitFor(() => {
      expect(onSearchMock).toHaveBeenCalledWith('');
    });
  });

  test('should expand on focus', async () => {
    const { container } = render(<SearchBar onSearch={onSearchMock} />);

    expect(container.firstChild).toHaveClass('w-[180px]');

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.focus(input);

    expect(container.firstChild).toHaveClass('w-full');

    fireEvent.blur(input);

    expect(container.firstChild).toHaveClass('w-[180px]');
  });

  test('should initialize with provided value', async () => {
    render(<SearchBar onSearch={onSearchMock} initialValue="initial search" />);

    const input = screen.getByDisplayValue('initial search');
    expect(input).toBeInTheDocument();

    await waitFor(() => {
      expect(onSearchMock).toHaveBeenCalledWith('initial search');
    });
  });

  test('should show search icon in different colors based on focus state', () => {
    render(<SearchBar onSearch={onSearchMock} />);

    const input = screen.getByPlaceholderText('Search...');
    const searchIcon = document.querySelector('svg');

    expect(searchIcon).toHaveClass('text-muted-foreground');

    fireEvent.focus(input);
    expect(searchIcon).toHaveClass('text-primary');

    fireEvent.blur(input);
    expect(searchIcon).toHaveClass('text-muted-foreground');
  });
});
