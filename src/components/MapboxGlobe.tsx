import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import Map, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl/mapbox';
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl/mapbox';
import { format } from 'date-fns';
import { Heart, Plane, Globe, Map as MapIcon, Home } from 'lucide-react';
import styled, { keyframes } from 'styled-components';
import type { Photo, HomeBase, Trip } from '../types/photo';
import { groupPhotosByLocation } from '../utils/exif';
import 'mapbox-gl/dist/mapbox-gl.css';

// Styled Components
const MapContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
`;

const ToggleContainer = styled.div`
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10;
`;

const ToggleButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  border-radius: 0.75rem;
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }

  svg {
    width: 1rem;
    height: 1rem;
  }
`;

const ToggleLabel = styled.span`
  @media (max-width: 640px) {
    display: none;
  }
`;

const RecenterButtonContainer = styled.div`
  position: absolute;
  bottom: 8.5rem;
  right: 0.65rem;
  z-index: 10;
`;

const RecenterButton = styled.button`
  width: 29px;
  height: 29px;
  background: #fff;
  border: none;
  border-radius: 4px;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;

  &:hover {
    background: #f0f0f0;
  }

  svg {
    width: 18px;
    height: 18px;
    color: #333;
  }
`;

const HomeBaseMarker = styled.div<{ $color: string }>`
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  background-color: ${({ $color }) => $color};
`;

const PlaneMarkerContainer = styled.div`
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.25);
  }
`;

const PlaneIcon = styled.div<{ $color: string; $rotation: number }>`
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  background-color: ${({ $color }) => $color};

  svg {
    width: 0.75rem;
    height: 0.75rem;
    color: white;
    transform: rotate(${({ $rotation }) => $rotation}deg);
  }
`;

const ChevronMarker = styled.div<{ $color: string; $rotation: number }>`
  width: 8px;
  height: 8px;
  position: relative;
  cursor: pointer;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 6px;
    height: 6px;
    border-right: 2px solid ${({ $color }) => $color};
    border-top: 2px solid ${({ $color }) => $color};
    transform: translate(-50%, -50%) rotate(${({ $rotation }) => $rotation - 45}deg);
    opacity: 0.9;
  }
`;

const FlightPopup = styled.div`
  padding: 0.75rem;
  min-width: 160px;
`;

const FlightPopupTitle = styled.p`
  font-weight: 600;
  color: #1f2937;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
`;

const FlightPopupDivider = styled.div`
  border-top: 1px solid #e5e7eb;
  padding-top: 0.5rem;
  margin-top: 0.5rem;
`;

const FlightPopupLabel = styled.p`
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.375rem;
`;

const FlightPopupList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const FlightPopupItem = styled.li`
  font-size: 0.75rem;
  color: #4b5563;
`;

const FlightPopupMore = styled.li`
  font-size: 0.75rem;
  color: #9ca3af;
`;

const ping = keyframes`
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
`;

const LocationMarkerContainer = styled.div`
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }
`;

const PingAnimation = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2.5rem;
  height: 2.5rem;
  transform: translate(-50%, -50%);
  background: rgba(244, 114, 182, 0.3);
  border-radius: 50%;
  animation: ${ping} 1s cubic-bezier(0, 0, 0.2, 1) infinite;
  pointer-events: none;
`;

const LocationDot = styled.div`
  position: relative;
  width: 1.5rem;
  height: 1.5rem;
  background: #ec4899;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 0.75rem;
    height: 0.75rem;
    color: white;
    fill: white;
  }
`;

const PhotoCount = styled.div`
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  width: 1rem;
  height: 1rem;
  background: white;
  color: #ec4899;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
`;

const LocationPopup = styled.div`
  padding: 0.5rem;
`;

const PopupImageGrid = styled.div`
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
`;

const PopupThumbnail = styled.img`
  width: 3rem;
  height: 3rem;
  object-fit: cover;
  border-radius: 0.25rem;
`;

const PopupTitle = styled.p`
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
`;

const PopupPhotoCount = styled.p`
  font-size: 0.75rem;
  color: #4b5563;
`;

const PopupHint = styled.p`
  font-size: 0.75rem;
  color: #9ca3af;
`;

const PopupTripCount = styled.p`
  font-size: 0.8125rem;
  color: #f472b6;
  display: flex;
  align-items: center;
  gap: 0.25rem;

  svg {
    width: 0.875rem;
    height: 0.875rem;
  }
`;

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
  trips?: Trip[];
  onLocationClick: (photos: Photo[]) => void;
  selectedLocation: { lat: number; lng: number } | null;
  accessToken: string;
  flightLines?: FlightLine[];
  homeBases?: HomeBase[];
  sidebarCollapsed?: boolean;
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
  trips = [],
  onLocationClick,
  selectedLocation,
  accessToken,
  flightLines = [],
  homeBases = [],
  sidebarCollapsed = false,
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

  // Helper function to check if a point is within a home base radius
  const getHomeBaseForLocation = (lat: number, lng: number, bases: HomeBase[]): HomeBase | null => {
    for (const homeBase of bases) {
      const R = 6371; // Earth's radius in km
      const dLat = (homeBase.lat - lat) * (Math.PI / 180);
      const dLng = (homeBase.lng - lng) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat * (Math.PI / 180)) *
          Math.cos(homeBase.lat * (Math.PI / 180)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      if (distance <= homeBase.radius) {
        return homeBase;
      }
    }
    return null;
  };

  // Group photos by location, generalizing home area photos for privacy
  const pointsData = useMemo(() => {
    const groups = groupPhotosByLocation(photos);
    const points: PointData[] = [];
    const homeBasePhotos: Record<string, Photo[]> = {}; // Group photos by home base

    groups.forEach((groupPhotos, key) => {
      const [lat, lng] = key.split(',').map(Number);
      // Filter out invalid coordinates (0,0 or out of valid range)
      const isValidLat = !isNaN(lat) && lat >= -90 && lat <= 90;
      const isValidLng = !isNaN(lng) && lng >= -180 && lng <= 180;
      const isNotOrigin = lat !== 0 || lng !== 0;

      if (isValidLat && isValidLng && isNotOrigin) {
        // Check if this location is within a home base (for privacy)
        const nearbyHomeBase = getHomeBaseForLocation(lat, lng, homeBases);

        if (nearbyHomeBase) {
          // Generalize to home base location for privacy
          const homeKey = nearbyHomeBase.id;
          if (!homeBasePhotos[homeKey]) {
            homeBasePhotos[homeKey] = [];
          }
          homeBasePhotos[homeKey].push(...groupPhotos);
        } else {
          points.push({
            lat,
            lng,
            photos: groupPhotos.sort((a, b) => b.date.getTime() - a.date.getTime()),
          });
        }
      }
    });

    // Add home base photo groups (generalized locations)
    Object.entries(homeBasePhotos).forEach(([homeKey, groupPhotos]) => {
      const homeBase = homeBases.find(hb => hb.id === homeKey);
      if (homeBase) {
        points.push({
          lat: homeBase.lat,
          lng: homeBase.lng,
          photos: groupPhotos.sort((a, b) => b.date.getTime() - a.date.getTime()),
        });
      }
    });

    return points;
  }, [photos, homeBases]);

  // Focus on selected location
  // Padding to offset for sidebar (380px sidebar + 24px toggle = 404px)
  const SIDEBAR_WIDTH = 404;
  const mapPadding = { left: sidebarCollapsed ? 0 : SIDEBAR_WIDTH, top: 0, right: 0, bottom: 0 };

  useEffect(() => {
    if (mapRef.current && selectedLocation) {
      mapRef.current.flyTo({
        center: [selectedLocation.lng, selectedLocation.lat],
        zoom: 8,
        duration: 2000,
        padding: mapPadding,
      });
    }
  }, [selectedLocation, sidebarCollapsed]);

  // Initial view - fit to all points or show globe
  useEffect(() => {
    if (mapRef.current && pointsData.length > 0) {
      if (pointsData.length === 1) {
        mapRef.current.flyTo({
          center: [pointsData[0].lng, pointsData[0].lat],
          zoom: 4,
          duration: 2000,
          padding: mapPadding,
        });
      } else if (pointsData.length > 1) {
        const lngs = pointsData.map(p => p.lng);
        const lats = pointsData.map(p => p.lat);
        const bounds: [[number, number], [number, number]] = [
          [Math.min(...lngs) - 10, Math.min(...lats) - 10],
          [Math.max(...lngs) + 10, Math.max(...lats) + 10]
        ];
        mapRef.current.fitBounds(bounds, {
          padding: { ...mapPadding, top: 50, right: 50, bottom: 50 },
          duration: 2000,
        });
      }
    }
  }, [pointsData.length, sidebarCollapsed]);

  // Resize map when sidebar collapses/expands
  useEffect(() => {
    if (mapRef.current) {
      // Small delay to let the CSS transition complete
      const timer = setTimeout(() => {
        mapRef.current?.resize();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [sidebarCollapsed]);

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
      // Generate arc points to get accurate midpoint position and bearing
      const arcPoints = generateArcPoints(
        line.from.lng,
        line.from.lat,
        line.to.lng,
        line.to.lat,
        100
      );

      // Get the midpoint from the arc (index 50 of 100 points)
      const midIndex = Math.floor(arcPoints.length / 2);
      const midpoint = {
        lng: arcPoints[midIndex][0],
        lat: arcPoints[midIndex][1],
      };

      // Calculate bearing at the midpoint using nearby arc points
      const prevPoint = arcPoints[Math.max(midIndex - 1, 0)];
      const nextPoint = arcPoints[Math.min(midIndex + 1, arcPoints.length - 1)];
      const bearing = getBearing(prevPoint[0], prevPoint[1], nextPoint[0], nextPoint[1]);

      return {
        ...line,
        midpoint,
        bearing,
      };
    });
  }, [flightLines]);

  // Calculate chevron positions along flight lines for direction indication
  const chevronPositions = useMemo(() => {
    const chevrons: Array<{
      id: string;
      lineId: string;
      color: string;
      lat: number;
      lng: number;
      bearing: number;
    }> = [];

    flightLines.forEach((line) => {
      const arcPoints = generateArcPoints(
        line.from.lng,
        line.from.lat,
        line.to.lng,
        line.to.lat,
        100
      );

      // Place chevrons at 25%, 50%, 75%, and 95% along the path
      const positions = [0.25, 0.5, 0.75, 0.95];

      positions.forEach((pos, i) => {
        const index = Math.floor(arcPoints.length * pos);
        const point = arcPoints[index];
        const prevPoint = arcPoints[Math.max(index - 1, 0)];

        const bearing = getBearing(
          prevPoint[0],
          prevPoint[1],
          point[0],
          point[1]
        );

        chevrons.push({
          id: `${line.id}-chevron-${i}`,
          lineId: line.id,
          color: line.color,
          lat: point[1],
          lng: point[0],
          bearing,
        });
      });
    });

    return chevrons;
  }, [flightLines]);

  const handleMarkerClick = useCallback((point: PointData) => {
    onLocationClick(point.photos);
  }, [onLocationClick]);

  const handleLineClick = useCallback((line: FlightLine) => {
    if (mapRef.current) {
      // Just fly to the destination without opening the gallery
      mapRef.current.flyTo({
        center: [line.to.lng, line.to.lat],
        zoom: 6,
        duration: 2000,
        padding: { left: sidebarCollapsed ? 0 : SIDEBAR_WIDTH, top: 0, right: 0, bottom: 0 },
      });
    }
  }, [sidebarCollapsed]);

  // Recenter to midpoint between home bases
  const handleRecenter = useCallback(() => {
    if (mapRef.current && homeBases.length >= 2) {
      const permanentBases = homeBases.filter(hb => hb.isPermanent);
      if (permanentBases.length >= 2) {
        const midpoint = getMidpoint(
          permanentBases[0].lng,
          permanentBases[0].lat,
          permanentBases[1].lng,
          permanentBases[1].lat
        );
        mapRef.current.flyTo({
          center: [midpoint.lng, midpoint.lat],
          zoom: 1.5,
          duration: 2000,
          padding: { left: sidebarCollapsed ? 0 : SIDEBAR_WIDTH, top: 0, right: 0, bottom: 0 },
        });
      }
    }
  }, [homeBases, sidebarCollapsed]);

  // Handle clicks on the flight line layers
  const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
    if (!e.features || e.features.length === 0) return;

    const feature = e.features[0];
    const lineId = feature.properties?.id;
    if (lineId) {
      // Handle both visible line and hit area clicks
      const actualLineId = lineId.replace('-hit', '');
      const line = flightLines.find(l => l.id === actualLineId);
      if (line) {
        handleLineClick(line);
      }
    }
  }, [flightLines, handleLineClick]);

  // Set up interactive layers for flight lines (both visible and hit area)
  const interactiveLayerIds = useMemo(() => {
    const ids: string[] = [];
    flightLines.forEach(line => {
      ids.push(`flight-line-${line.id}`);
      ids.push(`flight-line-hit-${line.id}`);
    });
    return ids;
  }, [flightLines]);

  return (
    <MapContainer>
      {/* Map style toggle */}
      <ToggleContainer>
        <ToggleButton
          onClick={() => setIsMinimalStyle(!isMinimalStyle)}
          title={isMinimalStyle ? 'Switch to detailed view' : 'Switch to minimal view'}
        >
          {isMinimalStyle ? (
            <>
              <MapIcon />
              <ToggleLabel>Detailed</ToggleLabel>
            </>
          ) : (
            <>
              <Globe />
              <ToggleLabel>Minimal</ToggleLabel>
            </>
          )}
        </ToggleButton>
      </ToggleContainer>

      {/* Recenter to midpoint button */}
      {homeBases.filter(hb => hb.isPermanent).length >= 2 && (
        <RecenterButtonContainer>
          <RecenterButton
            onClick={handleRecenter}
            title="Recenter to midpoint between homes"
          >
            <Home />
          </RecenterButton>
        </RecenterButtonContainer>
      )}

      <Map
        ref={mapRef}
        mapboxAccessToken={accessToken}
        initialViewState={{
          longitude: 0,
          latitude: 20,
          zoom: 1.5,
          padding: { left: sidebarCollapsed ? 0 : SIDEBAR_WIDTH, top: 0, right: 0, bottom: 0 },
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={isMinimalStyle ? MAP_STYLES.minimal : MAP_STYLES.detailed}
        projection={{ name: 'globe' }}
        interactiveLayerIds={interactiveLayerIds}
        onClick={handleMapClick}
        cursor={interactiveLayerIds.length > 0 ? 'pointer' : 'grab'}
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
              <HomeBaseMarker
                $color={homeBase.color}
                title={`${homeBase.name}'s home: ${homeBase.city}`}
              />
            </Marker>
          ))}

        {/* Flight lines */}
        {flightLines.length > 0 && (
          <Source id="flight-lines" type="geojson" data={flightLinesGeoJSON}>
            {/* Invisible wider hit area for easier clicking */}
            {flightLines.map((line) => (
              <Layer
                key={`hit-${line.id}`}
                id={`flight-line-hit-${line.id}`}
                type="line"
                filter={['==', ['get', 'id'], line.id]}
                paint={{
                  'line-color': line.color,
                  'line-width': 16,
                  'line-opacity': 0,
                }}
              />
            ))}
            {/* Visible dashed line */}
            {flightLines.map((line) => (
              <Layer
                key={line.id}
                id={`flight-line-${line.id}`}
                type="line"
                filter={['==', ['get', 'id'], line.id]}
                paint={{
                  'line-color': line.color,
                  'line-width': 2.5,
                  'line-opacity': 0.85,
                  'line-dasharray': [4, 3],
                }}
              />
            ))}
          </Source>
        )}

        {/* Directional chevrons along flight lines */}
        {chevronPositions.map((chevron) => {
          const line = flightLines.find(l => l.id === chevron.lineId);
          return (
            <Marker
              key={chevron.id}
              longitude={chevron.lng}
              latitude={chevron.lat}
              anchor="center"
              rotationAlignment="map"
              onClick={() => line && handleLineClick(line)}
            >
              <ChevronMarker $color={chevron.color} $rotation={chevron.bearing} />
            </Marker>
          );
        })}

        {/* Plane icons at midpoints */}
        {planePositions.map((plane) => (
          <Marker
            key={`plane-${plane.id}`}
            longitude={plane.midpoint.lng}
            latitude={plane.midpoint.lat}
            anchor="center"
            rotationAlignment="map"
            onClick={() => handleLineClick(plane)}
          >
            <PlaneMarkerContainer
              onMouseEnter={() => setHoveredLine(plane)}
              onMouseLeave={() => setHoveredLine(null)}
            >
              <PlaneIcon $color={plane.color} $rotation={plane.bearing - 45}>
                <Plane />
              </PlaneIcon>
            </PlaneMarkerContainer>
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
            <FlightPopup>
              <FlightPopupTitle>
                {hoveredLine.from.name} → {hoveredLine.to.name}
              </FlightPopupTitle>
              <FlightPopupDivider>
                <FlightPopupLabel>
                  {hoveredLine.visits.length} visit{hoveredLine.visits.length !== 1 ? 's' : ''}
                </FlightPopupLabel>
                <FlightPopupList>
                  {hoveredLine.visits.slice(0, 5).map((visit, i) => (
                    <FlightPopupItem key={i}>
                      {format(visit.date, 'MMM yyyy')}
                    </FlightPopupItem>
                  ))}
                  {hoveredLine.visits.length > 5 && (
                    <FlightPopupMore>
                      +{hoveredLine.visits.length - 5} more
                    </FlightPopupMore>
                  )}
                </FlightPopupList>
              </FlightPopupDivider>
            </FlightPopup>
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
            <LocationMarkerContainer
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {/* Pulsing ring */}
              <PingAnimation />

              {/* Main marker */}
              <LocationDot>
                <Heart />
              </LocationDot>

              {/* Photo count badge */}
              {point.photos.length > 1 && (
                <PhotoCount>{point.photos.length}</PhotoCount>
              )}
            </LocationMarkerContainer>
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
            <LocationPopup>
              <PopupImageGrid>
                {hoveredPoint.photos.slice(0, 3).map((photo, i) => (
                  <PopupThumbnail
                    key={photo.id}
                    src={photo.thumbnail}
                    alt=""
                    style={{ marginLeft: i > 0 ? '-8px' : 0, zIndex: 3 - i }}
                  />
                ))}
              </PopupImageGrid>
              {hoveredPoint.photos[0]?.location.name && (
                <PopupTitle>
                  {hoveredPoint.photos[0].location.name}
                </PopupTitle>
              )}
              <PopupPhotoCount>
                {hoveredPoint.photos.length} photo{hoveredPoint.photos.length !== 1 ? 's' : ''}
              </PopupPhotoCount>
              {(() => {
                const photoIds = hoveredPoint.photos.map(p => p.id);
                const tripCount = trips.filter(trip =>
                  trip.photoIds.some(id => photoIds.includes(id))
                ).length;
                return tripCount > 0 ? (
                  <PopupTripCount>
                    <Plane />
                    {tripCount} trip{tripCount !== 1 ? 's' : ''}
                  </PopupTripCount>
                ) : null;
              })()}
              <PopupHint>Click to view</PopupHint>
            </LocationPopup>
          </Popup>
        )}
      </Map>
    </MapContainer>
  );
}
