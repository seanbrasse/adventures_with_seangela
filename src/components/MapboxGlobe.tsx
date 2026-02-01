import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import { Heart } from 'lucide-react';
import type { Photo } from '../types/photo';
import { groupPhotosByLocation } from '../utils/exif';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapboxGlobeProps {
  photos: Photo[];
  onLocationClick: (photos: Photo[]) => void;
  selectedLocation: { lat: number; lng: number } | null;
  accessToken: string;
}

interface PointData {
  lat: number;
  lng: number;
  photos: Photo[];
}

export default function MapboxGlobe({
  photos,
  onLocationClick,
  selectedLocation,
  accessToken
}: MapboxGlobeProps) {
  const mapRef = useRef<MapRef>(null);
  const [hoveredPoint, setHoveredPoint] = useState<PointData | null>(null);

  // Group photos by location
  const pointsData = useMemo<PointData[]>(() => {
    const groups = groupPhotosByLocation(photos);
    const points: PointData[] = [];

    groups.forEach((groupPhotos, key) => {
      const [lat, lng] = key.split(',').map(Number);
      if (lat !== 0 || lng !== 0) {
        points.push({
          lat,
          lng,
          photos: groupPhotos.sort((a, b) => b.date.getTime() - a.date.getTime()),
        });
      }
    });

    return points;
  }, [photos]);

  // Focus on selected location
  useEffect(() => {
    if (mapRef.current && selectedLocation) {
      mapRef.current.flyTo({
        center: [selectedLocation.lng, selectedLocation.lat],
        zoom: 8,
        duration: 2000,
      });
    }
  }, [selectedLocation]);

  // Initial view - fit to all points or show globe
  useEffect(() => {
    if (mapRef.current && pointsData.length > 0) {
      if (pointsData.length === 1) {
        mapRef.current.flyTo({
          center: [pointsData[0].lng, pointsData[0].lat],
          zoom: 4,
          duration: 2000,
        });
      } else if (pointsData.length > 1) {
        const lngs = pointsData.map(p => p.lng);
        const lats = pointsData.map(p => p.lat);
        const bounds: [[number, number], [number, number]] = [
          [Math.min(...lngs) - 10, Math.min(...lats) - 10],
          [Math.max(...lngs) + 10, Math.max(...lats) + 10]
        ];
        mapRef.current.fitBounds(bounds, {
          padding: 50,
          duration: 2000,
        });
      }
    }
  }, [pointsData.length]);

  const handleMarkerClick = useCallback((point: PointData) => {
    onLocationClick(point.photos);
  }, [onLocationClick]);

  return (
    <div className="w-full h-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={accessToken}
        initialViewState={{
          longitude: 0,
          latitude: 20,
          zoom: 1.5,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        projection={{ name: 'globe' }}
        fog={{
          color: 'rgb(186, 210, 235)',
          'high-color': 'rgb(36, 92, 223)',
          'horizon-blend': 0.02,
          'space-color': 'rgb(11, 11, 25)',
          'star-intensity': 0.6,
        }}
      >
        <NavigationControl position="bottom-right" />

        {pointsData.map((point, index) => (
          <Marker
            key={`${point.lat}-${point.lng}-${index}`}
            longitude={point.lng}
            latitude={point.lat}
            anchor="center"
            onClick={(e: { originalEvent: MouseEvent }) => {
              e.originalEvent.stopPropagation();
              handleMarkerClick(point);
            }}
          >
            <div
              className="relative cursor-pointer transform hover:scale-110 transition-transform"
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {/* Pulsing ring */}
              <div className="absolute inset-0 w-10 h-10 -m-2 bg-pink-400/30 rounded-full animate-ping" />

              {/* Main marker */}
              <div className="relative w-6 h-6 bg-pink-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                <Heart className="w-3 h-3 text-white fill-white" />
              </div>

              {/* Photo count badge */}
              {point.photos.length > 1 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-white text-pink-500 rounded-full text-xs font-bold flex items-center justify-center shadow">
                  {point.photos.length}
                </div>
              )}
            </div>
          </Marker>
        ))}

        {hoveredPoint && (
          <Popup
            longitude={hoveredPoint.lng}
            latitude={hoveredPoint.lat}
            anchor="bottom"
            closeButton={false}
            closeOnClick={false}
            offset={20}
          >
            <div className="p-2">
              <div className="flex gap-1 mb-2">
                {hoveredPoint.photos.slice(0, 3).map((photo, i) => (
                  <img
                    key={photo.id}
                    src={photo.thumbnail}
                    alt=""
                    className="w-12 h-12 object-cover rounded"
                    style={{ marginLeft: i > 0 ? '-8px' : 0, zIndex: 3 - i }}
                  />
                ))}
              </div>
              <p className="text-sm font-medium text-gray-800">
                {hoveredPoint.photos.length} photo{hoveredPoint.photos.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-500">Click to view</p>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
