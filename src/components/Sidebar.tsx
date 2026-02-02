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
      <div className="h-full flex flex-col items-center justify-center px-8 py-12 text-center">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center mb-8">
          <Sparkles className="w-12 h-12 text-pink-400" />
        </div>
        <h3 className="text-2xl font-semibold text-white mb-4">No photos yet</h3>
        <p className="text-white/50 text-lg leading-relaxed max-w-xs">
          Add photos with location data to see them on your map
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Stats Section */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Photos stat card */}
          <div className="bg-gradient-to-br from-pink-500/15 to-purple-500/10 rounded-2xl p-5 border border-pink-500/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
                <Image className="w-5 h-5 text-pink-400" />
              </div>
              <span className="text-base font-medium text-pink-300">Photos</span>
            </div>
            <p className="text-4xl font-bold text-white">{stats.totalPhotos}</p>
          </div>

          {/* Places stat card */}
          <div className="bg-gradient-to-br from-blue-500/15 to-cyan-500/10 rounded-2xl p-5 border border-blue-500/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-base font-medium text-blue-300">Places</span>
            </div>
            <p className="text-4xl font-bold text-white">{stats.totalLocations}</p>
          </div>
        </div>

        {/* Date range */}
        {stats.firstDate && stats.lastDate && (
          <div className="mt-5 flex items-center gap-3 px-1">
            <Calendar className="w-5 h-5 text-white/40" />
            <span className="text-base text-white/50">
              {format(stats.firstDate, 'MMM yyyy')} – {format(stats.lastDate, 'MMM yyyy')}
            </span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-6 border-t border-white/10" />

      {/* Locations list */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6">
          <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-5">
            Your Places
          </h3>
          <div className="space-y-4">
            {locations.map((loc) => (
              <button
                key={loc.key}
                onClick={() => onLocationSelect(loc.photos)}
                className="w-full flex items-center gap-5 p-4 bg-white/[0.04] hover:bg-white/[0.08] rounded-2xl transition-all text-left group border border-white/5 hover:border-white/15"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-white/10 group-hover:ring-pink-500/40 transition-all">
                  <img
                    src={loc.photos[0].thumbnail}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-lg truncate mb-1.5">
                    {loc.photos[0].location.name || `${loc.lat.toFixed(2)}, ${loc.lng.toFixed(2)}`}
                  </p>
                  <div className="flex items-center gap-2 text-white/40">
                    <span className="text-base">
                      {loc.photos.length} photo{loc.photos.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-white/20">•</span>
                    <span className="text-base">
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
