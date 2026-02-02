import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Photo } from '../types/photo';

// Create mock Supabase client
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockNeq = vi.fn();
const mockStorageRemove = vi.fn();

const mockSupabase = {
  from: vi.fn(() => ({
    select: mockSelect.mockReturnValue({
      order: mockOrder,
    }),
    insert: mockInsert,
    update: mockUpdate.mockReturnValue({
      eq: mockEq,
    }),
    delete: mockDelete.mockReturnValue({
      eq: mockEq,
      neq: mockNeq,
    }),
  })),
  storage: {
    from: vi.fn(() => ({
      remove: mockStorageRemove,
    })),
  },
};

// Mock the supabase module with Supabase configured
vi.mock('../utils/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: mockSupabase,
}));

describe('usePhotoStorage with Supabase configured', () => {
  const createPhoto = (id: string): Photo => ({
    id,
    url: `https://supabase.co/${id}.jpg`,
    thumbnail: `https://supabase.co/${id}_thumb.jpg`,
    location: { lat: 40.7128, lng: -74.006, name: 'New York' },
    date: new Date('2024-06-15'),
    description: `Photo ${id}`,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Default mock implementations
    mockOrder.mockResolvedValue({
      data: [],
      error: null,
    });
    mockInsert.mockResolvedValue({ error: null });
    mockEq.mockResolvedValue({ error: null });
    mockNeq.mockResolvedValue({ error: null });
    mockStorageRemove.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should load photos from Supabase on mount', async () => {
    mockOrder.mockResolvedValue({
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
    });

    const { usePhotoStorage } = await import('./usePhotoStorage');
    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('photos');
    expect(result.current.photos).toHaveLength(1);
    expect(result.current.photos[0].id).toBe('supabase-1');
  });

  it('should handle Supabase load error and fallback to localStorage', async () => {
    mockOrder.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const storedPhotos = [
      {
        id: 'local-1',
        url: 'https://local.com/1.jpg',
        thumbnail: 'https://local.com/1_thumb.jpg',
        location: { lat: 40.7128, lng: -74.006 },
        date: '2024-06-15T00:00:00.000Z',
      },
    ];
    localStorage.setItem('photo-map-photos', JSON.stringify(storedPhotos));

    const { usePhotoStorage } = await import('./usePhotoStorage');
    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(result.current.photos).toHaveLength(1);
    expect(result.current.photos[0].id).toBe('local-1');

    consoleSpy.mockRestore();
  });

  it('should add photos to Supabase', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const { usePhotoStorage } = await import('./usePhotoStorage');
    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newPhoto = createPhoto('new-1');

    await act(async () => {
      await result.current.addPhotos([newPhoto]);
    });

    expect(mockInsert).toHaveBeenCalled();
    expect(result.current.photos).toHaveLength(1);
  });

  it('should handle Supabase insert error', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: { message: 'Insert error' } });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { usePhotoStorage } = await import('./usePhotoStorage');
    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newPhoto = createPhoto('new-1');

    await act(async () => {
      await result.current.addPhotos([newPhoto]);
    });

    expect(consoleSpy).toHaveBeenCalled();
    // Photo should still be added to local state
    expect(result.current.photos).toHaveLength(1);

    consoleSpy.mockRestore();
  });

  it('should remove photo from Supabase', async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'to-remove',
          url: 'https://supabase.co/1.jpg',
          thumbnail: 'https://supabase.co/1_thumb.jpg',
          lat: 40.7128,
          lng: -74.006,
          location_name: 'NYC',
          date: '2024-06-15T00:00:00.000Z',
          description: 'To remove',
          created_at: '2024-06-15T00:00:00.000Z',
        },
      ],
      error: null,
    });

    const { usePhotoStorage } = await import('./usePhotoStorage');
    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.removePhoto('to-remove');
    });

    expect(mockDelete).toHaveBeenCalled();
    expect(result.current.photos).toHaveLength(0);
  });

  it('should update photo in Supabase', async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'to-update',
          url: 'https://supabase.co/1.jpg',
          thumbnail: 'https://supabase.co/1_thumb.jpg',
          lat: 40.7128,
          lng: -74.006,
          location_name: 'NYC',
          date: '2024-06-15T00:00:00.000Z',
          description: 'Original',
          created_at: '2024-06-15T00:00:00.000Z',
        },
      ],
      error: null,
    });

    const { usePhotoStorage } = await import('./usePhotoStorage');
    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updatePhoto('to-update', {
        description: 'Updated',
        url: 'https://new-url.com/1.jpg',
        thumbnail: 'https://new-url.com/1_thumb.jpg',
        date: new Date('2024-07-01'),
        location: { lat: 41, lng: -75, name: 'Philadelphia' },
      });
    });

    expect(mockUpdate).toHaveBeenCalled();
    expect(result.current.photos[0].description).toBe('Updated');
  });

  it('should clear all photos from Supabase', async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'photo-1',
          url: 'https://supabase.co/1.jpg',
          thumbnail: 'https://supabase.co/1_thumb.jpg',
          lat: 40.7128,
          lng: -74.006,
          location_name: 'NYC',
          date: '2024-06-15T00:00:00.000Z',
          description: 'Photo 1',
          created_at: '2024-06-15T00:00:00.000Z',
        },
      ],
      error: null,
    });

    const { usePhotoStorage } = await import('./usePhotoStorage');
    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.clearPhotos();
    });

    expect(mockDelete).toHaveBeenCalled();
    expect(result.current.photos).toHaveLength(0);
  });

  it('should handle network exception during load', async () => {
    mockOrder.mockRejectedValue(new Error('Network error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { usePhotoStorage } = await import('./usePhotoStorage');
    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should convert database photo to Photo object correctly', async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'db-photo',
          url: 'https://supabase.co/photo.jpg',
          thumbnail: 'https://supabase.co/thumb.jpg',
          lat: -6.2088,
          lng: 106.8456,
          location_name: 'Jakarta',
          date: '2024-10-15T12:00:00.000Z',
          description: 'Jakarta trip',
          created_at: '2024-10-15T00:00:00.000Z',
        },
      ],
      error: null,
    });

    const { usePhotoStorage } = await import('./usePhotoStorage');
    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const photo = result.current.photos[0];
    expect(photo.id).toBe('db-photo');
    expect(photo.url).toBe('https://supabase.co/photo.jpg');
    expect(photo.location.lat).toBe(-6.2088);
    expect(photo.location.lng).toBe(106.8456);
    expect(photo.location.name).toBe('Jakarta');
    expect(photo.date).toBeInstanceOf(Date);
    expect(photo.description).toBe('Jakarta trip');
  });

  it('should handle null location_name from database', async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'no-name',
          url: 'https://supabase.co/photo.jpg',
          thumbnail: 'https://supabase.co/thumb.jpg',
          lat: 40.7128,
          lng: -74.006,
          location_name: null,
          date: '2024-06-15T00:00:00.000Z',
          description: null,
          created_at: '2024-06-15T00:00:00.000Z',
        },
      ],
      error: null,
    });

    const { usePhotoStorage } = await import('./usePhotoStorage');
    const { result } = renderHook(() => usePhotoStorage());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const photo = result.current.photos[0];
    expect(photo.location.name).toBeUndefined();
    expect(photo.description).toBeUndefined();
  });
});
