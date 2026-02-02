import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';
import type { Photo, Trip } from '../types/photo';

describe('Sidebar component', () => {
  const createPhoto = (
    id: string,
    lat: number,
    lng: number,
    date: Date,
    name?: string
  ): Photo => ({
    id,
    url: `https://example.com/${id}.jpg`,
    thumbnail: `https://example.com/${id}_thumb.jpg`,
    location: { lat, lng, name },
    date,
  });

  const mockOnLocationSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no photos', () => {
    render(<Sidebar photos={[]} onLocationSelect={mockOnLocationSelect} />);

    expect(screen.getByText('No photos yet')).toBeInTheDocument();
    expect(screen.getByText(/Add photos with location data/)).toBeInTheDocument();
  });

  it('should render photo count', () => {
    const photos = [
      createPhoto('1', 40.7, -74, new Date('2024-06-15'), 'NYC'),
      createPhoto('2', 40.7, -74, new Date('2024-06-16'), 'NYC'),
    ];

    render(<Sidebar photos={photos} onLocationSelect={mockOnLocationSelect} />);

    // The stat value shows "2" and label shows "Photos" (CSS transforms to uppercase)
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Photos')).toBeInTheDocument();
  });

  it('should render location count', () => {
    const photos = [
      createPhoto('1', 40.7, -74, new Date('2024-06-15'), 'NYC'),
      createPhoto('2', 25.2, 55.3, new Date('2024-06-16'), 'Dubai'),
    ];

    render(<Sidebar photos={photos} onLocationSelect={mockOnLocationSelect} />);

    // "Locations" is the label (CSS transforms to uppercase)
    expect(screen.getByText('Locations')).toBeInTheDocument();
  });

  it('should render date range', () => {
    const photos = [
      createPhoto('1', 40.7, -74, new Date('2024-06-15'), 'NYC'),
      createPhoto('2', 40.7, -74, new Date('2024-09-20'), 'NYC'),
    ];

    render(<Sidebar photos={photos} onLocationSelect={mockOnLocationSelect} />);

    // Should show date range
    expect(screen.getByText(/Jun 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Sep 2024/)).toBeInTheDocument();
  });

  it('should render trips counter for photos after Sep 2024', () => {
    const photos = [
      createPhoto('1', 25.2, 55.3, new Date('2024-10-15'), 'Dubai'),
      createPhoto('2', 51.5, -0.12, new Date('2024-11-20'), 'London'),
    ];

    const trips: Trip[] = [
      {
        id: 'trip-1',
        name: 'Dubai - Oct 2024',
        locationName: 'Dubai',
        startDate: new Date('2024-10-15'),
        endDate: new Date('2024-10-20'),
        photoIds: ['1'],
        travelers: ['person-1'],
      },
      {
        id: 'trip-2',
        name: 'London - Nov 2024',
        locationName: 'London',
        startDate: new Date('2024-11-20'),
        endDate: new Date('2024-11-25'),
        photoIds: ['2'],
        travelers: ['person-1'],
      },
    ];

    render(<Sidebar photos={photos} trips={trips} onLocationSelect={mockOnLocationSelect} />);

    // Should show trips together label
    expect(screen.getByText(/trip/)).toBeInTheDocument();
  });

  it('should not show trips counter when no photos after Sep 2024', () => {
    const photos = [
      createPhoto('1', 40.7, -74, new Date('2024-06-15'), 'NYC'),
      createPhoto('2', 40.7, -74, new Date('2024-07-20'), 'NYC'),
    ];

    render(<Sidebar photos={photos} onLocationSelect={mockOnLocationSelect} />);

    // Should not show trips together since all photos are before Sep 2024
    expect(screen.queryByText(/trips together/)).not.toBeInTheDocument();
  });

  it('should render location list', () => {
    const photos = [
      createPhoto('1', 40.7, -74, new Date('2024-06-15'), 'New York'),
      createPhoto('2', 25.2, 55.3, new Date('2024-06-16'), 'Dubai'),
    ];

    render(<Sidebar photos={photos} onLocationSelect={mockOnLocationSelect} />);

    // "Your Trips" is the section title (CSS transforms to uppercase)
    expect(screen.getByText('Your Trips')).toBeInTheDocument();
    expect(screen.getByText('New York')).toBeInTheDocument();
    expect(screen.getByText('Dubai')).toBeInTheDocument();
  });

  it('should call onLocationSelect when clicking a location', () => {
    const photos = [
      createPhoto('1', 40.7, -74, new Date('2024-06-15'), 'New York'),
    ];

    render(<Sidebar photos={photos} onLocationSelect={mockOnLocationSelect} />);

    fireEvent.click(screen.getByText('New York'));

    expect(mockOnLocationSelect).toHaveBeenCalledTimes(1);
    expect(mockOnLocationSelect).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: '1' })])
    );
  });

  it('should show photo count per location', () => {
    const photos = [
      createPhoto('1', 40.7, -74, new Date('2024-06-15'), 'New York'),
      createPhoto('2', 40.7, -74, new Date('2024-06-16'), 'New York'),
      createPhoto('3', 40.7, -74, new Date('2024-06-17'), 'New York'),
    ];

    render(<Sidebar photos={photos} onLocationSelect={mockOnLocationSelect} />);

    expect(screen.getByText('3 photos')).toBeInTheDocument();
  });

  it('should show "1 photo" for single photo locations', () => {
    const photos = [createPhoto('1', 40.7, -74, new Date('2024-06-15'), 'New York')];

    render(<Sidebar photos={photos} onLocationSelect={mockOnLocationSelect} />);

    expect(screen.getByText('1 photo')).toBeInTheDocument();
  });

  it('should display location thumbnail', () => {
    const photos = [
      createPhoto('1', 40.7, -74, new Date('2024-06-15'), 'New York'),
    ];

    const { container } = render(<Sidebar photos={photos} onLocationSelect={mockOnLocationSelect} />);

    // Find image in the locations section
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://example.com/1_thumb.jpg');
  });

  it('should show coordinates when location has no name', () => {
    const photos = [
      createPhoto('1', 40.7128, -74.006, new Date('2024-06-15')), // No name
    ];

    render(<Sidebar photos={photos} onLocationSelect={mockOnLocationSelect} />);

    // Should show coordinates since no name
    expect(screen.getByText(/40\.71.*-74\.01/)).toBeInTheDocument();
  });

  it('should group photos by normalized city name', () => {
    const photos = [
      createPhoto('1', 40.7, -74, new Date('2024-06-15'), 'New York City'),
      createPhoto('2', 40.8, -73.9, new Date('2024-06-16'), 'NYC'),
      createPhoto('3', 40.75, -73.95, new Date('2024-06-17'), 'New York'),
    ];

    render(<Sidebar photos={photos} onLocationSelect={mockOnLocationSelect} />);

    // Should only show one location entry since they're all NYC
    expect(screen.getByText('3 photos')).toBeInTheDocument();
  });

  it('should sort locations by most recent date', () => {
    const photos = [
      createPhoto('1', 40.7, -74, new Date('2024-06-15'), 'New York'),
      createPhoto('2', 25.2, 55.3, new Date('2024-09-20'), 'Dubai'),
      createPhoto('3', 51.5, -0.12, new Date('2024-07-10'), 'London'),
    ];

    render(<Sidebar photos={photos} onLocationSelect={mockOnLocationSelect} />);

    const locationCards = screen.getAllByRole('button');
    // First button is "Locations" stat card, then location cards
    // Dubai should be first (most recent), then London, then New York
    expect(locationCards[1]).toHaveTextContent('Dubai');
    expect(locationCards[2]).toHaveTextContent('London');
    expect(locationCards[3]).toHaveTextContent('New York');
  });

  it('should handle photos at 0,0 coordinates', () => {
    const photos = [
      createPhoto('1', 0, 0, new Date('2024-06-15'), 'Unknown'),
    ];

    render(<Sidebar photos={photos} onLocationSelect={mockOnLocationSelect} />);

    // 0,0 coordinates should be filtered out from locations
    // But photo count should still show
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
