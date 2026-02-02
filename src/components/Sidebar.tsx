import { useMemo } from 'react';
import { format } from 'date-fns';
import { MapPin, Calendar, Image, Sparkles } from 'lucide-react';
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
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center mb-6">
          <Sparkles className="w-10 h-10 text-pink-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-3">No photos yet</h3>
        <p className="text-white/50 text-base leading-relaxed max-w-xs">
          Add photos with location data to see them on your map
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Stats */}
      <div className="p-6 border-b border-white/8">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-2xl p-5 border border-white/5">
            <div className="flex items-center gap-2.5 text-pink-400 mb-2">
              <Image className="w-5 h-5" />
              <span className="text-sm font-medium">Photos</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalPhotos}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl p-5 border border-white/5">
            <div className="flex items-center gap-2.5 text-blue-400 mb-2">
              <MapPin className="w-5 h-5" />
              <span className="text-sm font-medium">Places</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalLocations}</p>
          </div>
        </div>
        {stats.firstDate && stats.lastDate && (
          <div className="mt-4 flex items-center gap-2.5 text-white/50 text-sm">
            <Calendar className="w-4 h-4" />
            <span>
              {format(stats.firstDate, 'MMM yyyy')} – {format(stats.lastDate, 'MMM yyyy')}
            </span>
          </div>
        )}
      </div>

      {/* Locations list */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
            Your Places
          </h3>
          <div className="space-y-3">
            {locations.map((loc) => (
              <button
                key={loc.key}
                onClick={() => onLocationSelect(loc.photos)}
                className="w-full flex items-start gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.07] rounded-2xl transition-all text-left group border border-transparent hover:border-white/10"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-white/10 group-hover:ring-pink-500/30 transition-all">
                  <img
                    src={loc.photos[0].thumbnail}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <p className="text-white font-medium text-base truncate mb-1">
                    {loc.photos[0].location.name || `${loc.lat.toFixed(2)}, ${loc.lng.toFixed(2)}`}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-white/40 text-sm">
                      {loc.photos.length} photo{loc.photos.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-white/30">•</span>
                    <span className="text-white/40 text-sm">
                      {format(loc.latestDate, 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
