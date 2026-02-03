export interface PhotoLocation {
  lat: number;
  lng: number;
  name?: string;
}

export interface Photo {
  id: string;
  url: string;
  thumbnail: string;
  location: PhotoLocation;
  date: Date;
  description?: string;
  tripId?: string;
}

export interface PhotoGroup {
  location: PhotoLocation;
  photos: Photo[];
}

export interface HomeBase {
  id: string;
  personId: string; // Links multiple home bases to the same person
  name: string; // Person's name (Sean, Angela)
  city: string; // City name (NYC, Jakarta)
  lat: number;
  lng: number;
  color: string; // Line color for this person
  radius: number; // Radius in km to consider "at home"
  startDate?: Date; // When this home base became active (undefined = always)
  endDate?: Date; // When this home base ended (undefined = still active)
  isPermanent?: boolean; // If true, this is the default/fallback home
}

export interface Trip {
  id: string;
  name: string; // Custom name or auto-generated
  description?: string; // User-provided trip description
  locationName: string; // Destination city/place
  startDate: Date;
  endDate: Date;
  photoIds: string[];
  travelers: string[]; // HomeBase IDs of who traveled
  customStartPoints?: { // For trips not starting from home
    homeBaseId: string;
    lat: number;
    lng: number;
    name: string;
  }[];
}

export interface PlannedTrip {
  id: string;
  destinationName: string;
  lat: number;
  lng: number;
  description?: string;
  thingsToDo: string[];
  potentialStartDate?: Date;
  potentialEndDate?: Date;
  bookingStatus: 'idea' | 'researching' | 'booked';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettings {
  homeBases: HomeBase[];
}

// Default settings
export const DEFAULT_HOME_BASES: HomeBase[] = [
  {
    id: 'sean-brooklyn',
    personId: 'sean',
    name: 'Sean',
    city: 'Brooklyn',
    lat: 40.6501,
    lng: -73.9496,
    color: '#3B82F6', // Blue
    radius: 30, // 30km covers Brooklyn
    isPermanent: true,
  },
  {
    id: 'angela-jakarta',
    personId: 'angela',
    name: 'Angela',
    city: 'Jakarta',
    lat: -6.2088,
    lng: 106.8456,
    color: '#EC4899', // Pink
    radius: 40, // 40km covers Jakarta metro
    isPermanent: true,
  },
  {
    id: 'angela-dubai',
    personId: 'angela',
    name: 'Angela',
    city: 'Dubai',
    lat: 25.2048,
    lng: 55.2708,
    color: '#EC4899', // Pink (same as Angela's color)
    radius: 30,
    startDate: new Date('2024-09-01'),
    endDate: new Date('2025-04-30'),
    isPermanent: false,
  },
];
