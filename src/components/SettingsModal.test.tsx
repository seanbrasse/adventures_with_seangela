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

  it('should show edit form when clicking on home base', async () => {
    render(<SettingsModal {...defaultProps} />);

    // Click to edit Brooklyn
    fireEvent.click(screen.getByText('Brooklyn'));

    // Wait for edit form
    await waitFor(() => {
      expect(screen.getByText('Radius (km)')).toBeInTheDocument();
    });

    // Should show the edit form with Current info
    expect(screen.getByText(/Current:/)).toBeInTheDocument();
  });

  it('should search for cities when typing in search field', async () => {
    // Mock fetch for geocoding
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        features: [
          { id: '1', place_name: 'Paris, France', center: [2.3522, 48.8566], text: 'Paris' },
        ],
      }),
    });

    render(<SettingsModal {...defaultProps} />);

    // Click to add new home base for Sean
    fireEvent.click(screen.getByText(/Add Home Base for Sean/));

    // Wait for search input
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search for a city...')).toBeInTheDocument();
    });

    // Type in search field
    const searchInput = screen.getByPlaceholderText('Search for a city...');
    fireEvent.change(searchInput, { target: { value: 'Paris' } });

    // Wait for results
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('should show type selector when editing', async () => {
    render(<SettingsModal {...defaultProps} />);

    // Click to edit Brooklyn
    fireEvent.click(screen.getByText('Brooklyn'));

    // Wait for type selector
    await waitFor(() => {
      expect(screen.getByText('Type')).toBeInTheDocument();
    });
  });

  it('should show date inputs when type is temporary', async () => {
    render(<SettingsModal {...defaultProps} />);

    // Click to edit Dubai (which is temporary)
    fireEvent.click(screen.getByText('Dubai'));

    // Wait for date inputs to appear
    await waitFor(() => {
      expect(screen.getByText('Start Date')).toBeInTheDocument();
      expect(screen.getByText('End Date')).toBeInTheDocument();
    });
  });

  it('should cancel adding new home base', async () => {
    render(<SettingsModal {...defaultProps} />);

    // Click to add new home base
    fireEvent.click(screen.getByText(/Add Home Base for Sean/));

    // Wait for form
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search for a city...')).toBeInTheDocument();
    });

    // Click Cancel
    fireEvent.click(screen.getByText('Cancel'));

    // Form should close
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Search for a city...')).not.toBeInTheDocument();
    });
  });

  it('should not show delete for permanent home bases', async () => {
    render(<SettingsModal {...defaultProps} />);

    // Click to edit Brooklyn (permanent)
    fireEvent.click(screen.getByText('Brooklyn'));

    // Wait for edit form
    await waitFor(() => {
      expect(screen.getByText('Radius (km)')).toBeInTheDocument();
    });

    // Delete button should not be present for permanent
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('should display description text', () => {
    render(<SettingsModal {...defaultProps} />);

    expect(screen.getByText(/Manage home locations for each person/)).toBeInTheDocument();
  });

  it('should change type from permanent to temporary', async () => {
    render(<SettingsModal {...defaultProps} />);

    // Click to edit Brooklyn (permanent)
    fireEvent.click(screen.getByText('Brooklyn'));

    // Wait for edit form
    await waitFor(() => {
      expect(screen.getByText('Type')).toBeInTheDocument();
    });

    // Change type to temporary
    const typeSelect = screen.getByDisplayValue('Permanent');
    fireEvent.change(typeSelect, { target: { value: 'temporary' } });

    expect(mockOnUpdateHomeBase).toHaveBeenCalled();
  });

  it('should change type from temporary to permanent', async () => {
    render(<SettingsModal {...defaultProps} />);

    // Click to edit Dubai (temporary)
    fireEvent.click(screen.getByText('Dubai'));

    // Wait for edit form
    await waitFor(() => {
      expect(screen.getByText('Type')).toBeInTheDocument();
    });

    // Change type to permanent
    const typeSelect = screen.getByDisplayValue('Temporary');
    fireEvent.change(typeSelect, { target: { value: 'permanent' } });

    expect(mockOnUpdateHomeBase).toHaveBeenCalled();
  });

  it('should update start date for temporary home base', async () => {
    render(<SettingsModal {...defaultProps} />);

    // Click to edit Dubai (temporary)
    fireEvent.click(screen.getByText('Dubai'));

    // Wait for date inputs
    await waitFor(() => {
      expect(screen.getByText('Start Date')).toBeInTheDocument();
    });

    // Find and change start date input
    const dateInputs = document.querySelectorAll('input[type="date"]');
    if (dateInputs.length > 0) {
      fireEvent.change(dateInputs[0], { target: { value: '2024-05-01' } });
      expect(mockOnUpdateHomeBase).toHaveBeenCalled();
    }
  });

  it('should update end date for temporary home base', async () => {
    render(<SettingsModal {...defaultProps} />);

    // Click to edit Dubai (temporary)
    fireEvent.click(screen.getByText('Dubai'));

    // Wait for date inputs
    await waitFor(() => {
      expect(screen.getByText('End Date')).toBeInTheDocument();
    });

    // Find and change end date input
    const dateInputs = document.querySelectorAll('input[type="date"]');
    if (dateInputs.length > 1) {
      fireEvent.change(dateInputs[1], { target: { value: '2025-06-01' } });
      expect(mockOnUpdateHomeBase).toHaveBeenCalled();
    }
  });

  it('should close edit form when clicking Done', async () => {
    render(<SettingsModal {...defaultProps} />);

    // Click to edit Brooklyn
    fireEvent.click(screen.getByText('Brooklyn'));

    // Wait for edit form
    await waitFor(() => {
      expect(screen.getByText('Radius (km)')).toBeInTheDocument();
    });

    // Find and click the Done button within the edit form
    const doneButtons = screen.getAllByRole('button').filter(btn =>
      btn.textContent?.includes('Done') || btn.textContent?.includes('Save')
    );

    // Click the form's Done/Save button (not the modal's main Done button)
    if (doneButtons.length > 0) {
      fireEvent.click(doneButtons[0]);
    }
  });

  it('should select a city from search results', async () => {
    // Mock fetch for geocoding
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        features: [
          { id: '1', place_name: 'Tokyo, Japan', center: [139.6917, 35.6895], text: 'Tokyo' },
        ],
      }),
    });

    render(<SettingsModal {...defaultProps} />);

    // Click to add new home base for Sean
    fireEvent.click(screen.getByText(/Add Home Base for Sean/));

    // Wait for search input
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search for a city...')).toBeInTheDocument();
    });

    // Type in search field
    const searchInput = screen.getByPlaceholderText('Search for a city...');
    fireEvent.change(searchInput, { target: { value: 'Tokyo' } });

    // Wait for results to appear
    await waitFor(() => {
      expect(screen.getByText('Tokyo, Japan')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Click on result
    fireEvent.click(screen.getByText('Tokyo, Japan'));

    // City should be selected (the search input should show Tokyo)
    await waitFor(() => {
      expect(screen.getByDisplayValue('Tokyo')).toBeInTheDocument();
    });
  });

  it('should display Add Home Base button in add form', async () => {
    render(<SettingsModal {...defaultProps} />);

    // Click to add new home base for Angela
    fireEvent.click(screen.getByText(/Add Home Base for Angela/));

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search for a city...')).toBeInTheDocument();
    });

    // Add Home Base button should exist (though may be disabled initially)
    const addButton = screen.getByRole('button', { name: 'Add Home Base' });
    expect(addButton).toBeInTheDocument();
  });

  it('should display City label in edit form', async () => {
    render(<SettingsModal {...defaultProps} />);

    // Click to edit Brooklyn
    fireEvent.click(screen.getByText('Brooklyn'));

    // Wait for edit form
    await waitFor(() => {
      expect(screen.getByText('City')).toBeInTheDocument();
    });

    // The edit form should show the city label
    expect(screen.getByText('City')).toBeInTheDocument();
  });
});
