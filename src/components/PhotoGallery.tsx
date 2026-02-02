import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { X, ChevronLeft, ChevronRight, Trash2, MapPin } from 'lucide-react';
import type { Photo } from '../types/photo';

interface PhotoGalleryProps {
  photos: Photo[];
  onClose: () => void;
  onDeletePhoto: (id: string) => void;
  locationName?: string;
}

export default function PhotoGallery({
  photos,
  onClose,
  onDeletePhoto,
  locationName,
}: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Group photos by date
  const photosByDate = useMemo(() => {
    const groups = new Map<string, Photo[]>();

    const sortedPhotos = [...photos].sort((a, b) => b.date.getTime() - a.date.getTime());

    sortedPhotos.forEach((photo) => {
      const dateKey = format(photo.date, 'MMMM d, yyyy');
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(photo);
    });

    return groups;
  }, [photos]);

  const allPhotos = useMemo(() => {
    return [...photos].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [photos]);

  const handlePrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < allPhotos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedIndex !== null) {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') setSelectedIndex(null);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      onDeletePhoto(id);
      setDeleteConfirm(null);
      if (selectedIndex !== null) {
        if (allPhotos.length <= 1) {
          setSelectedIndex(null);
        } else if (selectedIndex >= allPhotos.length - 1) {
          setSelectedIndex(allPhotos.length - 2);
        }
      }
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/8 bg-black/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-pink-400" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">
              {locationName || 'Photos'}
            </h2>
            <span className="text-white/50 text-base">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-3 rounded-xl hover:bg-white/10 transition-colors"
        >
          <X className="w-7 h-7 text-white" />
        </button>
      </div>

      {/* Content */}
      {selectedIndex !== null ? (
        // Full-screen view
        <div className="flex-1 flex items-center justify-center relative">
          <button
            onClick={handlePrev}
            disabled={selectedIndex === 0}
            className="absolute left-6 p-4 rounded-2xl bg-black/60 hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all z-10 backdrop-blur-sm"
          >
            <ChevronLeft className="w-10 h-10 text-white" />
          </button>

          <div className="max-w-full max-h-full p-8 flex flex-col items-center">
            <img
              src={allPhotos[selectedIndex].url}
              alt={allPhotos[selectedIndex].description || 'Photo'}
              className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
            />
            <div className="mt-6 text-center">
              <p className="text-white/90 text-xl font-medium">
                {format(allPhotos[selectedIndex].date, 'MMMM d, yyyy')}
              </p>
              {allPhotos[selectedIndex].description && (
                <p className="text-white/60 mt-2 text-lg">
                  {allPhotos[selectedIndex].description}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleNext}
            disabled={selectedIndex === allPhotos.length - 1}
            className="absolute right-6 p-4 rounded-2xl bg-black/60 hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all z-10 backdrop-blur-sm"
          >
            <ChevronRight className="w-10 h-10 text-white" />
          </button>

          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-6 right-6 p-3 rounded-xl bg-black/60 hover:bg-black/80 transition-all backdrop-blur-sm"
          >
            <X className="w-7 h-7 text-white" />
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-black/60 backdrop-blur-sm rounded-full text-white/80 text-lg font-medium">
            {selectedIndex + 1} / {allPhotos.length}
          </div>
        </div>
      ) : (
        // Gallery grid view
        <div className="flex-1 overflow-y-auto p-6">
          {Array.from(photosByDate.entries()).map(([date, datePhotos]) => (
            <div key={date} className="mb-10">
              <h3 className="text-xl font-semibold text-white/90 mb-4 sticky top-0 bg-black/90 py-3 backdrop-blur-sm z-10 -mx-6 px-6">
                {date}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {datePhotos.map((photo) => {
                  const photoIndex = allPhotos.findIndex((p) => p.id === photo.id);
                  return (
                    <div
                      key={photo.id}
                      className="relative aspect-square group cursor-pointer"
                      onClick={() => setSelectedIndex(photoIndex)}
                    >
                      <img
                        src={photo.thumbnail}
                        alt={photo.description || 'Photo'}
                        className="w-full h-full object-cover rounded-xl ring-2 ring-white/5 group-hover:ring-pink-500/30 transition-all"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-xl" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(photo.id);
                        }}
                        className={`absolute top-3 right-3 p-2 rounded-xl transition-all ${
                          deleteConfirm === photo.id
                            ? 'bg-red-500 opacity-100'
                            : 'bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Trash2 className="w-5 h-5 text-white" />
                      </button>
                      {deleteConfirm === photo.id && (
                        <div className="absolute top-14 right-2 bg-red-500 text-white text-sm px-3 py-1.5 rounded-lg shadow-lg">
                          Click again to delete
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
