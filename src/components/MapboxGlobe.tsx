import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import Map, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import { format } from 'date-fns';
import { Heart, Plane, Globe, Map as MapIcon } from 'lucide-react';
import type { Photo, HomeBase } from '../types/photo';
import { groupPhotosByLocation } from '../utils/exif';
import 'mapbox-gl/dist/mapbox-gl.css';

interface FlightLineVisit {
  date: Date;
  tripId: string;
  tripName: string;
}

interface FlightLine {
  id: string;
  from: { lat: number; lng: number; name: string };
  to: { lat: number; lng: number; name: string };
  color: string;
  travelerId: string;
  visits: FlightLineVisit[];
}

interface MapboxGlobeProps {
  photos: Photo[];
  onLocationClick: (photos: Photo[]) => void;
  selectedLocation: { lat: number; lng: number } | null;
  accessToken: string;
  flightLines?: FlightLine[];
  homeBases?: HomeBase[];
}

// Generate great circle arc points between two coordinates
function generateArcPoints(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number,
  numPoints = 100
): [number, number][] {
  const points: [number, number][] = [];

  // Convert to radians
  const lat1 = startLat * (Math.PI / 180);
  const lng1 = startLng * (Math.PI / 180);
  const lat2 = endLat * (Math.PI / 180);
  const lng2 = endLng * (Math.PI / 180);

  // Calculate great circle distance
  const d = 2 * Math.asin(
    Math.sqrt(
      Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lng1 - lng2) / 2), 2)
    )
  );

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;

    // Calculate intermediate point on great circle
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);

    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * (180 / Math.PI);
    const lng = Math.atan2(y, x) * (180 / Math.PI);

    points.push([lng, lat]);
  }

  return points;
}

// Get midpoint of a great circle arc
function getMidpoint(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number
): { lat: number; lng: number } {
  const lat1 = startLat * (Math.PI / 180);
  const lng1 = startLng * (Math.PI / 180);
  const lat2 = endLat * (Math.PI / 180);
  const lng2 = endLng * (Math.PI / 180);

  const Bx = Math.cos(lat2) * Math.cos(lng2 - lng1);
  const By = Math.cos(lat2) * Math.sin(lng2 - lng1);

  const lat3 = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + Bx) * (Math.cos(lat1) + Bx) + By * By)
  );
  const lng3 = lng1 + Math.atan2(By, Math.cos(lat1) + Bx);

  return {
    lat: lat3 * (180 / Math.PI),
    lng: lng3 * (180 / Math.PI),
  };
}

// Calculate bearing between two points for plane rotation
function getBearing(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number
): number {
  const lat1 = startLat * (Math.PI / 180);
  const lat2 = endLat * (Math.PI / 180);
  const dLng = (endLng - startLng) * (Math.PI / 180);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
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
  accessToken,
  flightLines = [],
  homeBases = [],
}: MapboxGlobeProps) {
  const mapRef = useRef<MapRef>(null);
  const [hoveredPoint, setHoveredPoint] = useState<PointData | null>(null);
  const [hoveredLine, setHoveredLine] = useState<(FlightLine & { midpoint: { lat: number; lng: number }; bearing: number }) | null>(null);
  const [isMinimalStyle, setIsMinimalStyle] = useState(true); // Minimal is default

  // Map style URLs
  const MAP_STYLES = {
    minimal: 'mapbox://styles/mapbox/dark-v11',
    detailed: 'mapbox://styles/mapbox/satellite-streets-v12',
  };

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

  // Generate GeoJSON for flight lines
  const flightLinesGeoJSON = useMemo(() => {
    const features = flightLines.map((line) => {
      const arcPoints = generateArcPoints(
        line.from.lng,
        line.from.lat,
        line.to.lng,
        line.to.lat,
        100
      );

      return {
        type: 'Feature' as const,
        properties: {
          id: line.id,
          color: line.color,
          fromName: line.from.name,
          toName: line.to.name,
          visitCount: line.visits.length,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: arcPoints,
        },
      };
    });

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [flightLines]);

  // Calculate midpoints and bearings for plane icons
  const planePositions = useMemo(() => {
    return flightLines.map((line) => {
      const midpoint = getMidpoint(
        line.from.lng,
        line.from.lat,
        line.to.lng,
        line.to.lat
      );
      const bearing = getBearing(
        line.from.lng,
        line.from.lat,
        line.to.lng,
        line.to.lat
      );
      return {
        ...line,
        midpoint,
        bearing,
      };
    });
  }, [flightLines]);

  const handleMarkerClick = useCallback((point: PointData) => {
    onLocationClick(point.photos);
  }, [onLocationClick]);

  const handleLineClick = useCallback((line: FlightLine) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [line.to.lng, line.to.lat],
        zoom: 6,
        duration: 2000,
      });
    }
  }, []);

  return (
    <div className="w-full h-full relative">
      {/* Map style toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setIsMinimalStyle(!isMinimalStyle)}
          className="flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-sm rounded-lg text-white text-sm hover:bg-black/80 transition-colors border border-white/20"
          title={isMinimalStyle ? 'Switch to detailed view' : 'Switch to minimal view'}
        >
          {isMinimalStyle ? (
            <>
              <MapIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Detailed</span>
            </>
          ) : (
            <>
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Minimal</span>
            </>
          )}
        </button>
      </div>

      <Map
        ref={mapRef}
        mapboxAccessToken={accessToken}
        initialViewState={{
          longitude: 0,
          latitude: 20,
          zoom: 1.5,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={isMinimalStyle ? MAP_STYLES.minimal : MAP_STYLES.detailed}
        projection={{ name: 'globe' }}
        fog={
          isMinimalStyle
            ? {
                color: 'rgb(20, 20, 30)',
                'high-color': 'rgb(40, 40, 60)',
                'horizon-blend': 0.02,
                'space-color': 'rgb(5, 5, 15)',
                'star-intensity': 0.8,
              }
            : {
                color: 'rgb(186, 210, 235)',
                'high-color': 'rgb(36, 92, 223)',
                'horizon-blend': 0.02,
                'space-color': 'rgb(11, 11, 25)',
                'star-intensity': 0.6,
              }
        }
      >
        <NavigationControl position="bottom-right" />

        {/* Home base markers - only show permanent homes */}
        {homeBases
          .filter((hb) => hb.isPermanent)
          .map((homeBase) => (
            <Marker
              key={`home-${homeBase.id}`}
              longitude={homeBase.lng}
              latitude={homeBase.lat}
              anchor="center"
            >
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
                style={{ backgroundColor: homeBase.color }}
                title={`${homeBase.name}'s home: ${homeBase.city}`}
              />
            </Marker>
          ))}

        {/* Flight lines */}
        {flightLines.length > 0 && (
          <Source id="flight-lines" type="geojson" data={flightLinesGeoJSON}>
            {/* Render each line as a separate layer with its color */}
            {flightLines.map((line) => (
              <Layer
                key={line.id}
                id={`flight-line-${line.id}`}
                type="line"
                filter={['==', ['get', 'id'], line.id]}
                paint={{
                  'line-color': line.color,
                  'line-width': 2,
                  'line-opacity': 0.8,
                  'line-dasharray': [2, 2],
                }}
              />
            ))}
          </Source>
        )}

        {/* Plane icons at midpoints */}
        {planePositions.map((plane) => (
          <Marker
            key={`plane-${plane.id}`}
            longitude={plane.midpoint.lng}
            latitude={plane.midpoint.lat}
            anchor="center"
            onClick={() => handleLineClick(plane)}
          >
            <div
              className="cursor-pointer transform transition-transform hover:scale-125"
              style={{ transform: `rotate(${plane.bearing - 45}deg)` }}
              onMouseEnter={() => setHoveredLine(plane)}
              onMouseLeave={() => setHoveredLine(null)}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                style={{ backgroundColor: plane.color }}
              >
                <Plane className="w-3 h-3 text-white" />
              </div>
            </div>
          </Marker>
        ))}

        {/* Hovered line tooltip */}
        {hoveredLine && (
          <Popup
            longitude={hoveredLine.midpoint.lng}
            latitude={hoveredLine.midpoint.lat}
            anchor="bottom"
            closeButton={false}
            closeOnClick={false}
            offset={20}
          >
            <div className="p-3 min-w-[160px]">
              <p className="font-semibold text-gray-800 text-sm mb-1">
                {hoveredLine.from.name} → {hoveredLine.to.name}
              </p>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <p className="text-xs text-gray-500 mb-1.5">
                  {hoveredLine.visits.length} visit{hoveredLine.visits.length !== 1 ? 's' : ''}
                </p>
                <ul className="space-y-0.5">
                  {hoveredLine.visits.slice(0, 5).map((visit, i) => (
                    <li key={i} className="text-xs text-gray-600">
                      {format(visit.date, 'MMM yyyy')}
                    </li>
                  ))}
                  {hoveredLine.visits.length > 5 && (
                    <li className="text-xs text-gray-400">
                      +{hoveredLine.visits.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </Popup>
        )}

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
              {hoveredPoint.photos[0]?.location.name && (
                <p className="text-sm font-semibold text-gray-800 mb-1">
                  {hoveredPoint.photos[0].location.name}
                </p>
              )}
              <p className="text-xs text-gray-600">
                {hoveredPoint.photos.length} photo{hoveredPoint.photos.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-400">Click to view</p>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
