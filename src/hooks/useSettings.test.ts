import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSettings } from './useSettings';
import { DEFAULT_HOME_BASES } from '../types/photo';

describe('useSettings hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should initialize with default home bases', async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings.homeBases).toEqual(DEFAULT_HOME_BASES);
  });

  it('should load settings from localStorage', async () => {
    const customHomeBases = [
      {
        id: 'custom-home',
        personId: 'custom',
        name: 'Custom Person',
        city: 'Custom City',
        lat: 10,
        lng: 20,
        color: '#FF0000',
        radius: 25,
      },
    ];

    const storedSettings = {
      version: 3,
      homeBases: customHomeBases,
    };

    localStorage.setItem('photo-map-settings', JSON.stringify(storedSettings));

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings.homeBases).toHaveLength(1);
    expect(result.current.settings.homeBases[0].city).toBe('Custom City');
  });

  it('should reset to defaults when version mismatch', async () => {
    const oldSettings = {
      version: 1, // Old version
      homeBases: [
        {
          id: 'old-home',
          personId: 'old',
          name: 'Old',
          city: 'Old City',
          lat: 0,
          lng: 0,
          color: '#000',
          radius: 10,
        },
      ],
    };

    localStorage.setItem('photo-map-settings', JSON.stringify(oldSettings));

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should use defaults because version is wrong
    expect(result.current.settings.homeBases).toEqual(DEFAULT_HOME_BASES);
  });

  it('should update a home base', async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateHomeBase('sean-brooklyn', { city: 'Manhattan' });
    });

    const seanHome = result.current.settings.homeBases.find(
      (hb) => hb.id === 'sean-brooklyn'
    );
    expect(seanHome?.city).toBe('Manhattan');
  });

  it('should add a new home base', async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newHomeBase = {
      id: 'new-home',
      personId: 'sean',
      name: 'Sean',
      city: 'Boston',
      lat: 42.3601,
      lng: -71.0589,
      color: '#3B82F6',
      radius: 30,
    };

    act(() => {
      result.current.addHomeBase(newHomeBase);
    });

    expect(result.current.settings.homeBases).toContainEqual(newHomeBase);
    expect(result.current.settings.homeBases).toHaveLength(
      DEFAULT_HOME_BASES.length + 1
    );
  });

  it('should remove a home base', async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialLength = result.current.settings.homeBases.length;

    act(() => {
      result.current.removeHomeBase('angela-dubai');
    });

    expect(result.current.settings.homeBases).toHaveLength(initialLength - 1);
    expect(
      result.current.settings.homeBases.find((hb) => hb.id === 'angela-dubai')
    ).toBeUndefined();
  });

  it('should reset to defaults', async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Modify settings
    act(() => {
      result.current.updateHomeBase('sean-brooklyn', { city: 'Modified' });
    });

    expect(result.current.settings.homeBases[0].city).toBe('Modified');

    // Reset
    act(() => {
      result.current.resetToDefaults();
    });

    expect(result.current.settings.homeBases).toEqual(DEFAULT_HOME_BASES);
  });

  it('should persist changes to localStorage', async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateHomeBase('sean-brooklyn', { radius: 100 });
    });

    // Wait for localStorage to be updated
    await waitFor(() => {
      const stored = localStorage.getItem('photo-map-settings');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      const seanHome = parsed.homeBases.find(
        (hb: { id: string }) => hb.id === 'sean-brooklyn'
      );
      expect(seanHome.radius).toBe(100);
    });
  });

  it('should handle dates correctly when loading from storage', async () => {
    const storedSettings = {
      version: 3,
      homeBases: [
        {
          id: 'angela-dubai',
          personId: 'angela',
          name: 'Angela',
          city: 'Dubai',
          lat: 25.2048,
          lng: 55.2708,
          color: '#EC4899',
          radius: 30,
          startDate: '2024-09-01T00:00:00.000Z',
          endDate: '2025-04-30T00:00:00.000Z',
          isPermanent: false,
        },
      ],
    };

    localStorage.setItem('photo-map-settings', JSON.stringify(storedSettings));

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const dubaiHome = result.current.settings.homeBases[0];
    expect(dubaiHome.startDate).toBeInstanceOf(Date);
    expect(dubaiHome.endDate).toBeInstanceOf(Date);
  });

  it('should handle invalid JSON in localStorage', async () => {
    localStorage.setItem('photo-map-settings', 'invalid json');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should fall back to defaults
    expect(result.current.settings.homeBases).toEqual(DEFAULT_HOME_BASES);
    consoleSpy.mockRestore();
  });

  it('should reset when home bases lack personId', async () => {
    const invalidSettings = {
      version: 3,
      homeBases: [
        {
          id: 'invalid',
          // Missing personId
          name: 'Invalid',
          city: 'City',
          lat: 0,
          lng: 0,
          color: '#000',
          radius: 10,
        },
      ],
    };

    localStorage.setItem('photo-map-settings', JSON.stringify(invalidSettings));

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should use defaults due to invalid data
    expect(result.current.settings.homeBases).toEqual(DEFAULT_HOME_BASES);
  });
});
