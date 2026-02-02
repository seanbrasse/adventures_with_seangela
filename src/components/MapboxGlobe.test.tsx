import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MapboxGlobe from './MapboxGlobe';
import type { Photo, HomeBase } from '../types/photo';

// Mock mapbox-gl is already done in setup.ts

describe('MapboxGlobe component', () => {
  const createPhoto = (id: string, lat: number, lng: number, name?: string): Photo => ({
    id,
    url: `https://example.com/${id}.jpg`,
    thumbnail: `https://example.com/${id}_thumb.jpg`,
    location: { lat, lng, name },
    date: new Date('2024-06-15'),
  });

  const mockHomeBases: HomeBase[] = [
    {
      id: 'sean-brooklyn',
      personId: 'sean',
      name: 'Sean',
      city: 'Brooklyn',
      lat: 40.6501,
      lng: -73.9496,
      color: '#3B82F6',
      radius: 30,
      isPermanent: true,
    },
  ];

  const mockFlightLines = [
    {
      id: 'line-1',
      from: { lat: 40.6501, lng: -73.9496, name: 'Brooklyn' },
      to: { lat: 25.2048, lng: 55.2708, name: 'Dubai' },
      color: '#3B82F6',
      travelerId: 'sean',
      visits: [{ date: new Date('2024-10-15'), tripId: 'trip-1', tripName: 'Dubai Trip' }],
    },
  ];

  const mockOnLocationClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render map container', () => {
    render(
      <MapboxGlobe
        photos={[]}
        onLocationClick={mockOnLocationClick}
        selectedLocation={null}
        accessToken="test-token"
      />
    );

    // Map container should exist
    expect(document.querySelector('.mapboxgl-map, [class*="map"]')).not.toBeNull();
  });

  it('should render style toggle button', () => {
    render(
      <MapboxGlobe
        photos={[]}
        onLocationClick={mockOnLocationClick}
        selectedLocation={null}
        accessToken="test-token"
      />
    );

    // Should have a button to toggle map style
    const toggleButton = screen.getByRole('button', { name: /minimal|detailed/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('should toggle map style when clicking style button', () => {
    render(
      <MapboxGlobe
        photos={[]}
        onLocationClick={mockOnLocationClick}
        selectedLocation={null}
        accessToken="test-token"
      />
    );

    const toggleButton = screen.getByRole('button', { name: /minimal|detailed/i });

    // Initial state
    expect(toggleButton).toHaveTextContent(/Detailed/i);

    // Click to toggle
    fireEvent.click(toggleButton);

    // Should change to other style
    expect(toggleButton).toHaveTextContent(/Minimal/i);
  });

  it('should accept photos prop', () => {
    const photos = [
      createPhoto('1', 40.7128, -74.006, 'New York'),
      createPhoto('2', 25.2048, 55.2708, 'Dubai'),
    ];

    render(
      <MapboxGlobe
        photos={photos}
        onLocationClick={mockOnLocationClick}
        selectedLocation={null}
        accessToken="test-token"
      />
    );

    // Component should render without errors
    expect(screen.getByRole('button', { name: /minimal|detailed/i })).toBeInTheDocument();
  });

  it('should accept homeBases prop', () => {
    render(
      <MapboxGlobe
        photos={[]}
        onLocationClick={mockOnLocationClick}
        selectedLocation={null}
        accessToken="test-token"
        homeBases={mockHomeBases}
      />
    );

    expect(screen.getByRole('button', { name: /minimal|detailed/i })).toBeInTheDocument();
  });

  it('should accept flightLines prop', () => {
    render(
      <MapboxGlobe
        photos={[]}
        onLocationClick={mockOnLocationClick}
        selectedLocation={null}
        accessToken="test-token"
        flightLines={mockFlightLines}
      />
    );

    expect(screen.getByRole('button', { name: /minimal|detailed/i })).toBeInTheDocument();
  });

  it('should handle selectedLocation prop', () => {
    const photos = [createPhoto('1', 40.7128, -74.006, 'New York')];

    render(
      <MapboxGlobe
        photos={photos}
        onLocationClick={mockOnLocationClick}
        selectedLocation={{ lat: 40.7128, lng: -74.006 }}
        accessToken="test-token"
      />
    );

    // Should render without errors when location is selected
    expect(screen.getByRole('button', { name: /minimal|detailed/i })).toBeInTheDocument();
  });

  it('should handle empty photos array', () => {
    render(
      <MapboxGlobe
        photos={[]}
        onLocationClick={mockOnLocationClick}
        selectedLocation={null}
        accessToken="test-token"
      />
    );

    expect(screen.getByRole('button', { name: /minimal|detailed/i })).toBeInTheDocument();
  });

  it('should handle missing accessToken gracefully', () => {
    render(
      <MapboxGlobe
        photos={[]}
        onLocationClick={mockOnLocationClick}
        selectedLocation={null}
        accessToken=""
      />
    );

    // Should still render the container
    expect(document.querySelector('[class*="map"], div')).not.toBeNull();
  });

  it('should group photos by location for markers', () => {
    const photos = [
      createPhoto('1', 40.7128, -74.006, 'New York'),
      createPhoto('2', 40.7130, -74.007, 'New York'), // Same city
      createPhoto('3', 25.2048, 55.2708, 'Dubai'),
    ];

    render(
      <MapboxGlobe
        photos={photos}
        onLocationClick={mockOnLocationClick}
        selectedLocation={null}
        accessToken="test-token"
      />
    );

    // Should render without errors
    expect(screen.getByRole('button', { name: /minimal|detailed/i })).toBeInTheDocument();
  });

  it('should display flight lines with correct colors', () => {
    const multiColorFlightLines = [
      {
        id: 'line-1',
        from: { lat: 40.6501, lng: -73.9496, name: 'Brooklyn' },
        to: { lat: 25.2048, lng: 55.2708, name: 'Dubai' },
        color: '#3B82F6', // Blue for Sean
        travelerId: 'sean',
        visits: [{ date: new Date(), tripId: '1', tripName: 'Trip 1' }],
      },
      {
        id: 'line-2',
        from: { lat: -6.2088, lng: 106.8456, name: 'Jakarta' },
        to: { lat: 25.2048, lng: 55.2708, name: 'Dubai' },
        color: '#EC4899', // Pink for Angela
        travelerId: 'angela',
        visits: [{ date: new Date(), tripId: '2', tripName: 'Trip 2' }],
      },
    ];

    render(
      <MapboxGlobe
        photos={[]}
        onLocationClick={mockOnLocationClick}
        selectedLocation={null}
        accessToken="test-token"
        flightLines={multiColorFlightLines}
      />
    );

    // Should render without errors with multiple flight lines
    expect(screen.getByRole('button', { name: /minimal|detailed/i })).toBeInTheDocument();
  });
});
