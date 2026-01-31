import { useState, useRef, useCallback } from 'react';
import { Upload, X, MapPin, Check, AlertCircle } from 'lucide-react';
import type { Photo } from '../types/photo';
import { extractPhotoData } from '../utils/exif';

interface PhotoUploadProps {
  onUpload: (photos: Photo[]) => void;
  onClose: () => void;
}

interface PendingPhoto extends Photo {
  needsLocation: boolean;
  file: File;
}

export default function PhotoUpload({ onUpload, onClose }: PhotoUploadProps) {
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setIsProcessing(true);
    const newPhotos: PendingPhoto[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;

      const photoData = await extractPhotoData(file);
      if (photoData) {
        const needsLocation = photoData.location.lat === 0 && photoData.location.lng === 0;
        newPhotos.push({
          ...photoData,
          needsLocation,
          file,
        });
      }
    }

    setPendingPhotos((prev) => [...prev, ...newPhotos]);
    setIsProcessing(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  const handleRemove = (id: string) => {
    setPendingPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSetLocation = (id: string) => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return;
    }

    setPendingPhotos((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, location: { lat, lng }, needsLocation: false }
          : p
      )
    );
    setEditingLocation(null);
    setManualLat('');
    setManualLng('');
  };

  const handleSubmit = () => {
    const validPhotos = pendingPhotos.filter((p) => !p.needsLocation);
    if (validPhotos.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const photosToUpload = validPhotos.map(({ needsLocation, file, ...photo }) => photo);
      onUpload(photosToUpload);
      onClose();
    }
  };

  const validCount = pendingPhotos.filter((p) => !p.needsLocation).length;
  const needsLocationCount = pendingPhotos.filter((p) => p.needsLocation).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Add Photos</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-pink-400 bg-pink-400/10'
                : 'border-white/20 hover:border-white/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="w-12 h-12 mx-auto mb-4 text-white/60" />
            <p className="text-white/80 mb-2">
              Drag & drop photos here, or click to select
            </p>
            <p className="text-white/50 text-sm">
              Photos with GPS data will be automatically placed on the map
            </p>
          </div>

          {/* Processing indicator */}
          {isProcessing && (
            <div className="mt-4 text-center text-white/60">
              Processing photos...
            </div>
          )}

          {/* Pending photos */}
          {pendingPhotos.length > 0 && (
            <div className="mt-6">
              <h3 className="text-white/80 font-medium mb-3">
                Selected Photos ({pendingPhotos.length})
              </h3>
              <div className="space-y-2">
                {pendingPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                  >
                    <img
                      src={photo.thumbnail}
                      alt=""
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-sm truncate">
                        {photo.description}
                      </p>
                      {photo.needsLocation ? (
                        editingLocation === photo.id ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="number"
                              placeholder="Lat"
                              value={manualLat}
                              onChange={(e) => setManualLat(e.target.value)}
                              className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
                              step="any"
                            />
                            <input
                              type="number"
                              placeholder="Lng"
                              value={manualLng}
                              onChange={(e) => setManualLng(e.target.value)}
                              className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
                              step="any"
                            />
                            <button
                              onClick={() => handleSetLocation(photo.id)}
                              className="p-1 bg-green-500 rounded hover:bg-green-600"
                            >
                              <Check className="w-3 h-3 text-white" />
                            </button>
                            <button
                              onClick={() => setEditingLocation(null)}
                              className="p-1 bg-white/20 rounded hover:bg-white/30"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingLocation(photo.id)}
                            className="flex items-center gap-1 text-amber-400 text-xs mt-1 hover:text-amber-300"
                          >
                            <AlertCircle className="w-3 h-3" />
                            No location - click to set manually
                          </button>
                        )
                      ) : (
                        <div className="flex items-center gap-1 text-green-400 text-xs mt-1">
                          <MapPin className="w-3 h-3" />
                          {photo.location.lat.toFixed(4)}, {photo.location.lng.toFixed(4)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemove(photo.id)}
                      className="p-2 rounded-full hover:bg-white/10"
                    >
                      <X className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <div className="text-sm text-white/60">
            {validCount > 0 && (
              <span className="text-green-400">{validCount} ready to add</span>
            )}
            {needsLocationCount > 0 && (
              <span className="ml-2 text-amber-400">
                {needsLocationCount} need location
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={validCount === 0}
              className="px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add {validCount} Photo{validCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
