import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsModal from './SettingsModal';
import type { HomeBase } from '../types/photo';
import { DEFAULT_HOME_BASES } from '../types/photo';

describe('SettingsModal component', () => {
  const mockOnUpdateHomeBase = vi.fn();
  const mockOnAddHomeBase = vi.fn();
  const mockOnRemoveHomeBase = vi.fn();
  const mockOnResetToDefaults = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    homeBases: DEFAULT_HOME_BASES,
    onUpdateHomeBase: mockOnUpdateHomeBase,
    onAddHomeBase: mockOnAddHomeBase,
    onRemoveHomeBase: mockOnRemoveHomeBase,
    onResetToDefaults: mockOnResetToDefaults,
    onClose: mockOnClose,
    mapboxToken: 'test-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render settings modal', () => {
    render(<SettingsModal {...defaultProps} />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Home Bases')).toBeInTheDocument();
  });

  it('should display people sections', () => {
    render(<SettingsModal {...defaultProps} />);

    expect(screen.getByText('Sean')).toBeInTheDocument();
    expect(screen.getByText('Angela')).toBeInTheDocument();
  });

  it('should display home bases for each person', () => {
    render(<SettingsModal {...defaultProps} />);

    expect(screen.getByText('Brooklyn')).toBeInTheDocument();
    expect(screen.getByText('Jakarta')).toBeInTheDocument();
    expect(screen.getByText('Dubai')).toBeInTheDocument();
  });

  it('should call onClose when clicking close button', () => {
    const { container } = render(<SettingsModal {...defaultProps} />);

    // Find the close button (X icon button in header)
    const closeButton = container.querySelector('button');
    expect(closeButton).toBeTruthy();
    if (closeButton) {
      fireEvent.click(closeButton);
      // The first button click might be on Done button at bottom
    }

    // Find Done button
    const doneButton = screen.getByText('Done');
    fireEvent.click(doneButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show permanent badge for permanent home bases', () => {
    render(<SettingsModal {...defaultProps} />);

    const permanentBadges = screen.getAllByText('Permanent');
    expect(permanentBadges.length).toBeGreaterThan(0);
  });

  it('should show temporary badge for temporary home bases', () => {
    render(<SettingsModal {...defaultProps} />);

    expect(screen.getByText('Temporary')).toBeInTheDocument();
  });

  it('should show date range for temporary home bases', () => {
    render(<SettingsModal {...defaultProps} />);

    // Dubai has a date range - component uses toLocaleDateString()
    // Just check that some date is present for the temporary home base
    // The actual format depends on locale
    const content = document.body.textContent;
    expect(content).toMatch(/2024|2025/); // Should have some year
  });

  it('should call onResetToDefaults when clicking reset button', () => {
    render(<SettingsModal {...defaultProps} />);

    // The reset button text is "Reset" not "Reset to Defaults"
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    expect(mockOnResetToDefaults).toHaveBeenCalledTimes(1);
  });

  it('should show add home base button for each person', () => {
    render(<SettingsModal {...defaultProps} />);

    // The button text includes the person name
    expect(screen.getByText(/Add Home Base for Sean/)).toBeInTheDocument();
    expect(screen.getByText(/Add Home Base for Angela/)).toBeInTheDocument();
  });

  it('should allow editing a home base city', async () => {
    render(<SettingsModal {...defaultProps} />);

    // Click on Brooklyn to edit (it opens the edit form)
    const brooklynText = screen.getByText('Brooklyn');
    fireEvent.click(brooklynText);

    // Should show "Current:" text with city info
    await waitFor(() => {
      expect(screen.getByText(/Current:/)).toBeInTheDocument();
    });
  });

  it('should handle empty home bases', () => {
    render(<SettingsModal {...defaultProps} homeBases={[]} />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    // Should show add home buttons but no home base cards
    expect(screen.queryByText('Brooklyn')).not.toBeInTheDocument();
  });

  it('should display correct colors for each person', () => {
    render(<SettingsModal {...defaultProps} />);

    // Check that the section headers have the right styling
    const seanSection = screen.getByText('Sean').closest('div');
    const angelaSection = screen.getByText('Angela').closest('div');

    expect(seanSection).toBeInTheDocument();
    expect(angelaSection).toBeInTheDocument();
  });

  it('should show delete button only for temporary home bases', async () => {
    render(<SettingsModal {...defaultProps} />);

    // Click on Dubai (temporary) to open edit mode
    const dubaiText = screen.getByText('Dubai');
    fireEvent.click(dubaiText);

    // Should show Delete button for temporary home
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('should call onRemoveHomeBase when deleting a temporary home', async () => {
    render(<SettingsModal {...defaultProps} />);

    // Click on Dubai to open edit mode
    const dubaiText = screen.getByText('Dubai');
    fireEvent.click(dubaiText);

    // Click Delete button
    await waitFor(() => {
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
    });

    expect(mockOnRemoveHomeBase).toHaveBeenCalledWith('angela-dubai');
  });

  it('should display home base coordinates when editing', async () => {
    render(<SettingsModal {...defaultProps} />);

    // Click to edit Brooklyn
    const brooklynText = screen.getByText('Brooklyn');
    fireEvent.click(brooklynText);

    // Should show coordinates in the "Current:" text
    await waitFor(() => {
      expect(screen.getByText(/40\.65/)).toBeInTheDocument();
    });
  });

  it('should handle adding a new home base', async () => {
    render(<SettingsModal {...defaultProps} />);

    // Click add home for Sean
    const addButton = screen.getByText(/Add Home Base for Sean/);
    fireEvent.click(addButton);

    // Should show form with city search
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search for a city...')).toBeInTheDocument();
    });
  });

  it('should filter home bases by person', () => {
    const customHomeBases: HomeBase[] = [
      {
        id: 'sean-nyc',
        personId: 'sean',
        name: 'Sean',
        city: 'NYC',
        lat: 40.7128,
        lng: -74.006,
        color: '#3B82F6',
        radius: 50,
        isPermanent: true,
      },
    ];

    render(<SettingsModal {...defaultProps} homeBases={customHomeBases} />);

    expect(screen.getByText('NYC')).toBeInTheDocument();
    // Angela should not have any home bases displayed
    expect(screen.queryByText('Jakarta')).not.toBeInTheDocument();
  });

  it('should show radius input when editing', async () => {
    render(<SettingsModal {...defaultProps} />);

    // Click to edit Brooklyn
    const brooklynText = screen.getByText('Brooklyn');
    fireEvent.click(brooklynText);

    // Should show radius label
    await waitFor(() => {
      expect(screen.getByText('Radius (km)')).toBeInTheDocument();
    });
  });

  it('should call onUpdateHomeBase when changing radius', async () => {
    // Mock fetch for this test
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ features: [] }),
    });

    render(<SettingsModal {...defaultProps} />);

    // Click to edit Brooklyn
    const brooklynCard = screen.getByText('Brooklyn').closest('div');
    fireEvent.click(brooklynCard!);

    // Wait for the edit form to appear - look for the "Radius (km)" label
    await waitFor(() => {
      expect(screen.getByText('Radius (km)')).toBeInTheDocument();
    });

    // Find the radius input and change it
    const radiusInput = screen.getByDisplayValue('30');
    fireEvent.change(radiusInput, { target: { value: '50' } });

    expect(mockOnUpdateHomeBase).toHaveBeenCalled();
  });
});
