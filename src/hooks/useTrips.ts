import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Photo, Trip, HomeBase } from '../types/photo';

const TRIPS_KEY = 'photo-map-trips';
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

interface StoredTrip extends Omit<Trip, 'startDate' | 'endDate'> {
  startDate: string;
  endDate: string;
}

// Minimum distance (in km) for a trip to be considered a "real" trip
// Trips shorter than this are local movement within the same city/metro
const MIN_TRIP_DISTANCE_KM = 40;

// Maximum distance (in km) to consider photos part of the same trip
// This handles day trips to nearby cities (e.g., Dubai to Abu Dhabi ~130km)
const MAX_TRIP_RADIUS_KM = 200;

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

  // NYC neighborhoods that should normalize to "new york"
  const nycNeighborhoods = [
    'manhattan',
    'brooklyn',
    'queens',
    'bronx',
    'staten island',
    'harlem',
    'williamsburg',
    'bushwick',
    'greenpoint',
    'astoria',
    'flushing',
    'soho',
    'tribeca',
    'chelsea',
    'midtown',
    'lower east side',
    'upper east side',
    'upper west side',
    'east village',
    'west village',
    'financial district',
    'dumbo',
    'park slope',
    'cobble hill',
    'carroll gardens',
    'prospect heights',
    'crown heights',
    'bed-stuy',
    'bedford-stuyvesant',
    'fort greene',
    'clinton hill',
    'long island city',
  ];

  for (const part of parts) {
    const lowerPart = part.toLowerCase().trim();
    if (knownCities.includes(lowerPart)) {
      city = part;
      break;
    }
    // Check for NYC neighborhoods
    if (nycNeighborhoods.includes(lowerPart)) {
      return 'new york';
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

// Check if two locations are in the same city/metro area
// Returns true if they should NOT be considered a trip between them
function isSameCityOrTooClose(
  fromLat: number,
  fromLng: number,
  fromName: string,
  toLat: number,
  toLng: number,
  toName: string
): boolean {
  // Check distance first - if very close, it's the same area
  const distance = getDistanceKm(fromLat, fromLng, toLat, toLng);
  if (distance < MIN_TRIP_DISTANCE_KM) {
    return true;
  }

  // Check if normalized city names match
  const normalizedFrom = normalizeCityName(fromName);
  const normalizedTo = normalizeCityName(toName);
  if (normalizedFrom === normalizedTo) {
    return true;
  }

  return false;
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

// Generate a stable trip ID based on location and start date
// This ensures customizations are preserved when trips are regenerated
function generateStableTripId(locationKey: string, startDate: Date): string {
  const dateKey = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
  return `trip-${locationKey}-${dateKey}`;
}

// Calculate centroid of a set of coordinates
function calculateCentroid(photos: Photo[]): { lat: number; lng: number } {
  if (photos.length === 0) return { lat: 0, lng: 0 };
  if (photos.length === 1) return { lat: photos[0].location.lat, lng: photos[0].location.lng };

  const sum = photos.reduce(
    (acc, p) => ({ lat: acc.lat + p.location.lat, lng: acc.lng + p.location.lng }),
    { lat: 0, lng: 0 }
  );
  return { lat: sum.lat / photos.length, lng: sum.lng / photos.length };
}

// Auto-generate trips from photos based on date proximity and location
// Preserves existing trip customizations (name, description) when regenerating
// Uses distance-based grouping to merge nearby locations (e.g., Dubai + Abu Dhabi = one trip)
function autoGenerateTrips(photos: Photo[], homeBases: HomeBase[], existingTrips: Trip[] = []): Trip[] {
  if (photos.length === 0) return [];

  // Create maps to lookup existing trips by various keys
  // This allows us to find and preserve customizations when photos merge or move
  const existingTripById = new Map<string, Trip>();
  const existingTripByPhotoId = new Map<string, Trip>();

  for (const trip of existingTrips) {
    existingTripById.set(trip.id, trip);
    for (const photoId of trip.photoIds) {
      existingTripByPhotoId.set(photoId, trip);
    }
  }

  // Helper to find the best existing trip for a set of photos
  // Prefers trips that have customizations (non-auto-generated name or description)
  const findBestExistingTrip = (photoIds: string[], _locationName: string, _startDate: Date): Trip | undefined => {
    // Find all existing trips that share photos with this new trip
    const matchingTrips = new Set<Trip>();
    for (const photoId of photoIds) {
      const existingTrip = existingTripByPhotoId.get(photoId);
      if (existingTrip) {
        matchingTrips.add(existingTrip);
      }
    }

    if (matchingTrips.size === 0) return undefined;

    // If there's only one matching trip, use it
    if (matchingTrips.size === 1) {
      return Array.from(matchingTrips)[0];
    }

    // If multiple trips match, prefer one with customizations
    const tripsArray = Array.from(matchingTrips);
    const customized = tripsArray.find(t =>
      t.description || !t.name.includes(' - ')
    );
    if (customized) return customized;

    // Otherwise return the one with the most photo overlap
    return tripsArray.sort((a, b) => {
      const aOverlap = a.photoIds.filter(id => photoIds.includes(id)).length;
      const bOverlap = b.photoIds.filter(id => photoIds.includes(id)).length;
      return bOverlap - aOverlap;
    })[0];
  };

  // Sort photos by date
  const sortedPhotos = [...photos].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const trips: Trip[] = [];
  let currentTrip: {
    photos: Photo[];
    centroid: { lat: number; lng: number };
  } | null = null;

  for (const photo of sortedPhotos) {
    if (!currentTrip) {
      // Start a new trip
      currentTrip = {
        photos: [photo],
        centroid: { lat: photo.location.lat, lng: photo.location.lng },
      };
    } else {
      const lastPhotoDate = currentTrip.photos[currentTrip.photos.length - 1].date;
      const timeDiff = photo.date.getTime() - lastPhotoDate.getTime();
      const isWithinTwoWeeks = timeDiff <= TWO_WEEKS_MS;

      // Check if the new photo is within the trip radius from the centroid
      const distanceFromCentroid = getDistanceKm(
        currentTrip.centroid.lat,
        currentTrip.centroid.lng,
        photo.location.lat,
        photo.location.lng
      );
      const isWithinTripRadius = distanceFromCentroid <= MAX_TRIP_RADIUS_KM;

      if (isWithinTripRadius && isWithinTwoWeeks) {
        // Add to current trip and update centroid
        currentTrip.photos.push(photo);
        currentTrip.centroid = calculateCentroid(currentTrip.photos);
      } else {
        // Finalize current trip and start a new one
        const startDate = currentTrip.photos[0].date;
        const travelers = determineTravelers(
          currentTrip.centroid.lat,
          currentTrip.centroid.lng,
          startDate,
          homeBases
        );
        const endDate = currentTrip.photos[currentTrip.photos.length - 1].date;

        // Use the first photo's location name as the primary location
        const locationName =
          currentTrip.photos[0].location.name ||
          `${currentTrip.centroid.lat.toFixed(2)}, ${currentTrip.centroid.lng.toFixed(2)}`;

        // Check if we have an existing trip with customizations
        const photoIds = currentTrip.photos.map((p) => p.id);
        const existingTrip = findBestExistingTrip(photoIds, locationName, startDate);
        const locationKey = `${currentTrip.centroid.lat.toFixed(1)},${currentTrip.centroid.lng.toFixed(1)}`;
        const stableId = generateStableTripId(locationKey, startDate);

        trips.push({
          id: existingTrip?.id || stableId,
          name: existingTrip?.name || `${locationName} - ${startDate.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          })}`,
          description: existingTrip?.description,
          locationName,
          startDate,
          endDate,
          photoIds,
          travelers,
          // Store the centroid for flight line purposes
          centroid: currentTrip.centroid,
        });

        // Start new trip
        currentTrip = {
          photos: [photo],
          centroid: { lat: photo.location.lat, lng: photo.location.lng },
        };
      }
    }
  }

  // Don't forget the last trip
  if (currentTrip && currentTrip.photos.length > 0) {
    const startDate = currentTrip.photos[0].date;
    const travelers = determineTravelers(
      currentTrip.centroid.lat,
      currentTrip.centroid.lng,
      startDate,
      homeBases
    );
    const endDate = currentTrip.photos[currentTrip.photos.length - 1].date;
    const locationName =
      currentTrip.photos[0].location.name ||
      `${currentTrip.centroid.lat.toFixed(2)}, ${currentTrip.centroid.lng.toFixed(2)}`;

    // Check if we have an existing trip with customizations
    const photoIds = currentTrip.photos.map((p) => p.id);
    const existingTrip = findBestExistingTrip(photoIds, locationName, startDate);
    const locationKey = `${currentTrip.centroid.lat.toFixed(1)},${currentTrip.centroid.lng.toFixed(1)}`;
    const stableId = generateStableTripId(locationKey, startDate);

    trips.push({
      id: existingTrip?.id || stableId,
      name: existingTrip?.name || `${locationName} - ${startDate.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })}`,
      description: existingTrip?.description,
      locationName,
      startDate,
      endDate,
      photoIds,
      travelers,
      // Store the centroid for flight line purposes
      centroid: currentTrip.centroid,
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

  // Auto-regenerate trips when photos change (including date changes)
  useEffect(() => {
    if (!isLoading && photos.length > 0) {
      // Create a fingerprint that includes both IDs and dates
      // This ensures trips regenerate when photo dates are edited
      const currentFingerprint = photos
        .map((p) => `${p.id}:${p.date.getTime()}`)
        .sort()
        .join(',');

      // Only process if photos actually changed (ID or date)
      if (currentFingerprint !== lastPhotoIdsRef.current) {
        lastPhotoIdsRef.current = currentFingerprint;

        // Regenerate trips when photos change, preserving existing customizations
        setTrips(prevTrips => autoGenerateTrips(photos, homeBases, prevTrips));
      }
    }
  }, [photos, homeBases, isLoading]);

  const regenerateTrips = useCallback(() => {
    setTrips(prevTrips => autoGenerateTrips(photos, homeBases, prevTrips));
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
  // Uses trip centroid for destination (handles multi-location trips like Dubai + Abu Dhabi)
  // Consolidate multiple trips to same destination into single lines
  const flightLines = useMemo(() => {
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

      // Use the trip's centroid for flight line destination
      // This ensures one flight line per trip, even if photos are in multiple locations
      const destLat = trip.centroid?.lat ?? tripPhotos[0].location.lat;
      const destLng = trip.centroid?.lng ?? tripPhotos[0].location.lng;

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

        // Skip if this is local movement within the same city/metro area
        // (e.g., Manhattan to Brooklyn should not show as a "trip")
        if (isSameCityOrTooClose(from.lat, from.lng, from.name, destLat, destLng, trip.locationName)) {
          continue;
        }

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

    // Consolidate lines per traveler that go to the same general area into ONE flight line
    // Uses distance-based grouping (within MAX_TRIP_RADIUS_KM)
    // This means Dubai + Abu Dhabi = one line PER TRAVELER who went there
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

    // Helper to find an existing route for this traveler that's close enough to consolidate with
    const findNearbyRouteForTraveler = (travelerId: string, destLat: number, destLng: number) => {
      for (const [key, route] of consolidatedMap) {
        if (route.travelerId !== travelerId) continue;
        const distance = getDistanceKm(route.to.lat, route.to.lng, destLat, destLng);
        if (distance <= MAX_TRIP_RADIUS_KM) {
          return key;
        }
      }
      return null;
    };

    for (const line of rawLines) {
      // Try to find an existing route for this traveler going to the same area
      const existingRouteKey = findNearbyRouteForTraveler(line.travelerId, line.to.lat, line.to.lng);
      const routeKey = existingRouteKey || `route-${line.to.lat.toFixed(1)}-${line.to.lng.toFixed(1)}::${line.travelerId}`;

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
          id: routeKey,
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
