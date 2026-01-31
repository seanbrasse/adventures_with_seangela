import { useRef, useEffect, useMemo, useCallback } from 'react';
import GlobeGL from 'react-globe.gl';
import type { Photo } from '../types/photo';
import { groupPhotosByLocation } from '../utils/exif';

interface GlobeProps {
  photos: Photo[];
  onLocationClick: (photos: Photo[]) => void;
  selectedLocation: { lat: number; lng: number } | null;
}

interface PointData {
  lat: number;
  lng: number;
  photos: Photo[];
  size: number;
  color: string;
}

export default function Globe({ photos, onLocationClick, selectedLocation }: GlobeProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);

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
          size: Math.min(0.5 + groupPhotos.length * 0.15, 2),
          color: '#ff6b9d',
        });
      }
    });

    return points;
  }, [photos]);

  // Auto-rotate when no selection
  useEffect(() => {
    if (globeRef.current) {
      const controls = globeRef.current.controls();
      if (controls) {
        controls.autoRotate = !selectedLocation;
        controls.autoRotateSpeed = 0.5;
      }
    }
  }, [selectedLocation]);

  // Focus on selected location
  useEffect(() => {
    if (globeRef.current && selectedLocation) {
      globeRef.current.pointOfView(
        { lat: selectedLocation.lat, lng: selectedLocation.lng, altitude: 1.5 },
        1000
      );
    }
  }, [selectedLocation]);

  // Initial globe setup
  useEffect(() => {
    if (globeRef.current) {
      // Set initial position
      if (pointsData.length > 0) {
        const firstPoint = pointsData[0];
        globeRef.current.pointOfView(
          { lat: firstPoint.lat, lng: firstPoint.lng, altitude: 2 },
          0
        );
      }
    }
  }, [pointsData.length]);

  const handlePointClick = useCallback(
    (point: PointData) => {
      onLocationClick(point.photos);
    },
    [onLocationClick]
  );

  return (
    <div className="w-full h-full">
      <GlobeGL
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointRadius="size"
        pointAltitude={0.01}
        pointLabel={(d: object) => {
          const point = d as PointData;
          return `
            <div style="background: rgba(0,0,0,0.8); padding: 8px 12px; border-radius: 8px; color: white;">
              <strong>${point.photos.length} photo${point.photos.length > 1 ? 's' : ''}</strong>
              ${point.photos[0]?.location.name ? `<br/>${point.photos[0].location.name}` : ''}
            </div>
          `;
        }}
        onPointClick={(point: object) => handlePointClick(point as PointData)}
        atmosphereColor="#ff6b9d"
        atmosphereAltitude={0.15}
        animateIn={true}
      />
    </div>
  );
}
