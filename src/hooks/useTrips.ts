import { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Photo, Trip, HomeBase } from '../types/photo';

const TRIPS_KEY = 'photo-map-trips';
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

interface StoredTrip extends Omit<Trip, 'startDate' | 'endDate'> {
  startDate: string;
  endDate: string;
}

// Calculate distance between two points in km (Haversine formula)
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if a location is within a home base
function isAtHomeBase(lat: number, lng: number, homeBase: HomeBase): boolean {
  const distance = getDistanceKm(lat, lng, homeBase.lat, homeBase.lng);
  return distance <= homeBase.radius;
}

// Determine which travelers went to a location (those not at their home)
function determineTravelers(
  locationLat: number,
  locationLng: number,
  homeBases: HomeBase[]
): string[] {
  const travelers: string[] = [];

  for (const hb of homeBases) {
    // If the location is NOT at this person's home, they traveled there
    if (!isAtHomeBase(locationLat, locationLng, hb)) {
      travelers.push(hb.id);
    }
  }

  return travelers;
}

// Auto-generate trips from photos based on date proximity and location
function autoGenerateTrips(photos: Photo[], homeBases: HomeBase[]): Trip[] {
  if (photos.length === 0) return [];

  // Sort photos by date
  const sortedPhotos = [...photos].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const trips: Trip[] = [];
  let currentTrip: {
    photos: Photo[];
    locationKey: string;
    lat: number;
    lng: number;
  } | null = null;

  for (const photo of sortedPhotos) {
    const locationKey = `${photo.location.lat.toFixed(1)},${photo.location.lng.toFixed(1)}`;

    if (!currentTrip) {
      // Start a new trip
      currentTrip = {
        photos: [photo],
        locationKey,
        lat: photo.location.lat,
        lng: photo.location.lng,
      };
    } else {
      const lastPhotoDate = currentTrip.photos[currentTrip.photos.length - 1].date;
      const timeDiff = photo.date.getTime() - lastPhotoDate.getTime();
      const isSameLocation = locationKey === currentTrip.locationKey;
      const isWithinTwoWeeks = timeDiff <= TWO_WEEKS_MS;

      if (isSameLocation && isWithinTwoWeeks) {
        // Add to current trip
        currentTrip.photos.push(photo);
      } else {
        // Finalize current trip and start a new one
        const travelers = determineTravelers(
          currentTrip.lat,
          currentTrip.lng,
          homeBases
        );

        const startDate = currentTrip.photos[0].date;
        const endDate = currentTrip.photos[currentTrip.photos.length - 1].date;
        const locationName =
          currentTrip.photos[0].location.name ||
          `${currentTrip.lat.toFixed(2)}, ${currentTrip.lng.toFixed(2)}`;

        trips.push({
          id: uuidv4(),
          name: `${locationName} - ${startDate.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          })}`,
          locationName,
          startDate,
          endDate,
          photoIds: currentTrip.photos.map((p) => p.id),
          travelers,
        });

        // Start new trip
        currentTrip = {
          photos: [photo],
          locationKey,
          lat: photo.location.lat,
          lng: photo.location.lng,
        };
      }
    }
  }

  // Don't forget the last trip
  if (currentTrip && currentTrip.photos.length > 0) {
    const travelers = determineTravelers(
      currentTrip.lat,
      currentTrip.lng,
      homeBases
    );

    const startDate = currentTrip.photos[0].date;
    const endDate = currentTrip.photos[currentTrip.photos.length - 1].date;
    const locationName =
      currentTrip.photos[0].location.name ||
      `${currentTrip.lat.toFixed(2)}, ${currentTrip.lng.toFixed(2)}`;

    trips.push({
      id: uuidv4(),
      name: `${locationName} - ${startDate.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })}`,
      locationName,
      startDate,
      endDate,
      photoIds: currentTrip.photos.map((p) => p.id),
      travelers,
    });
  }

  return trips;
}

export function useTrips(photos: Photo[], homeBases: HomeBase[]) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load trips from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TRIPS_KEY);
      if (stored) {
        const parsed: StoredTrip[] = JSON.parse(stored);
        const tripsWithDates = parsed.map((t) => ({
          ...t,
          startDate: new Date(t.startDate),
          endDate: new Date(t.endDate),
        }));
        setTrips(tripsWithDates);
      }
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save trips to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        const toStore: StoredTrip[] = trips.map((t) => ({
          ...t,
          startDate: t.startDate.toISOString(),
          endDate: t.endDate.toISOString(),
        }));
        localStorage.setItem(TRIPS_KEY, JSON.stringify(toStore));
      } catch (error) {
        console.error('Error saving trips:', error);
      }
    }
  }, [trips, isLoading]);

  // Auto-regenerate trips when photos change and no manual trips exist
  useEffect(() => {
    if (!isLoading && photos.length > 0 && trips.length === 0) {
      const autoTrips = autoGenerateTrips(photos, homeBases);
      setTrips(autoTrips);
    }
  }, [photos, homeBases, isLoading, trips.length]);

  const regenerateTrips = useCallback(() => {
    const autoTrips = autoGenerateTrips(photos, homeBases);
    setTrips(autoTrips);
  }, [photos, homeBases]);

  const updateTrip = useCallback((id: string, updates: Partial<Trip>) => {
    setTrips((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const renameTrip = useCallback((id: string, name: string) => {
    updateTrip(id, { name });
  }, [updateTrip]);

  const deleteTrip = useCallback((id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const createTrip = useCallback((trip: Omit<Trip, 'id'>) => {
    const newTrip: Trip = {
      ...trip,
      id: uuidv4(),
    };
    setTrips((prev) => [...prev, newTrip]);
    return newTrip;
  }, []);

  const movePhotoToTrip = useCallback(
    (photoId: string, fromTripId: string, toTripId: string) => {
      setTrips((prev) =>
        prev.map((t) => {
          if (t.id === fromTripId) {
            return {
              ...t,
              photoIds: t.photoIds.filter((id) => id !== photoId),
            };
          }
          if (t.id === toTripId) {
            return {
              ...t,
              photoIds: [...t.photoIds, photoId],
            };
          }
          return t;
        })
      );
    },
    []
  );

  // Get trips for a specific location
  const getTripsForLocation = useCallback(
    (lat: number, lng: number, threshold = 0.5) => {
      return trips.filter((trip) => {
        const tripPhotos = photos.filter((p) => trip.photoIds.includes(p.id));
        if (tripPhotos.length === 0) return false;

        // Check if any photo in the trip is near this location
        return tripPhotos.some((p) => {
          const distance = getDistanceKm(lat, lng, p.location.lat, p.location.lng);
          return distance < threshold * 111; // Convert degrees to km roughly
        });
      });
    },
    [trips, photos]
  );

  // Compute flight lines based on trips and home bases
  const flightLines = useMemo(() => {
    const lines: {
      id: string;
      tripId: string;
      tripName: string;
      from: { lat: number; lng: number; name: string };
      to: { lat: number; lng: number; name: string };
      color: string;
      travelerId: string;
    }[] = [];

    for (const trip of trips) {
      const tripPhotos = photos.filter((p) => trip.photoIds.includes(p.id));
      if (tripPhotos.length === 0) continue;

      // Get destination (average location of photos)
      const destLat =
        tripPhotos.reduce((sum, p) => sum + p.location.lat, 0) / tripPhotos.length;
      const destLng =
        tripPhotos.reduce((sum, p) => sum + p.location.lng, 0) / tripPhotos.length;

      // Create lines for each traveler
      for (const travelerId of trip.travelers) {
        const homeBase = homeBases.find((hb) => hb.id === travelerId);
        if (!homeBase) continue;

        // Check if there's a custom start point for this traveler
        const customStart = trip.customStartPoints?.find(
          (sp) => sp.homeBaseId === travelerId
        );

        const from = customStart
          ? { lat: customStart.lat, lng: customStart.lng, name: customStart.name }
          : { lat: homeBase.lat, lng: homeBase.lng, name: homeBase.city };

        lines.push({
          id: `${trip.id}-${travelerId}`,
          tripId: trip.id,
          tripName: trip.name,
          from,
          to: { lat: destLat, lng: destLng, name: trip.locationName },
          color: homeBase.color,
          travelerId,
        });
      }
    }

    return lines;
  }, [trips, photos, homeBases]);

  return {
    trips,
    isLoading,
    flightLines,
    regenerateTrips,
    updateTrip,
    renameTrip,
    deleteTrip,
    createTrip,
    movePhotoToTrip,
    getTripsForLocation,
  };
}

export { getDistanceKm, isAtHomeBase };
