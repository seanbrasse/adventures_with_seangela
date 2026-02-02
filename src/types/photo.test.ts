import { describe, it, expect } from 'vitest';
import { DEFAULT_HOME_BASES } from './photo';
import type { Photo, HomeBase, PhotoLocation, Trip, AppSettings } from './photo';

describe('photo types', () => {
  describe('DEFAULT_HOME_BASES', () => {
    it('should have correct number of home bases', () => {
      expect(DEFAULT_HOME_BASES).toHaveLength(3);
    });

    it('should have Sean home base in Brooklyn', () => {
      const seanHome = DEFAULT_HOME_BASES.find((hb) => hb.personId === 'sean');
      expect(seanHome).toBeDefined();
      expect(seanHome?.city).toBe('Brooklyn');
      expect(seanHome?.isPermanent).toBe(true);
      expect(seanHome?.color).toBe('#3B82F6');
    });

    it('should have Angela permanent home base in Jakarta', () => {
      const angelaJakarta = DEFAULT_HOME_BASES.find(
        (hb) => hb.personId === 'angela' && hb.city === 'Jakarta'
      );
      expect(angelaJakarta).toBeDefined();
      expect(angelaJakarta?.isPermanent).toBe(true);
      expect(angelaJakarta?.color).toBe('#EC4899');
    });

    it('should have Angela temporary home base in Dubai', () => {
      const angelaDubai = DEFAULT_HOME_BASES.find(
        (hb) => hb.personId === 'angela' && hb.city === 'Dubai'
      );
      expect(angelaDubai).toBeDefined();
      expect(angelaDubai?.isPermanent).toBe(false);
      expect(angelaDubai?.startDate).toBeDefined();
      expect(angelaDubai?.endDate).toBeDefined();
    });

    it('should have valid coordinates for Brooklyn', () => {
      const seanHome = DEFAULT_HOME_BASES.find((hb) => hb.personId === 'sean');
      expect(seanHome?.lat).toBeCloseTo(40.6501, 2);
      expect(seanHome?.lng).toBeCloseTo(-73.9496, 2);
    });

    it('should have valid coordinates for Jakarta', () => {
      const jakartaHome = DEFAULT_HOME_BASES.find(
        (hb) => hb.city === 'Jakarta'
      );
      expect(jakartaHome?.lat).toBeCloseTo(-6.2088, 2);
      expect(jakartaHome?.lng).toBeCloseTo(106.8456, 2);
    });

    it('should have valid coordinates for Dubai', () => {
      const dubaiHome = DEFAULT_HOME_BASES.find((hb) => hb.city === 'Dubai');
      expect(dubaiHome?.lat).toBeCloseTo(25.2048, 2);
      expect(dubaiHome?.lng).toBeCloseTo(55.2708, 2);
    });

    it('should have radius defined for all home bases', () => {
      DEFAULT_HOME_BASES.forEach((hb) => {
        expect(hb.radius).toBeGreaterThan(0);
      });
    });

    it('should have unique IDs for all home bases', () => {
      const ids = DEFAULT_HOME_BASES.map((hb) => hb.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('type structures', () => {
    it('should allow creating a valid Photo object', () => {
      const photo: Photo = {
        id: 'test-id',
        url: 'https://example.com/photo.jpg',
        thumbnail: 'https://example.com/thumb.jpg',
        location: { lat: 40.7128, lng: -74.006, name: 'New York' },
        date: new Date('2024-01-15'),
        description: 'Test photo',
      };

      expect(photo.id).toBe('test-id');
      expect(photo.location.name).toBe('New York');
    });

    it('should allow creating a PhotoLocation without name', () => {
      const location: PhotoLocation = {
        lat: 40.7128,
        lng: -74.006,
      };

      expect(location.name).toBeUndefined();
    });

    it('should allow creating a HomeBase with optional dates', () => {
      const homeBase: HomeBase = {
        id: 'test-home',
        personId: 'test-person',
        name: 'Test Person',
        city: 'Test City',
        lat: 0,
        lng: 0,
        color: '#000000',
        radius: 50,
      };

      expect(homeBase.startDate).toBeUndefined();
      expect(homeBase.endDate).toBeUndefined();
      expect(homeBase.isPermanent).toBeUndefined();
    });

    it('should allow creating a Trip object', () => {
      const trip: Trip = {
        id: 'trip-1',
        name: 'Summer Vacation',
        locationName: 'Paris',
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-07-15'),
        photoIds: ['photo-1', 'photo-2'],
        travelers: ['sean'],
      };

      expect(trip.photoIds).toHaveLength(2);
    });

    it('should allow creating AppSettings', () => {
      const settings: AppSettings = {
        homeBases: DEFAULT_HOME_BASES,
      };

      expect(settings.homeBases).toBe(DEFAULT_HOME_BASES);
    });
  });
});
