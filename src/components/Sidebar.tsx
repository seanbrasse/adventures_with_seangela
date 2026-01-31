import { useMemo } from 'react';
import { format } from 'date-fns';
import { MapPin, Calendar, Image } from 'lucide-react';
import type { Photo } from '../types/photo';
import { groupPhotosByLocation } from '../utils/exif';

interface SidebarProps {
  photos: Photo[];
  onLocationSelect: (photos: Photo[]) => void;
}

export default function Sidebar({ photos, onLocationSelect }: SidebarProps) {
  const locations = useMemo(() => {
    const groups = groupPhotosByLocation(photos);
    const locs: { key: string; lat: number; lng: number; photos: Photo[]; latestDate: Date }[] = [];

    groups.forEach((groupPhotos, key) => {
      const [lat, lng] = key.split(',').map(Number);
      if (lat !== 0 || lng !== 0) {
        const sortedPhotos = [...groupPhotos].sort((a, b) => b.date.getTime() - a.date.getTime());
        locs.push({
          key,
          lat,
          lng,
          photos: sortedPhotos,
          latestDate: sortedPhotos[0].date,
        });
      }
    });

    return locs.sort((a, b) => b.latestDate.getTime() - a.latestDate.getTime());
  }, [photos]);

  const stats = useMemo(() => {
    const totalPhotos = photos.length;
    const totalLocations = locations.length;
    const dates = photos.map((p) => p.date.getTime());
    const firstDate = dates.length > 0 ? new Date(Math.min(...dates)) : null;
    const lastDate = dates.length > 0 ? new Date(Math.max(...dates)) : null;

    return { totalPhotos, totalLocations, firstDate, lastDate };
  }, [photos, locations]);

  if (photos.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-pink-500/20 flex items-center justify-center mb-4">
          <Image className="w-10 h-10 text-pink-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No photos yet</h3>
        <p className="text-white/60">
          Add photos with location data to see them on the globe
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Stats */}
      <div className="p-4 border-b border-white/10">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 text-pink-400 mb-1">
              <Image className="w-4 h-4" />
              <span className="text-sm">Photos</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalPhotos}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 text-pink-400 mb-1">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">Locations</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalLocations}</p>
          </div>
        </div>
        {stats.firstDate && stats.lastDate && (
          <div className="mt-3 flex items-center gap-2 text-white/60 text-sm">
            <Calendar className="w-4 h-4" />
            <span>
              {format(stats.firstDate, 'MMM yyyy')} - {format(stats.lastDate, 'MMM yyyy')}
            </span>
          </div>
        )}
      </div>

      {/* Locations list */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-medium text-white/60 mb-3">Locations</h3>
          <div className="space-y-2">
            {locations.map((loc) => (
              <button
                key={loc.key}
                onClick={() => onLocationSelect(loc.photos)}
                className="w-full flex items-start gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={loc.photos[0].thumbnail}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {loc.photos[0].location.name || `${loc.lat.toFixed(2)}, ${loc.lng.toFixed(2)}`}
                  </p>
                  <p className="text-white/60 text-sm">
                    {loc.photos.length} photo{loc.photos.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-white/40 text-xs">
                    {format(loc.latestDate, 'MMM d, yyyy')}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
