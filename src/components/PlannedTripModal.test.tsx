import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PlannedTripModal from './PlannedTripModal';
import type { PlannedTrip } from '../types/photo';

describe('PlannedTripModal component', () => {
  const mockOnSave = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnConvertToTrip = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    onSave: mockOnSave,
    onClose: mockOnClose,
    mapboxToken: 'test-token',
  };

  const existingTrip: PlannedTrip = {
    id: 'trip-1',
    destinationName: 'Tokyo',
    lat: 35.6762,
    lng: 139.6503,
    description: 'Dream trip to Japan',
    thingsToDo: ['Visit temples', 'Try ramen'],
    bookingStatus: 'researching',
    notes: 'Need to book flights',
    potentialStartDate: new Date('2025-06-01'),
    potentialEndDate: new Date('2025-06-15'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal for new trip', () => {
    render(<PlannedTripModal {...defaultProps} />);

    expect(screen.getByText('Plan a Trip')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search for a destination...')).toBeInTheDocument();
    expect(screen.getByText('Add Trip')).toBeInTheDocument();
  });

  it('should render modal for editing existing trip', () => {
    render(
      <PlannedTripModal
        {...defaultProps}
        trip={existingTrip}
        onDelete={mockOnDelete}
        onConvertToTrip={mockOnConvertToTrip}
      />
    );

    expect(screen.getByText('Edit Planned Trip')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Convert to Trip')).toBeInTheDocument();
  });

  it('should display existing trip data when editing', () => {
    render(
      <PlannedTripModal
        {...defaultProps}
        trip={existingTrip}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Selected: Tokyo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Dream trip to Japan')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Need to book flights')).toBeInTheDocument();
    expect(screen.getByText('Visit temples')).toBeInTheDocument();
    expect(screen.getByText('Try ramen')).toBeInTheDocument();
  });

  it('should call onClose when clicking close button', () => {
    render(<PlannedTripModal {...defaultProps} />);

    const closeButton = screen.getByText('Cancel');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking X button', () => {
    const { container } = render(<PlannedTripModal {...defaultProps} />);

    // Find the X button (first button with X icon in header)
    const buttons = container.querySelectorAll('button');
    const xButton = Array.from(buttons).find(
      (btn) => btn.querySelector('svg.lucide-x')
    );

    if (xButton) {
      fireEvent.click(xButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('should display all booking status options', () => {
    render(<PlannedTripModal {...defaultProps} />);

    expect(screen.getByText('Just an idea')).toBeInTheDocument();
    expect(screen.getByText('Researching')).toBeInTheDocument();
    expect(screen.getByText('Booked')).toBeInTheDocument();
  });

  it('should allow changing booking status', () => {
    render(<PlannedTripModal {...defaultProps} />);

    const bookedButton = screen.getByText('Booked');
    fireEvent.click(bookedButton);

    // Verify the button has the selected styling (checking for a class)
    expect(bookedButton.closest('button')).toHaveClass('bg-white/10');
  });

  it('should disable save button when no destination is selected', () => {
    render(<PlannedTripModal {...defaultProps} />);

    const saveButton = screen.getByText('Add Trip');
    expect(saveButton).toBeDisabled();
  });

  it('should enable save button when destination is selected', () => {
    render(
      <PlannedTripModal
        {...defaultProps}
        trip={existingTrip}
      />
    );

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).not.toBeDisabled();
  });

  it('should call onSave with form data when save button is clicked', () => {
    render(
      <PlannedTripModal
        {...defaultProps}
        trip={existingTrip}
      />
    );

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    const savedData = mockOnSave.mock.calls[0][0];
    expect(savedData.destinationName).toBe('Tokyo');
    expect(savedData.lat).toBe(35.6762);
    expect(savedData.lng).toBe(139.6503);
    expect(savedData.bookingStatus).toBe('researching');
  });

  it('should call onDelete when delete button is clicked', () => {
    render(
      <PlannedTripModal
        {...defaultProps}
        trip={existingTrip}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it('should not show delete button for new trip', () => {
    render(<PlannedTripModal {...defaultProps} />);

    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('should call onConvertToTrip when convert button is clicked', () => {
    render(
      <PlannedTripModal
        {...defaultProps}
        trip={existingTrip}
        onConvertToTrip={mockOnConvertToTrip}
      />
    );

    const convertButton = screen.getByText('Convert to Trip');
    fireEvent.click(convertButton);

    expect(mockOnConvertToTrip).toHaveBeenCalledTimes(1);
  });

  it('should not show convert button for new trip', () => {
    render(<PlannedTripModal {...defaultProps} />);

    expect(screen.queryByText('Convert to Trip')).not.toBeInTheDocument();
  });

  it('should allow adding things to do', () => {
    render(
      <PlannedTripModal
        {...defaultProps}
        trip={existingTrip}
      />
    );

    const todoInput = screen.getByPlaceholderText('Add something to do...');
    fireEvent.change(todoInput, { target: { value: 'Visit Mount Fuji' } });

    // Find and click the add button (the + button near the input)
    const addButtons = screen.getAllByRole('button');
    const addButton = addButtons.find((btn) => {
      const svg = btn.querySelector('svg.lucide-plus');
      return svg && btn.closest('.flex.gap-2');
    });

    if (addButton) {
      fireEvent.click(addButton);
    }

    expect(screen.getByText('Visit Mount Fuji')).toBeInTheDocument();
  });

  it('should allow removing things to do', () => {
    render(
      <PlannedTripModal
        {...defaultProps}
        trip={existingTrip}
      />
    );

    expect(screen.getByText('Visit temples')).toBeInTheDocument();

    // Find and click the delete button for the first todo
    const deleteButtons = screen.getAllByRole('button');
    const todoDeleteButton = deleteButtons.find((btn) =>
      btn.querySelector('svg.lucide-trash-2')
    );

    if (todoDeleteButton) {
      fireEvent.click(todoDeleteButton);
    }

    expect(screen.queryByText('Visit temples')).not.toBeInTheDocument();
  });

  it('should allow entering description', () => {
    render(<PlannedTripModal {...defaultProps} />);

    const descriptionInput = screen.getByPlaceholderText("What's this trip about?");
    fireEvent.change(descriptionInput, { target: { value: 'A relaxing vacation' } });

    expect(descriptionInput).toHaveValue('A relaxing vacation');
  });

  it('should allow entering notes', () => {
    render(<PlannedTripModal {...defaultProps} />);

    const notesInput = screen.getByPlaceholderText('Any additional notes...');
    fireEvent.change(notesInput, { target: { value: 'Remember to pack sunscreen' } });

    expect(notesInput).toHaveValue('Remember to pack sunscreen');
  });

  it('should show destination label', () => {
    render(<PlannedTripModal {...defaultProps} />);

    expect(screen.getByText('Destination')).toBeInTheDocument();
  });

  it('should show status label', () => {
    render(<PlannedTripModal {...defaultProps} />);

    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('should show things to do label', () => {
    render(<PlannedTripModal {...defaultProps} />);

    expect(screen.getByText('Things to Do')).toBeInTheDocument();
  });

  it('should show notes label', () => {
    render(<PlannedTripModal {...defaultProps} />);

    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('should show potential dates label', () => {
    render(<PlannedTripModal {...defaultProps} />);

    expect(screen.getByText('Potential Dates')).toBeInTheDocument();
  });

  it('should handle adding todo via Enter key', () => {
    render(
      <PlannedTripModal
        {...defaultProps}
        trip={existingTrip}
      />
    );

    const todoInput = screen.getByPlaceholderText('Add something to do...');
    fireEvent.change(todoInput, { target: { value: 'New todo item' } });
    fireEvent.keyDown(todoInput, { key: 'Enter' });

    expect(screen.getByText('New todo item')).toBeInTheDocument();
  });

  it('should not add empty todo items', () => {
    render(
      <PlannedTripModal
        {...defaultProps}
        trip={existingTrip}
      />
    );

    const initialTodoCount = existingTrip.thingsToDo.length;
    const todoInput = screen.getByPlaceholderText('Add something to do...');
    fireEvent.change(todoInput, { target: { value: '   ' } }); // Just spaces
    fireEvent.keyDown(todoInput, { key: 'Enter' });

    // Count todo items displayed
    const todoItems = screen.getAllByText(/Visit temples|Try ramen/);
    expect(todoItems.length).toBeLessThanOrEqual(initialTodoCount);
  });
});
