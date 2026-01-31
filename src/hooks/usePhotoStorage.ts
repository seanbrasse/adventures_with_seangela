import { useState, useEffect, useCallback } from 'react';
import type { Photo } from '../types/photo';

const STORAGE_KEY = 'photo-map-photos';

interface StoredPhoto extends Omit<Photo, 'date'> {
  date: string;
}

export function usePhotoStorage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load photos from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredPhoto[] = JSON.parse(stored);
        const photosWithDates = parsed.map((p) => ({
          ...p,
          date: new Date(p.date),
        }));
        setPhotos(photosWithDates);
      }
    } catch (error) {
      console.error('Error loading photos from storage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save photos to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        const toStore: StoredPhoto[] = photos.map((p) => ({
          ...p,
          date: p.date.toISOString(),
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      } catch (error) {
        console.error('Error saving photos to storage:', error);
      }
    }
  }, [photos, isLoading]);

  const addPhoto = useCallback((photo: Photo) => {
    setPhotos((prev) => [...prev, photo]);
  }, []);

  const addPhotos = useCallback((newPhotos: Photo[]) => {
    setPhotos((prev) => [...prev, ...newPhotos]);
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updatePhoto = useCallback((id: string, updates: Partial<Photo>) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const clearPhotos = useCallback(() => {
    setPhotos([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    photos,
    isLoading,
    addPhoto,
    addPhotos,
    removePhoto,
    updatePhoto,
    clearPhotos,
  };
}
