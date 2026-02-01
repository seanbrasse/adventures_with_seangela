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
  name: string; // Person's name (Sean, Angela)
  city: string; // City name (NYC, Jakarta)
  lat: number;
  lng: number;
  color: string; // Line color for this person
  radius: number; // Radius in km to consider "at home"
}

export interface Trip {
  id: string;
  name: string; // Custom name or auto-generated
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

export interface AppSettings {
  homeBases: HomeBase[];
}

// Default settings
export const DEFAULT_HOME_BASES: HomeBase[] = [
  {
    id: 'sean',
    name: 'Sean',
    city: 'NYC',
    lat: 40.7128,
    lng: -74.0060,
    color: '#3B82F6', // Blue
    radius: 50, // 50km covers all NYC boroughs
  },
  {
    id: 'angela',
    name: 'Angela',
    city: 'Jakarta',
    lat: -6.2088,
    lng: 106.8456,
    color: '#EC4899', // Pink
    radius: 40, // 40km covers Jakarta metro
  },
];
