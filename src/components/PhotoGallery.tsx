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
      className="fixed inset-0 z-50 bg-black/90 flex flex-col"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-pink-400" />
          <h2 className="text-xl font-semibold text-white">
            {locationName || 'Photos'}
          </h2>
          <span className="text-white/60 ml-2">({photos.length} photos)</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Content */}
      {selectedIndex !== null ? (
        // Full-screen view
        <div className="flex-1 flex items-center justify-center relative">
          <button
            onClick={handlePrev}
            disabled={selectedIndex === 0}
            className="absolute left-4 p-2 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all z-10"
          >
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>

          <div className="max-w-full max-h-full p-4 flex flex-col items-center">
            <img
              src={allPhotos[selectedIndex].url}
              alt={allPhotos[selectedIndex].description || 'Photo'}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
            <div className="mt-4 text-center">
              <p className="text-white/80">
                {format(allPhotos[selectedIndex].date, 'MMMM d, yyyy')}
              </p>
              {allPhotos[selectedIndex].description && (
                <p className="text-white/60 mt-1">
                  {allPhotos[selectedIndex].description}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleNext}
            disabled={selectedIndex === allPhotos.length - 1}
            className="absolute right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all z-10"
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>

          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60">
            {selectedIndex + 1} / {allPhotos.length}
          </div>
        </div>
      ) : (
        // Gallery grid view
        <div className="flex-1 overflow-y-auto p-4">
          {Array.from(photosByDate.entries()).map(([date, datePhotos]) => (
            <div key={date} className="mb-8">
              <h3 className="text-lg font-medium text-white/80 mb-3 sticky top-0 bg-black/80 py-2 backdrop-blur-sm">
                {date}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
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
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all rounded-lg" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(photo.id);
                        }}
                        className={`absolute top-2 right-2 p-1.5 rounded-full transition-all ${
                          deleteConfirm === photo.id
                            ? 'bg-red-500 opacity-100'
                            : 'bg-black/50 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                      {deleteConfirm === photo.id && (
                        <div className="absolute top-10 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
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
