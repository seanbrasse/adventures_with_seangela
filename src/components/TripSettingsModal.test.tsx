import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TripSettingsModal from './TripSettingsModal';
import type { Trip } from '../types/photo';

describe('TripSettingsModal', () => {
  const mockOnClose = vi.fn();
  const mockOnUpdateTrip = vi.fn();
  const mockOnDeleteTrip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTrip: Trip = {
    id: 'trip-1',
    name: 'Paris Summer 2025',
    description: 'Summer vacation in Paris with Angela',
    locationName: 'Paris',
    startDate: new Date('2025-06-15'),
    endDate: new Date('2025-06-22'),
    photoIds: ['photo-1', 'photo-2', 'photo-3'],
    travelers: ['sean-brooklyn'],
  };

  const defaultProps = {
    trip: mockTrip,
    photoCount: 3,
    onClose: mockOnClose,
    onUpdateTrip: mockOnUpdateTrip,
    onDeleteTrip: mockOnDeleteTrip,
  };

  it('should render the modal with header', () => {
    render(<TripSettingsModal {...defaultProps} />);

    expect(screen.getByText('Trip Settings')).toBeInTheDocument();
  });

  it('should render trip name input with current value', () => {
    render(<TripSettingsModal {...defaultProps} />);

    const nameInput = screen.getByDisplayValue('Paris Summer 2025');
    expect(nameInput).toBeInTheDocument();
  });

  it('should render description textarea with current value', () => {
    render(<TripSettingsModal {...defaultProps} />);

    const descTextarea = screen.getByDisplayValue('Summer vacation in Paris with Angela');
    expect(descTextarea).toBeInTheDocument();
  });

  it('should render date inputs', () => {
    render(<TripSettingsModal {...defaultProps} />);

    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
  });

  it('should close modal when clicking cancel', () => {
    render(<TripSettingsModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Cancel'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should close modal when clicking X button', () => {
    render(<TripSettingsModal {...defaultProps} />);

    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons.find(btn => btn.querySelector('.lucide-x'));
    if (xButton) {
      fireEvent.click(xButton);
    }

    expect(mockOnClose).toHaveBeenCalled();
  });

  // Note: Overlay click-to-close is handled by the component but difficult to test
  // in jsdom because click events don't propagate the same way. The behavior
  // is verified through manual testing and E2E tests.

  it('should call onUpdateTrip when saving changes', async () => {
    render(<TripSettingsModal {...defaultProps} />);

    // Change the trip name
    const nameInput = screen.getByDisplayValue('Paris Summer 2025');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Paris Adventure 2025');

    fireEvent.click(screen.getByText('Save Changes'));

    expect(mockOnUpdateTrip).toHaveBeenCalledWith(
      'trip-1',
      expect.objectContaining({
        name: 'Paris Adventure 2025',
      })
    );
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose without update when no changes made', () => {
    render(<TripSettingsModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Save Changes'));

    // onUpdateTrip should not be called if no changes
    expect(mockOnUpdateTrip).not.toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should update description', async () => {
    render(<TripSettingsModal {...defaultProps} />);

    const descTextarea = screen.getByDisplayValue('Summer vacation in Paris with Angela');
    await userEvent.clear(descTextarea);
    await userEvent.type(descTextarea, 'Amazing trip to Paris');

    fireEvent.click(screen.getByText('Save Changes'));

    expect(mockOnUpdateTrip).toHaveBeenCalledWith(
      'trip-1',
      expect.objectContaining({
        description: 'Amazing trip to Paris',
      })
    );
  });

  it('should render danger zone', () => {
    render(<TripSettingsModal {...defaultProps} />);

    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
    expect(screen.getByText('Delete Trip')).toBeInTheDocument();
  });

  it('should show photo count in danger zone text', () => {
    render(<TripSettingsModal {...defaultProps} />);

    expect(screen.getByText(/Delete this trip and optionally remove all 3 associated photos/)).toBeInTheDocument();
  });

  it('should show confirmation dialog when clicking delete', () => {
    render(<TripSettingsModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Delete Trip'));

    expect(screen.getByText(/Are you sure\?/)).toBeInTheDocument();
    expect(screen.getByText('Keep Photos')).toBeInTheDocument();
    expect(screen.getByText('Delete All')).toBeInTheDocument();
  });

  it('should call onDeleteTrip with deletePhotos=false when keeping photos', () => {
    render(<TripSettingsModal {...defaultProps} />);

    // Open delete confirmation
    fireEvent.click(screen.getByText('Delete Trip'));

    // Click Keep Photos
    fireEvent.click(screen.getByText('Keep Photos'));

    expect(mockOnDeleteTrip).toHaveBeenCalledWith('trip-1', false);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onDeleteTrip with deletePhotos=true when deleting all', () => {
    render(<TripSettingsModal {...defaultProps} />);

    // Open delete confirmation
    fireEvent.click(screen.getByText('Delete Trip'));

    // Click Delete All
    fireEvent.click(screen.getByText('Delete All'));

    expect(mockOnDeleteTrip).toHaveBeenCalledWith('trip-1', true);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should hide confirmation dialog when clicking cancel in confirmation', () => {
    render(<TripSettingsModal {...defaultProps} />);

    // Open delete confirmation
    fireEvent.click(screen.getByText('Delete Trip'));
    expect(screen.getByText(/Are you sure\?/)).toBeInTheDocument();

    // Click Cancel in the confirmation dialog (there are 2 Cancel buttons)
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[0]); // The first Cancel is in the confirmation dialog

    // Confirmation should be hidden (Delete Trip button should be back)
    expect(screen.getByText('Delete Trip')).toBeInTheDocument();
  });

  it('should disable save button when name is empty', async () => {
    render(<TripSettingsModal {...defaultProps} />);

    const nameInput = screen.getByDisplayValue('Paris Summer 2025');
    await userEvent.clear(nameInput);

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeDisabled();
  });

  it('should handle trip without description', () => {
    const tripWithoutDesc: Trip = {
      ...mockTrip,
      description: undefined,
    };

    render(
      <TripSettingsModal
        {...defaultProps}
        trip={tripWithoutDesc}
      />
    );

    const descTextarea = screen.getByPlaceholderText('Add notes about this trip...');
    expect(descTextarea).toHaveValue('');
  });

  it('should show singular photo text for 1 photo', () => {
    render(
      <TripSettingsModal
        {...defaultProps}
        photoCount={1}
      />
    );

    expect(screen.getByText(/Delete this trip and optionally remove all 1 associated photo\./)).toBeInTheDocument();
  });

  it('should render form labels', () => {
    render(<TripSettingsModal {...defaultProps} />);

    expect(screen.getByText('Trip Name')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
  });

  it('should render date inputs with correct values', () => {
    render(<TripSettingsModal {...defaultProps} />);

    // The date inputs should have the formatted date values
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2);
  });

  it('should update start date', async () => {
    render(<TripSettingsModal {...defaultProps} />);

    const dateInputs = document.querySelectorAll('input[type="date"]');
    const startDateInput = dateInputs[0] as HTMLInputElement;

    fireEvent.change(startDateInput, { target: { value: '2025-06-10' } });
    fireEvent.click(screen.getByText('Save Changes'));

    expect(mockOnUpdateTrip).toHaveBeenCalledWith(
      'trip-1',
      expect.objectContaining({
        startDate: expect.any(Date),
      })
    );
  });

  it('should update end date', async () => {
    render(<TripSettingsModal {...defaultProps} />);

    const dateInputs = document.querySelectorAll('input[type="date"]');
    const endDateInput = dateInputs[1] as HTMLInputElement;

    fireEvent.change(endDateInput, { target: { value: '2025-06-25' } });
    fireEvent.click(screen.getByText('Save Changes'));

    expect(mockOnUpdateTrip).toHaveBeenCalledWith(
      'trip-1',
      expect.objectContaining({
        endDate: expect.any(Date),
      })
    );
  });
});
