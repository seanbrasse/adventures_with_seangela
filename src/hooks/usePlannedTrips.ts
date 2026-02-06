import { useState, useEffect, useCallback } from 'react';
import type { PlannedTrip } from '../types/photo';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

const PLANNED_TRIPS_KEY = 'photo-map-planned-trips';
const PLANNED_TRIPS_VERSION = 1;

// Stored planned trip with dates as strings (localStorage format)
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

// Database format
interface DbPlannedTrip {
  id: string;
  destination_name: string;
  lat: number;
  lng: number;
  description: string | null;
  things_to_do: string[];
  potential_start_date: string | null;
  potential_end_date: string | null;
  booking_status: 'idea' | 'researching' | 'booked';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Convert database format to runtime format
function dbToPlannedTrip(dbTrip: DbPlannedTrip): PlannedTrip {
  return {
    id: dbTrip.id,
    destinationName: dbTrip.destination_name,
    lat: dbTrip.lat,
    lng: dbTrip.lng,
    description: dbTrip.description || undefined,
    thingsToDo: dbTrip.things_to_do || [],
    potentialStartDate: dbTrip.potential_start_date ? new Date(dbTrip.potential_start_date) : undefined,
    potentialEndDate: dbTrip.potential_end_date ? new Date(dbTrip.potential_end_date) : undefined,
    bookingStatus: dbTrip.booking_status,
    notes: dbTrip.notes || undefined,
    createdAt: new Date(dbTrip.created_at),
    updatedAt: new Date(dbTrip.updated_at),
  };
}

// Convert runtime format to database format
function plannedTripToDb(trip: PlannedTrip): Omit<DbPlannedTrip, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string } {
  return {
    id: trip.id,
    destination_name: trip.destinationName,
    lat: trip.lat,
    lng: trip.lng,
    description: trip.description || null,
    things_to_do: trip.thingsToDo,
    potential_start_date: trip.potentialStartDate?.toISOString() || null,
    potential_end_date: trip.potentialEndDate?.toISOString() || null,
    booking_status: trip.bookingStatus,
    notes: trip.notes || null,
    created_at: trip.createdAt.toISOString(),
    updated_at: trip.updatedAt.toISOString(),
  };
}

// Convert stored trip to runtime format (localStorage)
function parsePlannedTrip(stored: StoredPlannedTrip): PlannedTrip {
  return {
    ...stored,
    potentialStartDate: stored.potentialStartDate ? new Date(stored.potentialStartDate) : undefined,
    potentialEndDate: stored.potentialEndDate ? new Date(stored.potentialEndDate) : undefined,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
  };
}

// Convert runtime trip to stored format (localStorage)
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

  // Load planned trips on mount
  useEffect(() => {
    async function loadPlannedTrips() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('planned_trips')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error loading planned trips from Supabase:', error);
            // Fallback to localStorage
            loadFromLocalStorage();
          } else if (data) {
            setPlannedTrips(data.map(dbToPlannedTrip));
          }
        } catch (error) {
          console.error('Error loading planned trips:', error);
          loadFromLocalStorage();
        }
      } else {
        loadFromLocalStorage();
      }
      setIsLoading(false);
    }

    function loadFromLocalStorage() {
      try {
        const stored = localStorage.getItem(PLANNED_TRIPS_KEY);
        if (stored) {
          const parsed: StoredPlannedTrips = JSON.parse(stored);
          if (parsed.version === PLANNED_TRIPS_VERSION && parsed.trips) {
            setPlannedTrips(parsed.trips.map(parsePlannedTrip));
          }
        }
      } catch (error) {
        console.error('Error loading from localStorage:', error);
      }
    }

    loadPlannedTrips();
  }, []);

  // Save to localStorage as backup (for offline/fallback)
  useEffect(() => {
    if (!isLoading) {
      try {
        const toStore: StoredPlannedTrips = {
          version: PLANNED_TRIPS_VERSION,
          trips: plannedTrips.map(serializePlannedTrip),
        };
        localStorage.setItem(PLANNED_TRIPS_KEY, JSON.stringify(toStore));
      } catch (error) {
        console.error('Error saving planned trips to localStorage:', error);
      }
    }
  }, [plannedTrips, isLoading]);

  const addPlannedTrip = useCallback(async (trip: Omit<PlannedTrip, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date();
    const newTrip: PlannedTrip = {
      ...trip,
      id: `planned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('planned_trips').insert(plannedTripToDb(newTrip));
        if (error) {
          console.error('Error saving planned trip to Supabase:', error);
        }
      } catch (error) {
        console.error('Error adding planned trip:', error);
      }
    }

    setPlannedTrips((prev) => [...prev, newTrip]);
    return newTrip;
  }, []);

  const updatePlannedTrip = useCallback(async (id: string, updates: Partial<Omit<PlannedTrip, 'id' | 'createdAt'>>) => {
    const updatedAt = new Date();

    if (isSupabaseConfigured && supabase) {
      try {
        const dbUpdates: Record<string, unknown> = { updated_at: updatedAt.toISOString() };
        if (updates.destinationName !== undefined) dbUpdates.destination_name = updates.destinationName;
        if (updates.lat !== undefined) dbUpdates.lat = updates.lat;
        if (updates.lng !== undefined) dbUpdates.lng = updates.lng;
        if (updates.description !== undefined) dbUpdates.description = updates.description || null;
        if (updates.thingsToDo !== undefined) dbUpdates.things_to_do = updates.thingsToDo;
        if (updates.potentialStartDate !== undefined) dbUpdates.potential_start_date = updates.potentialStartDate?.toISOString() || null;
        if (updates.potentialEndDate !== undefined) dbUpdates.potential_end_date = updates.potentialEndDate?.toISOString() || null;
        if (updates.bookingStatus !== undefined) dbUpdates.booking_status = updates.bookingStatus;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;

        const { error } = await supabase.from('planned_trips').update(dbUpdates).eq('id', id);
        if (error) {
          console.error('Error updating planned trip in Supabase:', error);
        }
      } catch (error) {
        console.error('Error updating planned trip:', error);
      }
    }

    setPlannedTrips((prev) =>
      prev.map((trip) =>
        trip.id === id
          ? { ...trip, ...updates, updatedAt }
          : trip
      )
    );
  }, []);

  const deletePlannedTrip = useCallback(async (id: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('planned_trips').delete().eq('id', id);
        if (error) {
          console.error('Error deleting planned trip from Supabase:', error);
        }
      } catch (error) {
        console.error('Error deleting planned trip:', error);
      }
    }

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
