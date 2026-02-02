import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Photo, Trip, HomeBase } from '../types/photo';
import { groupPhotosByLocation } from '../utils/exif';

const TRIPS_KEY = 'photo-map-trips';
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

interface StoredTrip extends Omit<Trip, 'startDate' | 'endDate'> {
  startDate: string;
  endDate: string;
}

// Normalize city names for route consolidation
// Extracts the primary city name and normalizes variations
function normalizeCityName(name: string): string {
  // First, extract the primary city (usually first part before comma)
  const parts = name.split(',').map((p) => p.trim());
  let city = parts[0];

  // Check if any part is a known major city (handle cases like "Dubai Marina, Dubai")
  const knownCities = [
    'dubai',
    'jakarta',
    'new york',
    'nyc',
    'singapore',
    'tokyo',
    'london',
    'paris',
    'bali',
    'bangkok',
    'hong kong',
  ];

  for (const part of parts) {
    const lowerPart = part.toLowerCase().trim();
    if (knownCities.includes(lowerPart)) {
      city = part;
      break;
    }
  }

  // Normalize the city name
  return city
    .toLowerCase()
    .trim()
    .replace(/^city of /i, '')
    .replace(/ city$/i, '')
    .replace(/ metro$/i, '')
    .replace(/ metropolitan area$/i, '')
    .replace(/new york city/i, 'new york')
    .replace(/nyc/i, 'new york')
    .replace(/jakarta special capital region/i, 'jakarta')
    .replace(/dki jakarta/i, 'jakarta');
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

// Get unique person IDs from home bases
function getUniquePersonIds(homeBases: HomeBase[]): string[] {
  return [...new Set(homeBases.map((hb) => hb.personId))];
}

// Find the active home base for a person at a given date
function getActiveHomeBase(
  personId: string,
  date: Date,
  homeBases: HomeBase[]
): HomeBase | null {
  const personHomeBases = homeBases.filter((hb) => hb.personId === personId);
  if (personHomeBases.length === 0) return null;

  // First, check for a temporary home base that's active at this date
  for (const hb of personHomeBases) {
    if (!hb.isPermanent && hb.startDate && hb.endDate) {
      if (date >= hb.startDate && date <= hb.endDate) {
        return hb;
      }
    }
  }

  // Fall back to permanent home base
  const permanent = personHomeBases.find((hb) => hb.isPermanent);
  return permanent || personHomeBases[0];
}

// Determine which travelers went to a location (those not at their home at that time)
function determineTravelers(
  locationLat: number,
  locationLng: number,
  tripDate: Date,
  homeBases: HomeBase[]
): string[] {
  const travelers: string[] = [];
  const personIds = getUniquePersonIds(homeBases);

  for (const personId of personIds) {
    const activeHome = getActiveHomeBase(personId, tripDate, homeBases);
    if (!activeHome) continue;

    // If the location is NOT at this person's active home, they traveled there
    if (!isAtHomeBase(locationLat, locationLng, activeHome)) {
      travelers.push(personId);
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
        const startDate = currentTrip.photos[0].date;
        const travelers = determineTravelers(
          currentTrip.lat,
          currentTrip.lng,
          startDate,
          homeBases
        );
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
    const startDate = currentTrip.photos[0].date;
    const travelers = determineTravelers(
      currentTrip.lat,
      currentTrip.lng,
      startDate,
      homeBases
    );
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
  const lastPhotoIdsRef = useRef<string>('');

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

  // Auto-regenerate trips when photos change
  useEffect(() => {
    if (!isLoading && photos.length > 0) {
      // Create a stable key for current photo IDs
      const currentPhotoIds = photos.map((p) => p.id).sort().join(',');

      // Only process if photos actually changed
      if (currentPhotoIds !== lastPhotoIdsRef.current) {
        lastPhotoIdsRef.current = currentPhotoIds;

        // Always regenerate trips when photos change
        // This ensures new photos get their own trips
        const autoTrips = autoGenerateTrips(photos, homeBases);
        setTrips(autoTrips);
      }
    }
  }, [photos, homeBases, isLoading]);

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
  // Consolidate multiple trips to same destination into single lines
  const flightLines = useMemo(() => {
    // Group all photos to find where markers are actually displayed
    // This ensures flight lines go to the exact marker positions
    const photoGroups = groupPhotosByLocation(photos);

    // Create a map from photo ID to its marker coordinates
    const photoToMarkerCoords = new Map<string, { lat: number; lng: number }>();
    for (const [key, groupPhotos] of photoGroups) {
      const [lat, lng] = key.split(',').map(Number);
      for (const photo of groupPhotos) {
        photoToMarkerCoords.set(photo.id, { lat, lng });
      }
    }

    // First, collect all individual flight line data
    const rawLines: {
      tripId: string;
      tripName: string;
      from: { lat: number; lng: number; name: string };
      to: { lat: number; lng: number; name: string };
      color: string;
      travelerId: string;
      startDate: Date;
    }[] = [];

    for (const trip of trips) {
      const tripPhotos = photos.filter((p) => trip.photoIds.includes(p.id));
      if (tripPhotos.length === 0) continue;

      // Get the marker coordinates for this trip's photos
      // Use the coordinates where the marker is actually displayed
      const markerCoords = photoToMarkerCoords.get(tripPhotos[0].id);
      const destLat = markerCoords?.lat ?? tripPhotos[0].location.lat;
      const destLng = markerCoords?.lng ?? tripPhotos[0].location.lng;

      // Create lines for each traveler (now using personId)
      for (const personId of trip.travelers) {
        // Find the active home base for this person at the trip's start date
        const activeHome = getActiveHomeBase(personId, trip.startDate, homeBases);
        if (!activeHome) continue;

        // Check if there's a custom start point for this traveler
        const customStart = trip.customStartPoints?.find(
          (sp) => sp.homeBaseId === personId
        );

        const from = customStart
          ? { lat: customStart.lat, lng: customStart.lng, name: customStart.name }
          : { lat: activeHome.lat, lng: activeHome.lng, name: activeHome.city };

        rawLines.push({
          tripId: trip.id,
          tripName: trip.name,
          from,
          to: { lat: destLat, lng: destLng, name: trip.locationName },
          color: activeHome.color,
          travelerId: personId,
          startDate: trip.startDate,
        });
      }
    }

    // Now consolidate lines with same from->to route for same traveler
    const consolidatedMap = new Map<
      string,
      {
        id: string;
        from: { lat: number; lng: number; name: string };
        to: { lat: number; lng: number; name: string };
        color: string;
        travelerId: string;
        visits: { date: Date; tripId: string; tripName: string }[];
      }
    >();

    for (const line of rawLines) {
      // Create a key based on normalized city names and traveler
      // This ensures "Dubai Marina, Dubai" and "Dubai, UAE" consolidate together
      const normalizedFrom = normalizeCityName(line.from.name);
      const normalizedTo = normalizeCityName(line.to.name);
      const routeKey = `${normalizedFrom}->${normalizedTo}::${line.travelerId}`;

      if (consolidatedMap.has(routeKey)) {
        // Add this visit to existing route
        const existing = consolidatedMap.get(routeKey)!;
        existing.visits.push({
          date: line.startDate,
          tripId: line.tripId,
          tripName: line.tripName,
        });
      } else {
        // Create new consolidated route
        consolidatedMap.set(routeKey, {
          id: `route-${normalizedFrom}-${normalizedTo}-${line.travelerId}`,
          from: line.from,
          to: line.to,
          color: line.color,
          travelerId: line.travelerId,
          visits: [
            {
              date: line.startDate,
              tripId: line.tripId,
              tripName: line.tripName,
            },
          ],
        });
      }
    }

    // Convert to array and sort visits by date (newest first for display)
    const consolidated = Array.from(consolidatedMap.values()).map((route) => ({
      ...route,
      visits: route.visits.sort((a, b) => b.date.getTime() - a.date.getTime()),
    }));

    return consolidated;
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

export { getDistanceKm, isAtHomeBase, getActiveHomeBase, getUniquePersonIds };
