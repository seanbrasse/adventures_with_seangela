// Geocoding utilities using Mapbox API

export interface GeocodingResult {
  id: string;
  place_name: string;
  center: [number, number];
  text: string;
}

export interface ReverseGeocodingResult {
  city: string;
  country: string;
  fullName: string;
  center: { lat: number; lng: number };  // City center coordinates for generalization
}

// Reverse geocode coordinates to get city name
export async function reverseGeocode(
  lat: number,
  lng: number,
  mapboxToken: string
): Promise<ReverseGeocodingResult | null> {
  if (!mapboxToken || (lat === 0 && lng === 0)) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=place,locality,region&limit=1`
    );

    if (!response.ok) {
      console.error('Reverse geocoding failed:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const feature = data.features[0];

    // Extract city and country from context
    let city = feature.text;
    let country = '';

    if (feature.context) {
      for (const ctx of feature.context) {
        if (ctx.id.startsWith('country')) {
          country = ctx.text;
        }
      }
    }

    // Get the city center coordinates from the feature
    // Mapbox returns [lng, lat] in the center array
    const center = feature.center
      ? { lat: feature.center[1], lng: feature.center[0] }
      : { lat, lng };  // Fallback to original if no center

    return {
      city,
      country,
      fullName: country ? `${city}, ${country}` : city,
      center,
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

// Search for places by name
export async function searchPlaces(
  query: string,
  mapboxToken: string
): Promise<GeocodingResult[]> {
  if (!mapboxToken || !query.trim()) {
    return [];
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json?access_token=${mapboxToken}&types=place,locality,region,country&limit=5`
    );

    if (!response.ok) {
      console.error('Place search failed:', response.status);
      return [];
    }

    const data = await response.json();
    return (data.features || []).map((feature: { id: string; place_name: string; center: [number, number]; text: string }) => ({
      id: feature.id,
      place_name: feature.place_name,
      center: feature.center,
      text: feature.text,
    }));
  } catch (error) {
    console.error('Place search error:', error);
    return [];
  }
}

// Normalize city names for grouping
// This handles cases where the same city might have slightly different names
export function normalizeCityName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove common suffixes/prefixes
    .replace(/^city of /i, '')
    .replace(/ city$/i, '')
    .replace(/ metro$/i, '')
    .replace(/ metropolitan area$/i, '')
    // Normalize common variations
    .replace(/new york city/i, 'new york')
    .replace(/nyc/i, 'new york')
    .replace(/jakarta special capital region/i, 'jakarta')
    .replace(/dki jakarta/i, 'jakarta');
}

// Group photos by city name
export function groupPhotosByCity(
  photos: { location: { lat: number; lng: number; name?: string } }[]
): Map<string, typeof photos> {
  const groups = new Map<string, typeof photos>();

  photos.forEach((photo) => {
    const cityName = photo.location.name || 'Unknown Location';
    const normalizedName = normalizeCityName(cityName);

    // Find existing group with same normalized name
    let foundKey: string | null = null;
    for (const [key] of groups) {
      if (normalizeCityName(key) === normalizedName) {
        foundKey = key;
        break;
      }
    }

    if (foundKey) {
      groups.get(foundKey)!.push(photo);
    } else {
      groups.set(cityName, [photo]);
    }
  });

  return groups;
}
