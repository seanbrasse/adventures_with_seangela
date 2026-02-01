import { useState, useEffect, useCallback } from 'react';
import type { Photo } from '../types/photo';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

const STORAGE_KEY = 'photo-map-photos';

interface StoredPhoto extends Omit<Photo, 'date'> {
  date: string;
}

interface DbPhoto {
  id: string;
  url: string;
  thumbnail: string;
  lat: number;
  lng: number;
  location_name: string | null;
  date: string;
  description: string | null;
  created_at: string;
}

function dbToPhoto(dbPhoto: DbPhoto): Photo {
  return {
    id: dbPhoto.id,
    url: dbPhoto.url,
    thumbnail: dbPhoto.thumbnail,
    location: {
      lat: dbPhoto.lat,
      lng: dbPhoto.lng,
      name: dbPhoto.location_name || undefined,
    },
    date: new Date(dbPhoto.date),
    description: dbPhoto.description || undefined,
  };
}

export function usePhotoStorage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load photos on mount
  useEffect(() => {
    async function loadPhotos() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('photos')
            .select('*')
            .order('date', { ascending: false });

          if (error) {
            console.error('Error loading from Supabase:', error);
            // Fallback to localStorage
            loadFromLocalStorage();
          } else if (data) {
            setPhotos(data.map(dbToPhoto));
          }
        } catch (error) {
          console.error('Error loading photos:', error);
          loadFromLocalStorage();
        }
      } else {
        loadFromLocalStorage();
      }
      setIsLoading(false);
    }

    function loadFromLocalStorage() {
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
        console.error('Error loading from localStorage:', error);
      }
    }

    loadPhotos();
  }, []);

  // Save to localStorage as backup (for offline/fallback)
  useEffect(() => {
    if (!isLoading && photos.length > 0) {
      try {
        const toStore: StoredPhoto[] = photos.map((p) => ({
          ...p,
          date: p.date.toISOString(),
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }
  }, [photos, isLoading]);

  const addPhotos = useCallback(async (newPhotos: Photo[]) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const photosToInsert = newPhotos.map((p) => ({
          id: p.id,
          url: p.url,
          thumbnail: p.thumbnail,
          lat: p.location.lat,
          lng: p.location.lng,
          location_name: p.location.name || null,
          date: p.date.toISOString(),
          description: p.description || null,
        }));

        const { error } = await supabase.from('photos').insert(photosToInsert);

        if (error) {
          console.error('Error saving to Supabase:', error);
        }
      } catch (error) {
        console.error('Error adding photos:', error);
      }
    }

    setPhotos((prev) => [...prev, ...newPhotos]);
  }, []);

  const addPhoto = useCallback((photo: Photo) => {
    addPhotos([photo]);
  }, [addPhotos]);

  const removePhoto = useCallback(async (id: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        // Get photo to find storage path
        const photoToDelete = photos.find(p => p.id === id);

        // Delete from database
        const { error } = await supabase.from('photos').delete().eq('id', id);
        if (error) {
          console.error('Error deleting from Supabase:', error);
        }

        // Delete from storage if it's a Supabase URL
        if (photoToDelete?.url.includes('supabase')) {
          const urlParts = photoToDelete.url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          await supabase.storage.from('photos').remove([fileName]);
        }
      } catch (error) {
        console.error('Error removing photo:', error);
      }
    }

    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, [photos]);

  const updatePhoto = useCallback(async (id: string, updates: Partial<Photo>) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const dbUpdates: Record<string, unknown> = {};
        if (updates.url) dbUpdates.url = updates.url;
        if (updates.thumbnail) dbUpdates.thumbnail = updates.thumbnail;
        if (updates.location) {
          dbUpdates.lat = updates.location.lat;
          dbUpdates.lng = updates.location.lng;
          dbUpdates.location_name = updates.location.name || null;
        }
        if (updates.date) dbUpdates.date = updates.date.toISOString();
        if (updates.description !== undefined) dbUpdates.description = updates.description || null;

        const { error } = await supabase.from('photos').update(dbUpdates).eq('id', id);
        if (error) {
          console.error('Error updating in Supabase:', error);
        }
      } catch (error) {
        console.error('Error updating photo:', error);
      }
    }

    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const clearPhotos = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('photos').delete().neq('id', '');
        if (error) {
          console.error('Error clearing Supabase:', error);
        }
      } catch (error) {
        console.error('Error clearing photos:', error);
      }
    }

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
