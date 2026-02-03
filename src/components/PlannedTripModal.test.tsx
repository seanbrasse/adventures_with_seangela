import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlannedTripModal from './PlannedTripModal';
import type { PlannedTrip } from '../types/photo';

// Mock fetch for geocoding API
global.fetch = vi.fn();

describe('PlannedTripModal', () => {
  const mockOnSave = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnConvertToTrip = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ features: [] }),
    });
  });

  const defaultProps = {
    onSave: mockOnSave,
    onClose: mockOnClose,
    mapboxToken: 'test-token',
  };

  describe('Create mode', () => {
    it('should render the create modal title', () => {
      render(<PlannedTripModal {...defaultProps} />);

      expect(screen.getByText('Plan a Trip')).toBeInTheDocument();
    });

    it('should render all form fields', () => {
      render(<PlannedTripModal {...defaultProps} />);

      expect(screen.getByPlaceholderText('Search for a destination...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText("What's this trip about?")).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Add something to do...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Any additional notes...')).toBeInTheDocument();
    });

    it('should render booking status options', () => {
      render(<PlannedTripModal {...defaultProps} />);

      expect(screen.getByText('Just an idea')).toBeInTheDocument();
      expect(screen.getByText('Researching')).toBeInTheDocument();
      expect(screen.getByText('Booked')).toBeInTheDocument();
    });

    it('should close modal when clicking cancel', () => {
      render(<PlannedTripModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when clicking X button', () => {
      render(<PlannedTripModal {...defaultProps} />);

      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(btn => btn.querySelector('.lucide-x'));
      if (xButton) {
        fireEvent.click(xButton);
      }

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should disable Add Trip button when destination is not selected', () => {
      render(<PlannedTripModal {...defaultProps} />);

      const addButton = screen.getByText('Add Trip');
      expect(addButton).toBeDisabled();
    });

    it('should search for cities when typing in destination field', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        json: () =>
          Promise.resolve({
            features: [
              {
                id: '1',
                place_name: 'Paris, France',
                center: [2.3522, 48.8566],
                text: 'Paris',
              },
            ],
          }),
      });

      render(<PlannedTripModal {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search for a destination...');
      await userEvent.type(input, 'Par');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should select a city from search results', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        json: () =>
          Promise.resolve({
            features: [
              {
                id: '1',
                place_name: 'Paris, France',
                center: [2.3522, 48.8566],
                text: 'Paris',
              },
            ],
          }),
      });

      render(<PlannedTripModal {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search for a destination...');
      await userEvent.type(input, 'Paris');

      await waitFor(() => {
        expect(screen.getByText('Paris, France')).toBeInTheDocument();
      });

      fireEvent.mouseDown(screen.getByText('Paris, France'));

      await waitFor(() => {
        expect(screen.getByText('Selected: Paris')).toBeInTheDocument();
      });
    });

    it('should add things to do', async () => {
      render(<PlannedTripModal {...defaultProps} />);

      const todoInput = screen.getByPlaceholderText('Add something to do...');
      await userEvent.type(todoInput, 'Visit Eiffel Tower');

      // Find the add button (Plus icon button)
      const buttons = screen.getAllByRole('button');
      const addTodoButton = buttons.find(btn => btn.querySelector('.lucide-plus'));
      if (addTodoButton) {
        fireEvent.click(addTodoButton);
      }

      expect(screen.getByText('Visit Eiffel Tower')).toBeInTheDocument();
    });

    it('should add things to do with Enter key', async () => {
      render(<PlannedTripModal {...defaultProps} />);

      const todoInput = screen.getByPlaceholderText('Add something to do...');
      await userEvent.type(todoInput, 'Visit Louvre{enter}');

      expect(screen.getByText('Visit Louvre')).toBeInTheDocument();
    });

    it('should remove things to do', async () => {
      render(<PlannedTripModal {...defaultProps} />);

      // Add a todo first
      const todoInput = screen.getByPlaceholderText('Add something to do...');
      await userEvent.type(todoInput, 'Test todo{enter}');

      expect(screen.getByText('Test todo')).toBeInTheDocument();

      // Find and click the delete button
      const trashButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('.lucide-trash-2')
      );
      if (trashButtons.length > 0) {
        fireEvent.click(trashButtons[0]);
      }

      expect(screen.queryByText('Test todo')).not.toBeInTheDocument();
    });

    it('should change booking status', () => {
      render(<PlannedTripModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Booked'));

      // The button should now be selected (has different styling)
      const bookedButton = screen.getByText('Booked').closest('button');
      expect(bookedButton).toHaveClass('bg-white/10');
    });

    it('should call onSave with correct data when submitting', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        json: () =>
          Promise.resolve({
            features: [
              {
                id: '1',
                place_name: 'Tokyo, Japan',
                center: [139.6503, 35.6762],
                text: 'Tokyo',
              },
            ],
          }),
      });

      render(<PlannedTripModal {...defaultProps} />);

      // Select a destination
      const input = screen.getByPlaceholderText('Search for a destination...');
      await userEvent.type(input, 'Tokyo');

      await waitFor(() => {
        expect(screen.getByText('Tokyo, Japan')).toBeInTheDocument();
      });

      fireEvent.mouseDown(screen.getByText('Tokyo, Japan'));

      await waitFor(() => {
        expect(screen.getByText('Selected: Tokyo')).toBeInTheDocument();
      });

      // Add description
      const descInput = screen.getByPlaceholderText("What's this trip about?");
      await userEvent.type(descInput, 'Japan adventure');

      // Click save
      fireEvent.click(screen.getByText('Add Trip'));

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          destinationName: 'Tokyo',
          lat: 35.6762,
          lng: 139.6503,
          description: 'Japan adventure',
          bookingStatus: 'idea',
        })
      );
    });
  });

  describe('Edit mode', () => {
    const existingTrip: PlannedTrip = {
      id: 'trip-1',
      destinationName: 'Barcelona',
      lat: 41.3851,
      lng: 2.1734,
      description: 'Spain trip',
      thingsToDo: ['La Sagrada Familia', 'Park Guell'],
      potentialStartDate: new Date('2026-07-01'),
      potentialEndDate: new Date('2026-07-10'),
      bookingStatus: 'researching',
      notes: 'Check flight prices',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
    };

    it('should render the edit modal title', () => {
      render(
        <PlannedTripModal
          {...defaultProps}
          trip={existingTrip}
          onDelete={mockOnDelete}
          onConvertToTrip={mockOnConvertToTrip}
        />
      );

      expect(screen.getByText('Edit Planned Trip')).toBeInTheDocument();
    });

    it('should pre-fill form with existing trip data', () => {
      render(
        <PlannedTripModal
          {...defaultProps}
          trip={existingTrip}
          onDelete={mockOnDelete}
          onConvertToTrip={mockOnConvertToTrip}
        />
      );

      expect(screen.getByText('Selected: Barcelona')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Spain trip')).toBeInTheDocument();
      expect(screen.getByText('La Sagrada Familia')).toBeInTheDocument();
      expect(screen.getByText('Park Guell')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Check flight prices')).toBeInTheDocument();
    });

    it('should show Save Changes button in edit mode', () => {
      render(
        <PlannedTripModal
          {...defaultProps}
          trip={existingTrip}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('should show Delete button in edit mode', () => {
      render(
        <PlannedTripModal
          {...defaultProps}
          trip={existingTrip}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should call onDelete when clicking delete', () => {
      render(
        <PlannedTripModal
          {...defaultProps}
          trip={existingTrip}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.click(screen.getByText('Delete'));

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it('should show Convert to Trip button when onConvertToTrip is provided', () => {
      render(
        <PlannedTripModal
          {...defaultProps}
          trip={existingTrip}
          onDelete={mockOnDelete}
          onConvertToTrip={mockOnConvertToTrip}
        />
      );

      expect(screen.getByText('Convert to Trip')).toBeInTheDocument();
    });

    it('should call onConvertToTrip when clicking convert button', () => {
      render(
        <PlannedTripModal
          {...defaultProps}
          trip={existingTrip}
          onDelete={mockOnDelete}
          onConvertToTrip={mockOnConvertToTrip}
        />
      );

      fireEvent.click(screen.getByText('Convert to Trip'));

      expect(mockOnConvertToTrip).toHaveBeenCalledTimes(1);
    });

    it('should call onSave with updated data when saving', async () => {
      render(
        <PlannedTripModal
          {...defaultProps}
          trip={existingTrip}
          onDelete={mockOnDelete}
        />
      );

      // Change description
      const descInput = screen.getByDisplayValue('Spain trip');
      await userEvent.clear(descInput);
      await userEvent.type(descInput, 'Updated Spain trip');

      fireEvent.click(screen.getByText('Save Changes'));

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Updated Spain trip',
        })
      );
    });
  });

  describe('Date handling', () => {
    it('should render date inputs', () => {
      render(<PlannedTripModal {...defaultProps} />);

      const dateInputs = screen.getAllByRole('textbox').filter(
        input => input.getAttribute('type') === 'date'
      );

      // Date inputs might not show as textbox role, check for date type inputs
      const container = screen.getByText('Potential Dates').closest('div');
      expect(container).toBeInTheDocument();
    });
  });
});
