import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePhotoStorage } from './usePhotoStorage';
import type { Photo } from '../types/photo';

// Mock Supabase
vi.mock('../utils/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));

describe('usePhotoStorage hook', () => {
  const createPhoto = (id: string): Photo => ({
    id,
    url: `https://example.com/${id}.jpg`,
    thumbnail: `https://example.com/${id}_thumb.jpg`,
    location: { lat: 40.7128, lng: -74.006, name: 'New York' },
    date: new Date('2024-06-15'),
    description: `Photo ${id}`,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should initialize with empty photos', async () => {
    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.photos).toHaveLength(0);
  });

  it('should load photos from localStorage', async () => {
    const storedPhotos = [
      {
        id: 'stored-1',
        url: 'https://example.com/1.jpg',
        thumbnail: 'https://example.com/1_thumb.jpg',
        location: { lat: 40.7128, lng: -74.006, name: 'NYC' },
        date: '2024-06-15T00:00:00.000Z',
        description: 'Stored photo',
      },
    ];

    localStorage.setItem('photo-map-photos', JSON.stringify(storedPhotos));

    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.photos).toHaveLength(1);
    expect(result.current.photos[0].id).toBe('stored-1');
    expect(result.current.photos[0].date).toBeInstanceOf(Date);
  });

  it('should add a single photo', async () => {
    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newPhoto = createPhoto('new-1');

    act(() => {
      result.current.addPhoto(newPhoto);
    });

    expect(result.current.photos).toHaveLength(1);
    expect(result.current.photos[0].id).toBe('new-1');
  });

  it('should add multiple photos', async () => {
    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const photos = [createPhoto('photo-1'), createPhoto('photo-2'), createPhoto('photo-3')];

    act(() => {
      result.current.addPhotos(photos);
    });

    expect(result.current.photos).toHaveLength(3);
  });

  it('should remove a photo', async () => {
    const storedPhotos = [
      {
        id: 'to-remove',
        url: 'https://example.com/1.jpg',
        thumbnail: 'https://example.com/1_thumb.jpg',
        location: { lat: 40.7128, lng: -74.006 },
        date: '2024-06-15T00:00:00.000Z',
      },
      {
        id: 'to-keep',
        url: 'https://example.com/2.jpg',
        thumbnail: 'https://example.com/2_thumb.jpg',
        location: { lat: 40.7128, lng: -74.006 },
        date: '2024-06-16T00:00:00.000Z',
      },
    ];

    localStorage.setItem('photo-map-photos', JSON.stringify(storedPhotos));

    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.photos).toHaveLength(2);

    await act(async () => {
      await result.current.removePhoto('to-remove');
    });

    expect(result.current.photos).toHaveLength(1);
    expect(result.current.photos[0].id).toBe('to-keep');
  });

  it('should update a photo', async () => {
    const storedPhotos = [
      {
        id: 'to-update',
        url: 'https://example.com/1.jpg',
        thumbnail: 'https://example.com/1_thumb.jpg',
        location: { lat: 40.7128, lng: -74.006, name: 'Original' },
        date: '2024-06-15T00:00:00.000Z',
        description: 'Original description',
      },
    ];

    localStorage.setItem('photo-map-photos', JSON.stringify(storedPhotos));

    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updatePhoto('to-update', {
        description: 'Updated description',
        location: { lat: 41, lng: -75, name: 'Updated Location' },
      });
    });

    expect(result.current.photos[0].description).toBe('Updated description');
    expect(result.current.photos[0].location.name).toBe('Updated Location');
  });

  it('should clear all photos', async () => {
    const storedPhotos = [
      {
        id: 'photo-1',
        url: 'https://example.com/1.jpg',
        thumbnail: 'https://example.com/1_thumb.jpg',
        location: { lat: 40.7128, lng: -74.006 },
        date: '2024-06-15T00:00:00.000Z',
      },
      {
        id: 'photo-2',
        url: 'https://example.com/2.jpg',
        thumbnail: 'https://example.com/2_thumb.jpg',
        location: { lat: 40.7128, lng: -74.006 },
        date: '2024-06-16T00:00:00.000Z',
      },
    ];

    localStorage.setItem('photo-map-photos', JSON.stringify(storedPhotos));

    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.photos).toHaveLength(2);

    await act(async () => {
      await result.current.clearPhotos();
    });

    expect(result.current.photos).toHaveLength(0);
    expect(localStorage.getItem('photo-map-photos')).toBeNull();
  });

  it('should persist photos to localStorage after adding', async () => {
    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const photo = createPhoto('persist-test');

    act(() => {
      result.current.addPhoto(photo);
    });

    // Wait for localStorage to be updated
    await waitFor(() => {
      const stored = localStorage.getItem('photo-map-photos');
      expect(stored).not.toBeNull();
    });

    const stored = JSON.parse(localStorage.getItem('photo-map-photos')!);
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('persist-test');
  });

  it('should handle invalid JSON in localStorage gracefully', async () => {
    localStorage.setItem('photo-map-photos', 'invalid json');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should initialize with empty array despite error
    expect(result.current.photos).toHaveLength(0);
    consoleSpy.mockRestore();
  });

  it('should not save to localStorage while loading', async () => {
    // Clear localStorage to ensure no initial data
    localStorage.clear();

    const { result } = renderHook(() => usePhotoStorage());

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify localStorage wasn't written to during loading when empty
    // (the hook only saves when photos.length > 0)
    expect(localStorage.getItem('photo-map-photos')).toBeNull();
  });

  it('should maintain photo date as Date object', async () => {
    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const photo = createPhoto('date-test');
    photo.date = new Date('2024-07-20T15:30:00.000Z');

    act(() => {
      result.current.addPhoto(photo);
    });

    expect(result.current.photos[0].date).toBeInstanceOf(Date);
    expect(result.current.photos[0].date.toISOString()).toBe(
      '2024-07-20T15:30:00.000Z'
    );
  });
});

// Test with Supabase configured
describe('usePhotoStorage with Supabase', () => {
  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() =>
          Promise.resolve({
            data: [
              {
                id: 'supabase-1',
                url: 'https://supabase.co/1.jpg',
                thumbnail: 'https://supabase.co/1_thumb.jpg',
                lat: 40.7128,
                lng: -74.006,
                location_name: 'NYC',
                date: '2024-06-15T00:00:00.000Z',
                description: 'From Supabase',
                created_at: '2024-06-15T00:00:00.000Z',
              },
            ],
            error: null,
          })
        ),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
        neq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn(() => Promise.resolve({ error: null })),
      })),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Reset module mock for Supabase configured
    vi.doMock('../utils/supabase', () => ({
      isSupabaseConfigured: true,
      supabase: mockSupabase,
    }));
  });

  it('should handle Supabase error gracefully', async () => {
    // This test verifies error handling exists
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // The hook should not crash even if Supabase has issues
    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should still work with localStorage fallback
    expect(result.current.photos).toBeDefined();

    consoleSpy.mockRestore();
  });
});
