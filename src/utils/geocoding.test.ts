import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reverseGeocode, normalizeCityName, groupPhotosByCity } from './geocoding';

describe('geocoding utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reverseGeocode', () => {
    it('should return null if no mapbox token provided', async () => {
      const result = await reverseGeocode(40.7128, -74.006, '');
      expect(result).toBeNull();
    });

    it('should return null for coordinates at 0,0', async () => {
      const result = await reverseGeocode(0, 0, 'test-token');
      expect(result).toBeNull();
    });

    it('should return geocoding result for valid coordinates', async () => {
      const mockResponse = {
        features: [
          {
            text: 'Brooklyn',
            center: [-73.9496, 40.6501],
            context: [{ id: 'country.123', text: 'United States' }],
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await reverseGeocode(40.6501, -73.9496, 'test-token');

      expect(result).toEqual({
        city: 'Brooklyn',
        country: 'United States',
        fullName: 'Brooklyn, United States',
        center: { lat: 40.6501, lng: -73.9496 },
      });
    });

    it('should return fullName without country if country not found', async () => {
      const mockResponse = {
        features: [
          {
            text: 'Unknown Place',
            center: [10, 20],
            context: [],
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await reverseGeocode(20, 10, 'test-token');

      expect(result?.fullName).toBe('Unknown Place');
    });

    it('should return null if API returns no features', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ features: [] }),
      });

      const result = await reverseGeocode(40.7128, -74.006, 'test-token');
      expect(result).toBeNull();
    });

    it('should return null if API request fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await reverseGeocode(40.7128, -74.006, 'test-token');
      expect(result).toBeNull();
    });

    it('should return null and log error on fetch exception', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await reverseGeocode(40.7128, -74.006, 'test-token');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should use original coordinates as fallback if no center in response', async () => {
      const mockResponse = {
        features: [
          {
            text: 'Test City',
            context: [{ id: 'country.1', text: 'Test Country' }],
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await reverseGeocode(40.7128, -74.006, 'test-token');

      expect(result?.center).toEqual({ lat: 40.7128, lng: -74.006 });
    });
  });

  describe('normalizeCityName', () => {
    it('should lowercase and trim input', () => {
      expect(normalizeCityName('  NEW YORK  ')).toBe('new york');
    });

    it('should remove "city of " prefix', () => {
      expect(normalizeCityName('City of Los Angeles')).toBe('los angeles');
    });

    it('should remove " city" suffix', () => {
      expect(normalizeCityName('New York City')).toBe('new york');
    });

    it('should remove " metro" suffix', () => {
      expect(normalizeCityName('Dallas Metro')).toBe('dallas');
    });

    it('should remove " metropolitan area" suffix', () => {
      expect(normalizeCityName('Chicago Metropolitan Area')).toBe('chicago');
    });

    it('should normalize NYC variations to "new york"', () => {
      expect(normalizeCityName('NYC')).toBe('new york');
      expect(normalizeCityName('nyc')).toBe('new york');
    });

    it('should normalize "new york city" to "new york"', () => {
      expect(normalizeCityName('New York City')).toBe('new york');
    });

    it('should normalize Jakarta variations', () => {
      expect(normalizeCityName('Jakarta Special Capital Region')).toBe('jakarta');
      expect(normalizeCityName('DKI Jakarta')).toBe('jakarta');
    });
  });

  describe('groupPhotosByCity', () => {
    it('should group photos by city name', () => {
      const photos = [
        { location: { lat: 40.7, lng: -74, name: 'New York' } },
        { location: { lat: 40.8, lng: -73.9, name: 'NYC' } },
        { location: { lat: 25.2, lng: 55.3, name: 'Dubai' } },
      ];

      const groups = groupPhotosByCity(photos);

      expect(groups.size).toBe(2);
      expect(groups.get('New York')?.length).toBe(2);
      expect(groups.get('Dubai')?.length).toBe(1);
    });

    it('should use "Unknown Location" for photos without name', () => {
      const photos = [
        { location: { lat: 40.7, lng: -74 } },
        { location: { lat: 40.8, lng: -73.9 } },
      ];

      const groups = groupPhotosByCity(photos);

      expect(groups.has('Unknown Location')).toBe(true);
      expect(groups.get('Unknown Location')?.length).toBe(2);
    });

    it('should handle empty photo array', () => {
      const groups = groupPhotosByCity([]);
      expect(groups.size).toBe(0);
    });

    it('should match normalized names correctly', () => {
      const photos = [
        { location: { lat: 40.7, lng: -74, name: 'New York City' } },
        { location: { lat: 40.8, lng: -73.9, name: 'nyc' } },
        { location: { lat: 40.9, lng: -73.8, name: 'NYC' } },
      ];

      const groups = groupPhotosByCity(photos);

      // All should be grouped together
      expect(groups.size).toBe(1);
      const firstGroup = groups.values().next().value;
      expect(firstGroup?.length).toBe(3);
    });
  });
});
