import { useState, useRef, useCallback } from 'react';
import { Upload, X, MapPin, Check, AlertCircle, Loader2 } from 'lucide-react';
import type { Photo } from '../types/photo';
import { extractPhotoData, uploadPhotoToStorage } from '../utils/exif';
import type { ExtractedPhotoData } from '../utils/exif';

interface PhotoUploadProps {
  onUpload: (photos: Photo[]) => void;
  onClose: () => void;
}

interface PendingPhoto extends ExtractedPhotoData {
  // ExtractedPhotoData already has all fields we need
}

export default function PhotoUpload({ onUpload, onClose }: PhotoUploadProps) {
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setIsProcessing(true);
    const newPhotos: PendingPhoto[] = [];

    for (const file of Array.from(files)) {
      // Accept image/* types, HEIC files, and files with image extensions
      const isImage = file.type.startsWith('image/') ||
        file.type.includes('heic') ||
        /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name);

      if (!isImage) continue;

      const photoData = await extractPhotoData(file);
      if (photoData) {
        newPhotos.push(photoData);
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

  const handleSubmit = async () => {
    const validPhotos = pendingPhotos.filter((p) => !p.needsLocation);
    if (validPhotos.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const uploadedPhotos: Photo[] = [];

    for (let i = 0; i < validPhotos.length; i++) {
      const photo = validPhotos[i];
      setUploadProgress(Math.round(((i + 0.5) / validPhotos.length) * 100));

      const uploadResult = await uploadPhotoToStorage(photo.id, photo.file, photo.thumbnail);

      if (uploadResult) {
        uploadedPhotos.push({
          id: photo.id,
          url: uploadResult.url,
          thumbnail: uploadResult.thumbnailUrl,
          location: photo.location,
          date: photo.date,
          description: photo.description,
        });
      }

      setUploadProgress(Math.round(((i + 1) / validPhotos.length) * 100));
    }

    setIsUploading(false);

    if (uploadedPhotos.length > 0) {
      onUpload(uploadedPhotos);
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
            disabled={isUploading}
            className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Uploading overlay */}
          {isUploading && (
            <div className="mb-4 p-4 bg-pink-500/20 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-5 h-5 text-pink-400 animate-spin" />
                <span className="text-white">Uploading photos...</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-white/60 text-sm mt-1">{uploadProgress}% complete</p>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isUploading
                ? 'opacity-50 cursor-not-allowed border-white/10'
                : dragActive
                ? 'border-pink-400 bg-pink-400/10 cursor-pointer'
                : 'border-white/20 hover:border-white/40 cursor-pointer'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
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
            <div className="mt-4 flex items-center justify-center gap-2 text-white/60">
              <Loader2 className="w-4 h-4 animate-spin" />
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
                      disabled={isUploading}
                      className="p-2 rounded-full hover:bg-white/10 disabled:opacity-50"
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
              disabled={isUploading}
              className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={validCount === 0 || isUploading}
              className="px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>Add {validCount} Photo{validCount !== 1 ? 's' : ''}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
