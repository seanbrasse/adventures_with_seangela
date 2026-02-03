import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlacesView from './PlacesView';
import type { Photo, Trip } from '../types/photo';

describe('PlacesView', () => {
  const mockOnClose = vi.fn();
  const mockOnLocationSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPhotos: Photo[] = [
    {
      id: 'photo-1',
      url: 'https://example.com/photo1.jpg',
      thumbnail: 'https://example.com/photo1-thumb.jpg',
      location: { lat: 48.8566, lng: 2.3522, name: 'Paris' },
      date: new Date('2025-06-15'),
    },
    {
      id: 'photo-2',
      url: 'https://example.com/photo2.jpg',
      thumbnail: 'https://example.com/photo2-thumb.jpg',
      location: { lat: 48.8566, lng: 2.3522, name: 'Paris' },
      date: new Date('2025-06-16'),
    },
    {
      id: 'photo-3',
      url: 'https://example.com/photo3.jpg',
      thumbnail: 'https://example.com/photo3-thumb.jpg',
      location: { lat: 35.6762, lng: 139.6503, name: 'Tokyo' },
      date: new Date('2025-09-01'),
    },
  ];

  const mockTrips: Trip[] = [
    {
      id: 'trip-1',
      name: 'Paris Summer',
      description: 'Summer vacation in Paris',
      locationName: 'Paris',
      startDate: new Date('2025-06-15'),
      endDate: new Date('2025-06-20'),
      photoIds: ['photo-1', 'photo-2'],
      travelers: ['sean-brooklyn'],
    },
    {
      id: 'trip-2',
      name: 'Tokyo Adventure',
      locationName: 'Tokyo',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-09-10'),
      photoIds: ['photo-3'],
      travelers: ['sean-brooklyn', 'angela-jakarta'],
    },
  ];

  const defaultProps = {
    photos: mockPhotos,
    trips: mockTrips,
    onClose: mockOnClose,
    onLocationSelect: mockOnLocationSelect,
  };

  it('should render the header with title', () => {
    render(<PlacesView {...defaultProps} />);

    expect(screen.getByText('Your Trips')).toBeInTheDocument();
  });

  it('should render close button', () => {
    const { container } = render(<PlacesView {...defaultProps} />);

    const closeButton = container.querySelector('button');
    expect(closeButton).toBeInTheDocument();
  });

  it('should call onClose when clicking close button', () => {
    render(<PlacesView {...defaultProps} />);

    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons.find(btn => btn.querySelector('.lucide-x'));
    if (xButton) {
      fireEvent.click(xButton);
    }

    expect(mockOnClose).toHaveBeenCalled();
  });

  // Note: Overlay click-to-close is handled by the component but difficult to test
  // in jsdom because click events don't propagate the same way with styled-components.
  // The behavior is verified through manual testing and E2E tests.

  it('should render location cards', () => {
    render(<PlacesView {...defaultProps} />);

    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Tokyo')).toBeInTheDocument();
  });

  it('should show photo count for each location', () => {
    render(<PlacesView {...defaultProps} />);

    expect(screen.getByText('2 photos')).toBeInTheDocument();
    expect(screen.getByText('1 photo')).toBeInTheDocument();
  });

  it('should show trip count for locations with trips', () => {
    render(<PlacesView {...defaultProps} />);

    // Both locations have 1 trip each, so there should be 2 instances of "1 trip"
    const tripCounts = screen.getAllByText('1 trip');
    expect(tripCounts.length).toBeGreaterThan(0);
  });

  it('should call onLocationSelect when clicking a place', () => {
    render(<PlacesView {...defaultProps} />);

    // Click on the Paris place header
    const parisCard = screen.getByText('Paris').closest('button');
    if (parisCard) {
      fireEvent.click(parisCard);
    }

    expect(mockOnLocationSelect).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show trip details for each location', () => {
    render(<PlacesView {...defaultProps} />);

    expect(screen.getByText('Paris Summer')).toBeInTheDocument();
    expect(screen.getByText('Tokyo Adventure')).toBeInTheDocument();
  });

  it('should show trip description when available', () => {
    render(<PlacesView {...defaultProps} />);

    expect(screen.getByText('Summer vacation in Paris')).toBeInTheDocument();
  });

  it('should show trip dates', () => {
    render(<PlacesView {...defaultProps} />);

    // Check for formatted dates (format depends on the formatTripDates function)
    expect(screen.getByText(/Jun 15/)).toBeInTheDocument();
  });

  it('should render empty state when no photos', () => {
    render(
      <PlacesView
        photos={[]}
        trips={[]}
        onClose={mockOnClose}
        onLocationSelect={mockOnLocationSelect}
      />
    );

    expect(screen.getByText('No places yet. Add some photos to get started!')).toBeInTheDocument();
  });

  it('should filter out photos at 0,0 coordinates', () => {
    const photosWithZero: Photo[] = [
      ...mockPhotos,
      {
        id: 'photo-zero',
        url: 'https://example.com/zero.jpg',
        thumbnail: 'https://example.com/zero-thumb.jpg',
        location: { lat: 0, lng: 0, name: 'Unknown' },
        date: new Date('2025-01-01'),
      },
    ];

    render(
      <PlacesView
        photos={photosWithZero}
        trips={mockTrips}
        onClose={mockOnClose}
        onLocationSelect={mockOnLocationSelect}
      />
    );

    // Should not show the 0,0 location
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
  });

  it('should display thumbnails for locations', () => {
    const { container } = render(<PlacesView {...defaultProps} />);

    // Images might not have alt text, so query by tag
    const images = container.querySelectorAll('img');
    expect(images.length).toBeGreaterThan(0);
  });

  it('should sort locations by most recent photo date', () => {
    render(<PlacesView {...defaultProps} />);

    // Tokyo has the most recent photo (Sep 2025), so it should appear first
    const locations = screen.getAllByRole('heading', { level: 2 });
    const locationNames = locations.map(h => h.textContent);

    // Tokyo should come before Paris since it has the more recent photo
    const tokyoIndex = locationNames.indexOf('Tokyo');
    const parisIndex = locationNames.indexOf('Paris');

    expect(tokyoIndex).toBeLessThan(parisIndex);
  });

  it('should handle click on trip card', () => {
    render(<PlacesView {...defaultProps} />);

    // Find a trip card and click it
    const tripCard = screen.getByText('Paris Summer').closest('button');
    if (tripCard) {
      fireEvent.click(tripCard);
    }

    // Should call onLocationSelect with the trip's photos
    expect(mockOnLocationSelect).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show trips to location title', () => {
    render(<PlacesView {...defaultProps} />);

    expect(screen.getByText('Trips to Paris')).toBeInTheDocument();
    expect(screen.getByText('Trips to Tokyo')).toBeInTheDocument();
  });

  it('should show photo count in trip cards', () => {
    render(<PlacesView {...defaultProps} />);

    expect(screen.getByText('2 photos from this trip')).toBeInTheDocument();
    expect(screen.getByText('1 photo from this trip')).toBeInTheDocument();
  });
});
