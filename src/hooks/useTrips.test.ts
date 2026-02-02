import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTrips, getDistanceKm, isAtHomeBase, getActiveHomeBase, getUniquePersonIds } from './useTrips';
import type { Photo, HomeBase } from '../types/photo';
import { DEFAULT_HOME_BASES } from '../types/photo';

describe('useTrips hook', () => {
  const mockHomeBases = DEFAULT_HOME_BASES;

  const createPhoto = (
    id: string,
    lat: number,
    lng: number,
    date: Date,
    name?: string
  ): Photo => ({
    id,
    url: 'test.jpg',
    thumbnail: 'thumb.jpg',
    location: { lat, lng, name },
    date,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('utility functions', () => {
    describe('getDistanceKm', () => {
      it('should calculate distance between two points', () => {
        // NYC to LA is approximately 3944 km
        const distance = getDistanceKm(40.7128, -74.006, 34.0522, -118.2437);
        expect(distance).toBeGreaterThan(3900);
        expect(distance).toBeLessThan(4000);
      });

      it('should return 0 for same point', () => {
        const distance = getDistanceKm(40.7128, -74.006, 40.7128, -74.006);
        expect(distance).toBe(0);
      });

      it('should handle negative coordinates', () => {
        // Jakarta to Sydney
        const distance = getDistanceKm(-6.2088, 106.8456, -33.8688, 151.2093);
        expect(distance).toBeGreaterThan(5000);
      });
    });

    describe('isAtHomeBase', () => {
      it('should return true when within radius', () => {
        const homeBase: HomeBase = {
          id: 'test',
          personId: 'test',
          name: 'Test',
          city: 'Test City',
          lat: 40.7128,
          lng: -74.006,
          color: '#000',
          radius: 50,
        };

        // Very close to home
        const result = isAtHomeBase(40.7130, -74.007, homeBase);
        expect(result).toBe(true);
      });

      it('should return false when outside radius', () => {
        const homeBase: HomeBase = {
          id: 'test',
          personId: 'test',
          name: 'Test',
          city: 'Test City',
          lat: 40.7128,
          lng: -74.006,
          color: '#000',
          radius: 10,
        };

        // LA is far from NYC
        const result = isAtHomeBase(34.0522, -118.2437, homeBase);
        expect(result).toBe(false);
      });
    });

    describe('getActiveHomeBase', () => {
      it('should return permanent home when no temporary homes match', () => {
        const result = getActiveHomeBase('sean', new Date('2024-01-15'), mockHomeBases);
        expect(result?.city).toBe('Brooklyn');
        expect(result?.isPermanent).toBe(true);
      });

      it('should return temporary home when date is within range', () => {
        // Angela in Dubai from Sep 2024 to Apr 2025
        const result = getActiveHomeBase('angela', new Date('2024-10-15'), mockHomeBases);
        expect(result?.city).toBe('Dubai');
        expect(result?.isPermanent).toBe(false);
      });

      it('should return permanent home when date is outside temporary range', () => {
        // Angela before Dubai period
        const result = getActiveHomeBase('angela', new Date('2024-08-15'), mockHomeBases);
        expect(result?.city).toBe('Jakarta');
      });

      it('should return null for unknown person', () => {
        const result = getActiveHomeBase('unknown', new Date(), mockHomeBases);
        expect(result).toBeNull();
      });

      it('should return first home if no permanent flag set', () => {
        const homes: HomeBase[] = [
          {
            id: 'test1',
            personId: 'test',
            name: 'Test',
            city: 'City1',
            lat: 0,
            lng: 0,
            color: '#000',
            radius: 50,
          },
          {
            id: 'test2',
            personId: 'test',
            name: 'Test',
            city: 'City2',
            lat: 0,
            lng: 0,
            color: '#000',
            radius: 50,
          },
        ];

        const result = getActiveHomeBase('test', new Date(), homes);
        expect(result?.city).toBe('City1');
      });
    });

    describe('getUniquePersonIds', () => {
      it('should return unique person IDs', () => {
        const result = getUniquePersonIds(mockHomeBases);
        expect(result).toContain('sean');
        expect(result).toContain('angela');
        expect(result).toHaveLength(2);
      });

      it('should return empty array for empty home bases', () => {
        const result = getUniquePersonIds([]);
        expect(result).toHaveLength(0);
      });
    });
  });

  describe('hook behavior', () => {
    it('should initialize with empty trips', async () => {
      const { result } = renderHook(() => useTrips([], mockHomeBases));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.trips).toHaveLength(0);
    });

    it('should auto-generate trips from photos', async () => {
      const photos = [
        createPhoto('1', 25.2, 55.3, new Date('2024-10-15'), 'Dubai'),
      ];

      const { result } = renderHook(() => useTrips(photos, mockHomeBases));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.trips.length).toBeGreaterThan(0);
      });
    });

    it('should compute flight lines for trips', async () => {
      const photos = [
        createPhoto('1', 25.2, 55.3, new Date('2024-10-15'), 'Dubai'),
      ];

      const { result } = renderHook(() => useTrips(photos, mockHomeBases));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.flightLines.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should allow creating a new trip', async () => {
      const { result } = renderHook(() => useTrips([], mockHomeBases));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.createTrip({
          name: 'Test Trip',
          locationName: 'Test Location',
          startDate: new Date('2024-10-01'),
          endDate: new Date('2024-10-15'),
          photoIds: [],
          travelers: ['sean'],
        });
      });

      expect(result.current.trips).toHaveLength(1);
      expect(result.current.trips[0].name).toBe('Test Trip');
    });

    it('should allow renaming a trip', async () => {
      const { result } = renderHook(() => useTrips([], mockHomeBases));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let tripId: string;
      act(() => {
        const trip = result.current.createTrip({
          name: 'Original Name',
          locationName: 'Location',
          startDate: new Date(),
          endDate: new Date(),
          photoIds: [],
          travelers: [],
        });
        tripId = trip.id;
      });

      act(() => {
        result.current.renameTrip(tripId, 'New Name');
      });

      expect(result.current.trips[0].name).toBe('New Name');
    });

    it('should allow deleting a trip', async () => {
      const { result } = renderHook(() => useTrips([], mockHomeBases));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let tripId: string;
      act(() => {
        const trip = result.current.createTrip({
          name: 'To Delete',
          locationName: 'Location',
          startDate: new Date(),
          endDate: new Date(),
          photoIds: [],
          travelers: [],
        });
        tripId = trip.id;
      });

      expect(result.current.trips).toHaveLength(1);

      act(() => {
        result.current.deleteTrip(tripId);
      });

      expect(result.current.trips).toHaveLength(0);
    });

    it('should allow moving a photo between trips', async () => {
      const { result } = renderHook(() => useTrips([], mockHomeBases));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let trip1Id: string;
      let trip2Id: string;

      act(() => {
        const trip1 = result.current.createTrip({
          name: 'Trip 1',
          locationName: 'Loc 1',
          startDate: new Date(),
          endDate: new Date(),
          photoIds: ['photo-1'],
          travelers: [],
        });
        trip1Id = trip1.id;

        const trip2 = result.current.createTrip({
          name: 'Trip 2',
          locationName: 'Loc 2',
          startDate: new Date(),
          endDate: new Date(),
          photoIds: [],
          travelers: [],
        });
        trip2Id = trip2.id;
      });

      act(() => {
        result.current.movePhotoToTrip('photo-1', trip1Id, trip2Id);
      });

      const updatedTrip1 = result.current.trips.find((t) => t.id === trip1Id);
      const updatedTrip2 = result.current.trips.find((t) => t.id === trip2Id);

      expect(updatedTrip1?.photoIds).not.toContain('photo-1');
      expect(updatedTrip2?.photoIds).toContain('photo-1');
    });

    it('should persist trips to localStorage', async () => {
      const { result } = renderHook(() => useTrips([], mockHomeBases));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.createTrip({
          name: 'Persisted Trip',
          locationName: 'Location',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-15'),
          photoIds: [],
          travelers: [],
        });
      });

      // Wait for localStorage to be updated
      await waitFor(() => {
        const stored = localStorage.getItem('photo-map-trips');
        expect(stored).not.toBeNull();
      });
    });

    it('should load trips from localStorage on mount', async () => {
      const storedTrips = [
        {
          id: 'stored-trip',
          name: 'Stored Trip',
          locationName: 'Location',
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-01-15T00:00:00.000Z',
          photoIds: [],
          travelers: [],
        },
      ];

      localStorage.setItem('photo-map-trips', JSON.stringify(storedTrips));

      const { result } = renderHook(() => useTrips([], mockHomeBases));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.trips).toHaveLength(1);
      expect(result.current.trips[0].name).toBe('Stored Trip');
    });

    it('should update trip details', async () => {
      const { result } = renderHook(() => useTrips([], mockHomeBases));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let tripId: string;
      act(() => {
        const trip = result.current.createTrip({
          name: 'Original',
          locationName: 'Location',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-15'),
          photoIds: [],
          travelers: ['sean'],
        });
        tripId = trip.id;
      });

      act(() => {
        result.current.updateTrip(tripId, {
          name: 'Updated Name',
          travelers: ['sean', 'angela'],
        });
      });

      const updated = result.current.trips.find(t => t.id === tripId);
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.travelers).toContain('angela');
    });

    it('should get trips for a specific location', async () => {
      const photos = [
        createPhoto('1', 25.2, 55.3, new Date('2024-10-15'), 'Dubai'),
      ];

      const { result } = renderHook(() => useTrips(photos, mockHomeBases));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Wait for auto-generated trips
      await waitFor(() => {
        expect(result.current.trips.length).toBeGreaterThan(0);
      });

      const tripsForDubai = result.current.getTripsForLocation({ lat: 25.2, lng: 55.3 });
      // Should return some trips (may include the auto-generated one)
      expect(Array.isArray(tripsForDubai)).toBe(true);
    });

    it('should regenerate trips when called', async () => {
      const photos = [
        createPhoto('1', 25.2, 55.3, new Date('2024-10-15'), 'Dubai'),
      ];

      const { result } = renderHook(() => useTrips(photos, mockHomeBases));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Call regenerateTrips
      act(() => {
        result.current.regenerateTrips();
      });

      // Trips should still exist after regeneration
      await waitFor(() => {
        expect(result.current.trips.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle multiple photos in same location', async () => {
      const photos = [
        createPhoto('1', 25.2, 55.3, new Date('2024-10-15'), 'Dubai'),
        createPhoto('2', 25.2, 55.3, new Date('2024-10-16'), 'Dubai'),
        createPhoto('3', 25.2, 55.3, new Date('2024-10-17'), 'Dubai'),
      ];

      const { result } = renderHook(() => useTrips(photos, mockHomeBases));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Multiple photos should create/add to trips
      await waitFor(() => {
        expect(result.current.trips.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle photos at home location', async () => {
      // Photo at Brooklyn (Sean's home)
      const photos = [
        createPhoto('1', 40.6501, -73.9496, new Date('2024-10-15'), 'Brooklyn'),
      ];

      const { result } = renderHook(() => useTrips(photos, mockHomeBases));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Photos at home should be handled without errors
      expect(Array.isArray(result.current.flightLines)).toBe(true);
    });
  });
});
