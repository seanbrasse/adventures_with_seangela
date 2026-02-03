import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlannedTrips } from './usePlannedTrips';

describe('usePlannedTrips hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with empty planned trips', async () => {
    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.plannedTrips).toEqual([]);
  });

  it('should add a planned trip', async () => {
    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newTrip = {
      destinationName: 'Paris',
      lat: 48.8566,
      lng: 2.3522,
      description: 'Romantic getaway',
      thingsToDo: ['Eiffel Tower', 'Louvre Museum'],
      potentialStartDate: new Date('2026-06-01'),
      potentialEndDate: new Date('2026-06-07'),
      bookingStatus: 'idea' as const,
      notes: 'Need to book hotels',
    };

    act(() => {
      result.current.addPlannedTrip(newTrip);
    });

    expect(result.current.plannedTrips).toHaveLength(1);
    expect(result.current.plannedTrips[0].destinationName).toBe('Paris');
    expect(result.current.plannedTrips[0].lat).toBe(48.8566);
    expect(result.current.plannedTrips[0].lng).toBe(2.3522);
    expect(result.current.plannedTrips[0].description).toBe('Romantic getaway');
    expect(result.current.plannedTrips[0].thingsToDo).toEqual(['Eiffel Tower', 'Louvre Museum']);
    expect(result.current.plannedTrips[0].bookingStatus).toBe('idea');
    expect(result.current.plannedTrips[0].id).toBeDefined();
    expect(result.current.plannedTrips[0].createdAt).toBeInstanceOf(Date);
    expect(result.current.plannedTrips[0].updatedAt).toBeInstanceOf(Date);
  });

  it('should update a planned trip', async () => {
    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Add a trip first
    act(() => {
      result.current.addPlannedTrip({
        destinationName: 'Tokyo',
        lat: 35.6762,
        lng: 139.6503,
        description: 'Japan adventure',
        thingsToDo: ['Shibuya'],
        bookingStatus: 'idea',
      });
    });

    const tripId = result.current.plannedTrips[0].id;
    const originalUpdatedAt = result.current.plannedTrips[0].updatedAt;

    // Wait a bit to ensure updatedAt changes
    await new Promise(resolve => setTimeout(resolve, 10));

    act(() => {
      result.current.updatePlannedTrip(tripId, {
        bookingStatus: 'booked',
        description: 'Japan adventure - booked!',
      });
    });

    expect(result.current.plannedTrips[0].bookingStatus).toBe('booked');
    expect(result.current.plannedTrips[0].description).toBe('Japan adventure - booked!');
    expect(result.current.plannedTrips[0].updatedAt.getTime()).toBeGreaterThanOrEqual(
      originalUpdatedAt.getTime()
    );
  });

  it('should delete a planned trip', async () => {
    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Add two trips
    act(() => {
      result.current.addPlannedTrip({
        destinationName: 'London',
        lat: 51.5074,
        lng: -0.1278,
        thingsToDo: [],
        bookingStatus: 'idea',
      });
    });

    act(() => {
      result.current.addPlannedTrip({
        destinationName: 'Rome',
        lat: 41.9028,
        lng: 12.4964,
        thingsToDo: [],
        bookingStatus: 'researching',
      });
    });

    expect(result.current.plannedTrips).toHaveLength(2);

    const londonTripId = result.current.plannedTrips[0].id;

    act(() => {
      result.current.deletePlannedTrip(londonTripId);
    });

    expect(result.current.plannedTrips).toHaveLength(1);
    expect(result.current.plannedTrips[0].destinationName).toBe('Rome');
  });

  it('should get planned trip by id', async () => {
    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.addPlannedTrip({
        destinationName: 'Barcelona',
        lat: 41.3851,
        lng: 2.1734,
        thingsToDo: ['La Sagrada Familia'],
        bookingStatus: 'booked',
      });
    });

    const tripId = result.current.plannedTrips[0].id;
    const foundTrip = result.current.getPlannedTripById(tripId);

    expect(foundTrip).toBeDefined();
    expect(foundTrip?.destinationName).toBe('Barcelona');
  });

  it('should return undefined for non-existent trip id', async () => {
    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const foundTrip = result.current.getPlannedTripById('non-existent-id');
    expect(foundTrip).toBeUndefined();
  });

  it('should persist planned trips to localStorage', async () => {
    const { result, unmount } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.addPlannedTrip({
        destinationName: 'Sydney',
        lat: -33.8688,
        lng: 151.2093,
        thingsToDo: ['Opera House'],
        bookingStatus: 'idea',
      });
    });

    // Unmount to trigger save
    unmount();

    // Check localStorage
    const stored = localStorage.getItem('photo-map-planned-trips');
    expect(stored).toBeDefined();

    const parsed = JSON.parse(stored!);
    expect(parsed.version).toBe(1);
    expect(parsed.trips).toHaveLength(1);
    expect(parsed.trips[0].destinationName).toBe('Sydney');
  });

  it('should load planned trips from localStorage on mount', async () => {
    // Pre-populate localStorage
    const storedData = {
      version: 1,
      trips: [
        {
          id: 'test-trip-1',
          destinationName: 'Amsterdam',
          lat: 52.3676,
          lng: 4.9041,
          thingsToDo: ['Canal Tour'],
          bookingStatus: 'researching',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    };
    localStorage.setItem('photo-map-planned-trips', JSON.stringify(storedData));

    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.plannedTrips).toHaveLength(1);
    expect(result.current.plannedTrips[0].destinationName).toBe('Amsterdam');
    expect(result.current.plannedTrips[0].createdAt).toBeInstanceOf(Date);
    expect(result.current.plannedTrips[0].updatedAt).toBeInstanceOf(Date);
  });

  it('should handle invalid localStorage data gracefully', async () => {
    // Store invalid data
    localStorage.setItem('photo-map-planned-trips', 'invalid-json');

    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should fall back to empty array
    expect(result.current.plannedTrips).toEqual([]);
  });

  it('should ignore data with wrong version', async () => {
    // Store data with wrong version
    const storedData = {
      version: 999,
      trips: [
        {
          id: 'old-trip',
          destinationName: 'Old Trip',
          lat: 0,
          lng: 0,
          thingsToDo: [],
          bookingStatus: 'idea',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    localStorage.setItem('photo-map-planned-trips', JSON.stringify(storedData));

    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should not load trips with wrong version
    expect(result.current.plannedTrips).toEqual([]);
  });

  it('should handle trips without optional dates', async () => {
    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.addPlannedTrip({
        destinationName: 'Vienna',
        lat: 48.2082,
        lng: 16.3738,
        thingsToDo: [],
        bookingStatus: 'idea',
        // No potentialStartDate or potentialEndDate
      });
    });

    expect(result.current.plannedTrips[0].potentialStartDate).toBeUndefined();
    expect(result.current.plannedTrips[0].potentialEndDate).toBeUndefined();
  });

  it('should generate unique ids for trips', async () => {
    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.addPlannedTrip({
        destinationName: 'Trip 1',
        lat: 0,
        lng: 0,
        thingsToDo: [],
        bookingStatus: 'idea',
      });
    });

    act(() => {
      result.current.addPlannedTrip({
        destinationName: 'Trip 2',
        lat: 0,
        lng: 0,
        thingsToDo: [],
        bookingStatus: 'idea',
      });
    });

    expect(result.current.plannedTrips[0].id).not.toBe(result.current.plannedTrips[1].id);
  });
});
