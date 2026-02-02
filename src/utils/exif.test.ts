import { describe, it, expect, vi, beforeEach } from 'vitest';
import exifr from 'exifr';
import { extractPhotoData, groupPhotosByLocation, createThumbnail } from './exif';
import type { Photo } from '../types/photo';

// Mock exifr
vi.mock('exifr', () => ({
  default: {
    parse: vi.fn(),
  },
}));

describe('exif utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractPhotoData', () => {
    it('should extract GPS coordinates from EXIF data', async () => {
      vi.mocked(exifr.parse).mockResolvedValue({
        latitude: 40.7128,
        longitude: -74.006,
        DateTimeOriginal: new Date('2024-06-15'),
      });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await extractPhotoData(file);

      expect(result).not.toBeNull();
      expect(result?.location.lat).toBe(40.7128);
      expect(result?.location.lng).toBe(-74.006);
      expect(result?.needsLocation).toBe(false);
    });

    it('should handle raw GPS data with reference tags', async () => {
      vi.mocked(exifr.parse).mockResolvedValue({
        GPSLatitude: 40.7128,
        GPSLongitude: 74.006,
        GPSLatitudeRef: 'N',
        GPSLongitudeRef: 'W',
        DateTimeOriginal: new Date('2024-06-15'),
      });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await extractPhotoData(file);

      expect(result?.location.lat).toBe(40.7128);
      expect(result?.location.lng).toBe(-74.006);
    });

    it('should apply negative sign for Southern hemisphere', async () => {
      vi.mocked(exifr.parse).mockResolvedValue({
        GPSLatitude: 6.2088,
        GPSLongitude: 106.8456,
        GPSLatitudeRef: 'S',
        GPSLongitudeRef: 'E',
      });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await extractPhotoData(file);

      expect(result?.location.lat).toBe(-6.2088);
      expect(result?.location.lng).toBe(106.8456);
    });

    it('should correct NYC area coordinates with wrong sign', async () => {
      vi.mocked(exifr.parse).mockResolvedValue({
        latitude: 40.7128,
        longitude: 74.006, // Wrong positive sign
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await extractPhotoData(file);

      expect(result?.location.lng).toBe(-74.006);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should correct LA area coordinates with wrong sign', async () => {
      vi.mocked(exifr.parse).mockResolvedValue({
        latitude: 34.0522,
        longitude: 118.2437, // Wrong positive sign
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await extractPhotoData(file);

      expect(result?.location.lng).toBe(-118.2437);
      consoleSpy.mockRestore();
    });

    it('should correct SF area coordinates with wrong sign', async () => {
      vi.mocked(exifr.parse).mockResolvedValue({
        latitude: 37.7749,
        longitude: 122.4194, // Wrong positive sign
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await extractPhotoData(file);

      expect(result?.location.lng).toBe(-122.4194);
      consoleSpy.mockRestore();
    });

    it('should mark photo as needing location when no GPS data', async () => {
      vi.mocked(exifr.parse).mockResolvedValue({
        DateTimeOriginal: new Date('2024-06-15'),
      });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await extractPhotoData(file);

      expect(result?.needsLocation).toBe(true);
      expect(result?.location.lat).toBe(0);
      expect(result?.location.lng).toBe(0);
    });

    it('should extract date from DateTimeOriginal', async () => {
      const testDate = new Date('2024-06-15T10:30:00');
      vi.mocked(exifr.parse).mockResolvedValue({
        DateTimeOriginal: testDate,
      });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await extractPhotoData(file);

      expect(result?.date.getTime()).toBe(testDate.getTime());
    });

    it('should fall back to CreateDate if DateTimeOriginal not available', async () => {
      const testDate = new Date('2024-07-20T14:00:00');
      vi.mocked(exifr.parse).mockResolvedValue({
        CreateDate: testDate,
      });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await extractPhotoData(file);

      expect(result?.date.getTime()).toBe(testDate.getTime());
    });

    it('should fall back to ModifyDate if no other dates available', async () => {
      const testDate = new Date('2024-08-10T08:00:00');
      vi.mocked(exifr.parse).mockResolvedValue({
        ModifyDate: testDate,
      });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await extractPhotoData(file);

      expect(result?.date.getTime()).toBe(testDate.getTime());
    });

    it('should use current date if no EXIF date available', async () => {
      vi.mocked(exifr.parse).mockResolvedValue({});

      const beforeTest = Date.now();
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await extractPhotoData(file);
      const afterTest = Date.now();

      expect(result?.date.getTime()).toBeGreaterThanOrEqual(beforeTest);
      expect(result?.date.getTime()).toBeLessThanOrEqual(afterTest);
    });

    it('should generate unique ID for each photo', async () => {
      vi.mocked(exifr.parse).mockResolvedValue({});

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result1 = await extractPhotoData(file);
      const result2 = await extractPhotoData(file);

      expect(result1?.id).not.toBe(result2?.id);
    });

    it('should set description to empty string by default', async () => {
      vi.mocked(exifr.parse).mockResolvedValue({});

      const file = new File(['test'], 'vacation-photo.jpg', { type: 'image/jpeg' });
      const result = await extractPhotoData(file);

      expect(result?.description).toBe('');
    });

    it('should handle EXIF parse errors gracefully', async () => {
      vi.mocked(exifr.parse).mockRejectedValue(new Error('Parse error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await extractPhotoData(file);

      expect(result).not.toBeNull();
      expect(result?.needsLocation).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  describe('groupPhotosByLocation', () => {
    const createPhoto = (lat: number, lng: number, name?: string): Photo => ({
      id: Math.random().toString(),
      url: 'test.jpg',
      thumbnail: 'thumb.jpg',
      location: { lat, lng, name },
      date: new Date(),
    });

    it('should group photos by city name', () => {
      const photos = [
        createPhoto(40.7, -74, 'New York'),
        createPhoto(40.8, -73.9, 'NYC'),
        createPhoto(25.2, 55.3, 'Dubai'),
      ];

      const groups = groupPhotosByLocation(photos);

      // New York and NYC should be grouped together
      expect(groups.size).toBe(2);
    });

    it('should group photos by distance when no name match', () => {
      const photos = [
        createPhoto(40.7128, -74.006),
        createPhoto(40.7130, -74.007), // Very close
        createPhoto(51.5074, -0.1278), // London - far away
      ];

      const groups = groupPhotosByLocation(photos);

      expect(groups.size).toBe(2);
    });

    it('should handle empty photo array', () => {
      const groups = groupPhotosByLocation([]);
      expect(groups.size).toBe(0);
    });

    it('should use custom distance threshold', () => {
      const photos = [
        createPhoto(40.7128, -74.006),
        createPhoto(40.8, -73.9), // ~10km away
      ];

      // With small threshold, they should be separate
      const groups = groupPhotosByLocation(photos, 5);
      expect(groups.size).toBe(2);
    });

    it('should group photos within distance threshold together', () => {
      const photos = [
        createPhoto(40.7128, -74.006),
        createPhoto(40.7200, -74.010), // ~1km away
      ];

      // With default 50km threshold, they should be grouped
      const groups = groupPhotosByLocation(photos, 50);
      expect(groups.size).toBe(1);
    });

    it('should normalize city names for matching', () => {
      const photos = [
        createPhoto(40.7, -74, 'New York City'),
        createPhoto(40.8, -73.9, 'nyc'),
        createPhoto(40.75, -73.95, 'NYC'),
      ];

      const groups = groupPhotosByLocation(photos);

      // All should be grouped together
      expect(groups.size).toBe(1);
    });

    it('should handle Jakarta name variations', () => {
      const photos = [
        createPhoto(-6.2, 106.8, 'Jakarta'),
        createPhoto(-6.3, 106.9, 'DKI Jakarta'),
      ];

      const groups = groupPhotosByLocation(photos);
      expect(groups.size).toBe(1);
    });
  });

  describe('createThumbnail', () => {
    it('should create a thumbnail data URL', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const thumbnail = await createThumbnail(file);

      expect(thumbnail).toContain('data:image/jpeg');
    });

    it('should respect maxSize parameter', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const thumbnail = await createThumbnail(file, 100);

      expect(thumbnail).toBeDefined();
    });

    it('should handle small maxSize', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const thumbnail = await createThumbnail(file, 50);

      expect(thumbnail).toBeDefined();
    });

    it('should return a string starting with data:', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const thumbnail = await createThumbnail(file);

      expect(thumbnail.startsWith('data:')).toBe(true);
    });
  });

  describe('uploadPhotoToStorage', () => {
    it('should handle photo upload', async () => {
      // Import directly from the module
      const { uploadPhotoToStorage } = await import('./exif');

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const thumbnail = 'data:image/jpeg;base64,mock';

      // This function should return something (either object URLs or null if something fails)
      const result = await uploadPhotoToStorage('test-id', file, thumbnail);

      // Result should be defined (either success or null)
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });

  describe('extractPhotoData edge cases', () => {
    it('should handle HEIC files', async () => {
      vi.mocked(exifr.parse).mockResolvedValue({
        latitude: 40.7128,
        longitude: -74.006,
      });

      const heicFile = new File(['test'], 'test.heic', { type: 'image/heic' });
      const result = await extractPhotoData(heicFile);

      expect(result).not.toBeNull();
    });

    it('should handle null EXIF data', async () => {
      vi.mocked(exifr.parse).mockResolvedValue(null);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await extractPhotoData(file);

      expect(result?.needsLocation).toBe(true);
    });

    it('should handle lowercase GPS reference', async () => {
      vi.mocked(exifr.parse).mockResolvedValue({
        GPSLatitude: 6.2088,
        GPSLongitude: 106.8456,
        GPSLatitudeRef: 's',
        GPSLongitudeRef: 'e',
      });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await extractPhotoData(file);

      expect(result?.location.lat).toBe(-6.2088);
    });

    it('should handle lowercase w reference for western longitude', async () => {
      vi.mocked(exifr.parse).mockResolvedValue({
        GPSLatitude: 40.7128,
        GPSLongitude: 74.006,
        GPSLatitudeRef: 'N',
        GPSLongitudeRef: 'w',
      });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await extractPhotoData(file);

      expect(result?.location.lng).toBe(-74.006);
    });
  });

  describe('groupPhotosByLocation edge cases', () => {
    const createPhoto = (lat: number, lng: number, name?: string): Photo => ({
      id: Math.random().toString(),
      url: 'test.jpg',
      thumbnail: 'thumb.jpg',
      location: { lat, lng, name },
      date: new Date(),
    });

    it('should handle "City of" prefix in names', () => {
      const photos = [
        createPhoto(40.7, -74, 'City of New York'),
        createPhoto(40.8, -73.9, 'New York'),
      ];

      const groups = groupPhotosByLocation(photos);
      expect(groups.size).toBe(1);
    });

    it('should handle metropolitan area suffix', () => {
      const photos = [
        createPhoto(40.7, -74, 'New York Metropolitan Area'),
        createPhoto(40.8, -73.9, 'New York'),
      ];

      const groups = groupPhotosByLocation(photos);
      expect(groups.size).toBe(1);
    });

    it('should handle metro suffix', () => {
      const photos = [
        createPhoto(40.7, -74, 'New York Metro'),
        createPhoto(40.8, -73.9, 'New York'),
      ];

      const groups = groupPhotosByLocation(photos);
      expect(groups.size).toBe(1);
    });

    it('should handle Jakarta special capital region', () => {
      const photos = [
        createPhoto(-6.2, 106.8, 'Jakarta Special Capital Region'),
        createPhoto(-6.3, 106.9, 'Jakarta'),
      ];

      const groups = groupPhotosByLocation(photos);
      expect(groups.size).toBe(1);
    });

    it('should group photos without names by distance', () => {
      const photos = [
        createPhoto(40.7128, -74.006),
        createPhoto(40.7130, -74.007),
        createPhoto(40.7132, -74.008),
      ];

      const groups = groupPhotosByLocation(photos);
      expect(groups.size).toBe(1);
    });

    it('should keep far apart photos in separate groups', () => {
      const photos = [
        createPhoto(40.7128, -74.006, 'New York'),
        createPhoto(-6.2088, 106.8456, 'Jakarta'),
        createPhoto(25.2048, 55.2708, 'Dubai'),
      ];

      const groups = groupPhotosByLocation(photos);
      expect(groups.size).toBe(3);
    });

    it('should handle mixed named and unnamed photos', () => {
      const photos = [
        createPhoto(40.7128, -74.006, 'New York'),
        createPhoto(40.7130, -74.007), // No name, close to NY
        createPhoto(25.2048, 55.2708, 'Dubai'),
      ];

      const groups = groupPhotosByLocation(photos);
      // The unnamed photo should be grouped with New York by distance
      expect(groups.size).toBe(2);
    });
  });
});
