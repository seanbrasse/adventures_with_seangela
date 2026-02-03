import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlannedTrips } from './usePlannedTrips';
import type { PlannedTrip } from '../types/photo';

describe('usePlannedTrips hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const createMockPlannedTrip = (overrides?: Partial<PlannedTrip>): Omit<PlannedTrip, 'id' | 'createdAt' | 'updatedAt'> => ({
    destinationName: 'Tokyo, Japan',
    lat: 35.6762,
    lng: 139.6503,
    description: 'Dream trip to Japan',
    thingsToDo: ['Visit temples', 'Try ramen'],
    bookingStatus: 'idea',
    notes: 'Need to save up',
    ...overrides,
  });

  it('should initialize with empty planned trips', async () => {
    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.plannedTrips).toEqual([]);
  });

  it('should load planned trips from localStorage', async () => {
    const storedData = {
      version: 1,
      trips: [
        {
          id: 'trip-1',
          destinationName: 'Paris, France',
          lat: 48.8566,
          lng: 2.3522,
          thingsToDo: ['See Eiffel Tower'],
          bookingStatus: 'researching',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ],
    };

    localStorage.setItem('photo-map-planned-trips', JSON.stringify(storedData));

    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.plannedTrips).toHaveLength(1);
    expect(result.current.plannedTrips[0].destinationName).toBe('Paris, France');
  });

  it('should add a new planned trip', async () => {
    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newTrip = createMockPlannedTrip();

    act(() => {
      result.current.addPlannedTrip(newTrip);
    });

    expect(result.current.plannedTrips).toHaveLength(1);
    expect(result.current.plannedTrips[0].destinationName).toBe('Tokyo, Japan');
    expect(result.current.plannedTrips[0].id).toBeDefined();
    expect(result.current.plannedTrips[0].createdAt).toBeInstanceOf(Date);
    expect(result.current.plannedTrips[0].updatedAt).toBeInstanceOf(Date);
  });

  it('should update an existing planned trip', async () => {
    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Add a trip first
    act(() => {
      result.current.addPlannedTrip(createMockPlannedTrip());
    });

    const tripId = result.current.plannedTrips[0].id;

    // Update the trip
    act(() => {
      result.current.updatePlannedTrip(tripId, {
        bookingStatus: 'booked',
        description: 'Trip is booked!',
      });
    });

    expect(result.current.plannedTrips[0].bookingStatus).toBe('booked');
    expect(result.current.plannedTrips[0].description).toBe('Trip is booked!');
    expect(result.current.plannedTrips[0].destinationName).toBe('Tokyo, Japan'); // unchanged
  });

  it('should delete a planned trip', async () => {
    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Add two trips
    act(() => {
      result.current.addPlannedTrip(createMockPlannedTrip({ destinationName: 'Tokyo' }));
    });
    act(() => {
      result.current.addPlannedTrip(createMockPlannedTrip({ destinationName: 'Paris' }));
    });

    expect(result.current.plannedTrips).toHaveLength(2);

    const tripIdToDelete = result.current.plannedTrips[0].id;

    act(() => {
      result.current.deletePlannedTrip(tripIdToDelete);
    });

    expect(result.current.plannedTrips).toHaveLength(1);
    expect(result.current.plannedTrips[0].destinationName).toBe('Paris');
  });

  it('should get a planned trip by id', async () => {
    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.addPlannedTrip(createMockPlannedTrip({ destinationName: 'Tokyo' }));
    });

    const tripId = result.current.plannedTrips[0].id;
    const trip = result.current.getPlannedTripById(tripId);

    expect(trip).toBeDefined();
    expect(trip?.destinationName).toBe('Tokyo');
  });

  it('should return undefined for non-existent trip id', async () => {
    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const trip = result.current.getPlannedTripById('non-existent-id');
    expect(trip).toBeUndefined();
  });

  it('should persist changes to localStorage', async () => {
    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.addPlannedTrip(createMockPlannedTrip());
    });

    await waitFor(() => {
      const stored = localStorage.getItem('photo-map-planned-trips');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.version).toBe(1);
      expect(parsed.trips).toHaveLength(1);
      expect(parsed.trips[0].destinationName).toBe('Tokyo, Japan');
    });
  });

  it('should handle dates correctly when loading from storage', async () => {
    const storedData = {
      version: 1,
      trips: [
        {
          id: 'trip-1',
          destinationName: 'Paris',
          lat: 48.8566,
          lng: 2.3522,
          thingsToDo: [],
          bookingStatus: 'booked',
          potentialStartDate: '2025-06-01T00:00:00.000Z',
          potentialEndDate: '2025-06-15T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ],
    };

    localStorage.setItem('photo-map-planned-trips', JSON.stringify(storedData));

    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const trip = result.current.plannedTrips[0];
    expect(trip.potentialStartDate).toBeInstanceOf(Date);
    expect(trip.potentialEndDate).toBeInstanceOf(Date);
    expect(trip.createdAt).toBeInstanceOf(Date);
    expect(trip.updatedAt).toBeInstanceOf(Date);
  });

  it('should handle invalid JSON in localStorage', async () => {
    localStorage.setItem('photo-map-planned-trips', 'invalid json');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should fall back to empty array
    expect(result.current.plannedTrips).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('should handle all booking statuses', async () => {
    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Add trips with different statuses
    act(() => {
      result.current.addPlannedTrip(createMockPlannedTrip({
        destinationName: 'Idea Trip',
        bookingStatus: 'idea'
      }));
    });
    act(() => {
      result.current.addPlannedTrip(createMockPlannedTrip({
        destinationName: 'Research Trip',
        bookingStatus: 'researching'
      }));
    });
    act(() => {
      result.current.addPlannedTrip(createMockPlannedTrip({
        destinationName: 'Booked Trip',
        bookingStatus: 'booked'
      }));
    });

    expect(result.current.plannedTrips).toHaveLength(3);
    expect(result.current.plannedTrips.find(t => t.bookingStatus === 'idea')).toBeDefined();
    expect(result.current.plannedTrips.find(t => t.bookingStatus === 'researching')).toBeDefined();
    expect(result.current.plannedTrips.find(t => t.bookingStatus === 'booked')).toBeDefined();
  });

  it('should handle trips with optional fields', async () => {
    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Add a minimal trip without optional fields
    act(() => {
      result.current.addPlannedTrip({
        destinationName: 'Minimal Trip',
        lat: 0,
        lng: 0,
        thingsToDo: [],
        bookingStatus: 'idea',
      });
    });

    const trip = result.current.plannedTrips[0];
    expect(trip.description).toBeUndefined();
    expect(trip.potentialStartDate).toBeUndefined();
    expect(trip.potentialEndDate).toBeUndefined();
    expect(trip.notes).toBeUndefined();
  });

  it('should update updatedAt timestamp when updating a trip', async () => {
    const { result } = renderHook(() => usePlannedTrips());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.addPlannedTrip(createMockPlannedTrip());
    });

    const originalUpdatedAt = result.current.plannedTrips[0].updatedAt;
    const tripId = result.current.plannedTrips[0].id;

    // Wait a bit to ensure timestamp differs
    await new Promise(resolve => setTimeout(resolve, 10));

    act(() => {
      result.current.updatePlannedTrip(tripId, { description: 'Updated' });
    });

    expect(result.current.plannedTrips[0].updatedAt.getTime())
      .toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
  });
});
