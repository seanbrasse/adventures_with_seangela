import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, MapPin, Check, AlertCircle, Loader2, Clipboard, Search, Calendar } from 'lucide-react';
import type { Photo } from '../types/photo';
import { extractPhotoData, uploadPhotoToStorage } from '../utils/exif';
import { reverseGeocode } from '../utils/geocoding';
import type { ExtractedPhotoData } from '../utils/exif';

interface PhotoUploadProps {
  onUpload: (photos: Photo[]) => void;
  onClose: () => void;
  mapboxToken?: string;
}

interface PendingPhoto extends ExtractedPhotoData {
  // ExtractedPhotoData already has all fields we need
}

interface GeocodingResult {
  id: string;
  place_name: string;
  center: [number, number];
  text: string;
}

// Location autocomplete component
function LocationAutocomplete({
  onSelect,
  mapboxToken,
  onCancel,
}: {
  onSelect: (lat: number, lng: number, name: string) => void;
  mapboxToken?: string;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchLocation = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery || searchQuery.length < 2 || !mapboxToken) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            searchQuery
          )}.json?access_token=${mapboxToken}&types=place,locality,neighborhood,address,poi&limit=6`
        );
        const data = await response.json();
        setResults(data.features || []);
      } catch (error) {
        console.error('Geocoding error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [mapboxToken]
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchLocation(query);
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchLocation]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a location..."
          autoFocus
          className="w-full pl-11 pr-4 py-3 bg-white/8 border border-white/15 rounded-xl text-white text-base placeholder-white/40 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
        {isLoading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 animate-spin" />
        )}
      </div>

      {results.length > 0 && (
        <div className="bg-[#1a1a28] border border-white/10 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.id}
              className="w-full px-4 py-3.5 text-left text-white hover:bg-white/8 transition-colors flex items-start gap-3 border-b border-white/5 last:border-0"
              onClick={() => onSelect(result.center[1], result.center[0], result.text)}
            >
              <MapPin className="w-5 h-5 text-pink-400 mt-0.5 flex-shrink-0" />
              <span className="text-[15px] leading-snug">{result.place_name}</span>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={onCancel}
        className="w-full py-2.5 text-white/60 hover:text-white text-sm transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

export default function PhotoUpload({ onUpload, onClose, mapboxToken }: PhotoUploadProps) {
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [manualDate, setManualDate] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    if (files.length === 0) return;

    setIsProcessing(true);
    const newPhotos: PendingPhoto[] = [];

    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith('image/') ||
        file.type.includes('heic') ||
        /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name);

      if (!isImage) continue;

      const photoData = await extractPhotoData(file);
      if (photoData) {
        // Auto-reverse geocode if photo has coordinates but no name
        if (!photoData.needsLocation && mapboxToken && !photoData.location.name) {
          const geocodeResult = await reverseGeocode(
            photoData.location.lat,
            photoData.location.lng,
            mapboxToken
          );
          if (geocodeResult) {
            photoData.location.name = geocodeResult.fullName;
          }
        }
        newPhotos.push(photoData);
      }
    }

    setPendingPhotos((prev) => [...prev, ...newPhotos]);
    setIsProcessing(false);
  }, [mapboxToken]);

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      processFiles(files);
    }
  }, [processFiles]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);

      const files: File[] = [];

      if (e.dataTransfer.files.length > 0) {
        files.push(...Array.from(e.dataTransfer.files));
      }

      if (e.dataTransfer.items) {
        for (const item of Array.from(e.dataTransfer.items)) {
          if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file && !files.some(f => f.name === file.name && f.size === file.size)) {
              files.push(file);
            }
          }
        }
      }

      if (files.length > 0) {
        processFiles(files);
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

  const handleSetLocation = (id: string, lat: number, lng: number, name: string) => {
    setPendingPhotos((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, location: { lat, lng, name }, needsLocation: false }
          : p
      )
    );
    setEditingLocation(null);
  };

  const handleSetDate = (id: string) => {
    if (!manualDate) return;
    const date = new Date(manualDate);
    if (isNaN(date.getTime())) return;

    setPendingPhotos((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, date } : p
      )
    );
    setEditingDate(null);
    setManualDate('');
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
    <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4 md:p-8">
      <div className="bg-[#12121c] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/10 shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-semibold text-white tracking-tight">Add Photos</h2>
            <p className="text-white/50 text-sm mt-1">Upload photos to add them to your map</p>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-3 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6 text-white/70" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Uploading overlay */}
          {isUploading && (
            <div className="mb-6 p-6 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-2xl border border-pink-500/20">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
                </div>
                <div>
                  <p className="text-white font-medium text-lg">Uploading photos...</p>
                  <p className="text-white/60 text-sm">{uploadProgress}% complete</p>
                </div>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-pink-500 to-purple-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Drop zone */}
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
              isUploading
                ? 'opacity-50 cursor-not-allowed border-white/10'
                : dragActive
                ? 'border-pink-400 bg-pink-400/10 cursor-pointer'
                : 'border-white/15 hover:border-white/30 hover:bg-white/5 cursor-pointer'
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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-5">
              <Upload className="w-8 h-8 text-pink-400" />
            </div>
            <p className="text-white text-lg font-medium mb-2">
              Drag & drop photos here
            </p>
            <p className="text-white/50 mb-6">
              or click to browse your files
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 rounded-xl text-pink-400 text-sm">
              <Clipboard className="w-4 h-4" />
              <span>Tip: Copy photos in Photos app, then paste here (Cmd+V)</span>
            </div>
          </div>

          {/* Processing indicator */}
          {isProcessing && (
            <div className="mt-6 flex items-center justify-center gap-3 text-white/60">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-base">Processing photos...</span>
            </div>
          )}

          {/* Pending photos */}
          {pendingPhotos.length > 0 && (
            <div className="mt-8">
              <h3 className="text-white font-medium text-lg mb-4">
                Selected Photos ({pendingPhotos.length})
              </h3>
              <div className="space-y-3">
                {pendingPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/5"
                  >
                    <img
                      src={photo.thumbnail}
                      alt=""
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate mb-2">
                        {photo.description || 'Untitled photo'}
                      </p>

                      {/* Location */}
                      {photo.needsLocation ? (
                        editingLocation === photo.id ? (
                          <LocationAutocomplete
                            mapboxToken={mapboxToken}
                            onSelect={(lat, lng, name) => handleSetLocation(photo.id, lat, lng, name)}
                            onCancel={() => setEditingLocation(null)}
                          />
                        ) : (
                          <button
                            onClick={() => setEditingLocation(photo.id)}
                            className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors"
                          >
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Add location</span>
                          </button>
                        )
                      ) : (
                        <div className="flex items-center gap-2 text-emerald-400">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">{photo.location.name || `${photo.location.lat.toFixed(4)}, ${photo.location.lng.toFixed(4)}`}</span>
                        </div>
                      )}

                      {/* Date */}
                      <div className="mt-2">
                        {editingDate === photo.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={manualDate}
                              onChange={(e) => setManualDate(e.target.value)}
                              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                            />
                            <button
                              onClick={() => handleSetDate(photo.id)}
                              className="p-2 bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
                            >
                              <Check className="w-4 h-4 text-white" />
                            </button>
                            <button
                              onClick={() => { setEditingDate(null); setManualDate(''); }}
                              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                            >
                              <X className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingDate(photo.id);
                              setManualDate(photo.date.toISOString().split('T')[0]);
                            }}
                            className="flex items-center gap-2 text-white/50 hover:text-white/70 transition-colors"
                          >
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm">{photo.date.toLocaleDateString()}</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(photo.id)}
                      disabled={isUploading}
                      className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors"
                    >
                      <X className="w-5 h-5 text-white/50" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="text-sm">
            {validCount > 0 && (
              <span className="text-emerald-400 font-medium">{validCount} ready to add</span>
            )}
            {needsLocationCount > 0 && (
              <span className="ml-3 text-amber-400">
                {needsLocationCount} need location
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-6 py-3 rounded-xl bg-white/8 text-white hover:bg-white/12 transition-colors disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={validCount === 0 || isUploading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:from-pink-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium shadow-lg shadow-pink-500/25"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
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
