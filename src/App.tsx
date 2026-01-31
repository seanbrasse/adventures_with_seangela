import { useState, useCallback } from 'react';
import { Plus, Menu, X, Heart } from 'lucide-react';
import Globe from './components/Globe';
import PhotoGallery from './components/PhotoGallery';
import PhotoUpload from './components/PhotoUpload';
import Sidebar from './components/Sidebar';
import { usePhotoStorage } from './hooks/usePhotoStorage';
import type { Photo } from './types/photo';

function App() {
  const { photos, isLoading, addPhotos, removePhoto } = usePhotoStorage();
  const [showUpload, setShowUpload] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLocationClick = useCallback((locationPhotos: Photo[]) => {
    setSelectedPhotos(locationPhotos);
    setShowGallery(true);
    if (locationPhotos.length > 0) {
      setSelectedLocation(locationPhotos[0].location);
    }
  }, []);

  const handleCloseGallery = useCallback(() => {
    setShowGallery(false);
    setSelectedPhotos([]);
    setSelectedLocation(null);
  }, []);

  const handleUpload = useCallback(
    (newPhotos: Photo[]) => {
      addPhotos(newPhotos);
    },
    [addPhotos]
  );

  const handleDeletePhoto = useCallback(
    (id: string) => {
      removePhoto(id);
      setSelectedPhotos((prev) => prev.filter((p) => p.id !== id));
    },
    [removePhoto]
  );

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a1a]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading your memories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col md:flex-row relative overflow-hidden">
      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm z-20 relative">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        >
          <Menu className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-lg font-semibold text-white flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-400 fill-pink-400" />
          Our Photo Map
        </h1>
        <button
          onClick={() => setShowUpload(true)}
          className="p-2 rounded-lg bg-pink-500 hover:bg-pink-600 transition-colors"
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-40
          w-80 bg-gray-900/95 backdrop-blur-sm
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Heart className="w-6 h-6 text-pink-400 fill-pink-400" />
            Our Photo Map
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Sidebar content */}
        <div className="flex-1 overflow-hidden">
          <Sidebar photos={photos} onLocationSelect={handleLocationClick} />
        </div>

        {/* Desktop add button */}
        <div className="hidden md:block p-4 border-t border-white/10">
          <button
            onClick={() => setShowUpload(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-pink-500 hover:bg-pink-600 transition-colors text-white font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Photos
          </button>
        </div>
      </aside>

      {/* Main content - Globe */}
      <main className="flex-1 relative">
        <Globe
          photos={photos}
          onLocationClick={handleLocationClick}
          selectedLocation={selectedLocation}
        />

        {/* Empty state overlay */}
        {photos.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-8 text-center max-w-md mx-4 pointer-events-auto">
              <div className="w-20 h-20 rounded-full bg-pink-500/20 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-10 h-10 text-pink-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Start Your Journey
              </h2>
              <p className="text-white/60 mb-6">
                Add photos from your adventures together and watch them appear on the globe!
              </p>
              <button
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-pink-500 hover:bg-pink-600 transition-colors text-white font-medium"
              >
                <Plus className="w-5 h-5" />
                Add Your First Photos
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Photo upload modal */}
      {showUpload && (
        <PhotoUpload onUpload={handleUpload} onClose={() => setShowUpload(false)} />
      )}

      {/* Photo gallery modal */}
      {showGallery && selectedPhotos.length > 0 && (
        <PhotoGallery
          photos={selectedPhotos}
          onClose={handleCloseGallery}
          onDeletePhoto={handleDeletePhoto}
          locationName={selectedPhotos[0]?.location.name}
        />
      )}
    </div>
  );
}

export default App;
