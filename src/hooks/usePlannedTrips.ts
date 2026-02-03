import { useState, useEffect, useCallback } from 'react';
import type { PlannedTrip } from '../types/photo';

const PLANNED_TRIPS_KEY = 'photo-map-planned-trips';
const PLANNED_TRIPS_VERSION = 1;

// Stored planned trip with dates as strings
interface StoredPlannedTrip extends Omit<PlannedTrip, 'potentialStartDate' | 'potentialEndDate' | 'createdAt' | 'updatedAt'> {
  potentialStartDate?: string;
  potentialEndDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredPlannedTrips {
  version?: number;
  trips: StoredPlannedTrip[];
}

// Convert stored trip to runtime format
function parsePlannedTrip(stored: StoredPlannedTrip): PlannedTrip {
  return {
    ...stored,
    potentialStartDate: stored.potentialStartDate ? new Date(stored.potentialStartDate) : undefined,
    potentialEndDate: stored.potentialEndDate ? new Date(stored.potentialEndDate) : undefined,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
  };
}

// Convert runtime trip to stored format
function serializePlannedTrip(trip: PlannedTrip): StoredPlannedTrip {
  return {
    ...trip,
    potentialStartDate: trip.potentialStartDate?.toISOString(),
    potentialEndDate: trip.potentialEndDate?.toISOString(),
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
  };
}

export function usePlannedTrips() {
  const [plannedTrips, setPlannedTrips] = useState<PlannedTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PLANNED_TRIPS_KEY);
      if (stored) {
        const parsed: StoredPlannedTrips = JSON.parse(stored);
        if (parsed.version === PLANNED_TRIPS_VERSION && parsed.trips) {
          setPlannedTrips(parsed.trips.map(parsePlannedTrip));
        }
      }
    } catch (error) {
      console.error('Error loading planned trips:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save to localStorage whenever trips change
  useEffect(() => {
    if (!isLoading) {
      try {
        const toStore: StoredPlannedTrips = {
          version: PLANNED_TRIPS_VERSION,
          trips: plannedTrips.map(serializePlannedTrip),
        };
        localStorage.setItem(PLANNED_TRIPS_KEY, JSON.stringify(toStore));
      } catch (error) {
        console.error('Error saving planned trips:', error);
      }
    }
  }, [plannedTrips, isLoading]);

  const addPlannedTrip = useCallback((trip: Omit<PlannedTrip, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date();
    const newTrip: PlannedTrip = {
      ...trip,
      id: `planned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };
    setPlannedTrips((prev) => [...prev, newTrip]);
    return newTrip;
  }, []);

  const updatePlannedTrip = useCallback((id: string, updates: Partial<Omit<PlannedTrip, 'id' | 'createdAt'>>) => {
    setPlannedTrips((prev) =>
      prev.map((trip) =>
        trip.id === id
          ? { ...trip, ...updates, updatedAt: new Date() }
          : trip
      )
    );
  }, []);

  const deletePlannedTrip = useCallback((id: string) => {
    setPlannedTrips((prev) => prev.filter((trip) => trip.id !== id));
  }, []);

  const getPlannedTripById = useCallback((id: string) => {
    return plannedTrips.find((trip) => trip.id === id);
  }, [plannedTrips]);

  return {
    plannedTrips,
    isLoading,
    addPlannedTrip,
    updatePlannedTrip,
    deletePlannedTrip,
    getPlannedTripById,
  };
}
