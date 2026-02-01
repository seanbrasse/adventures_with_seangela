import { useState, useCallback } from 'react';
import { Plus, Menu, X, Heart, Key, Settings } from 'lucide-react';
import MapboxGlobe from './components/MapboxGlobe';
import PhotoGallery from './components/PhotoGallery';
import PhotoUpload from './components/PhotoUpload';
import Sidebar from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import { usePhotoStorage } from './hooks/usePhotoStorage';
import { useSettings } from './hooks/useSettings';
import { useTrips } from './hooks/useTrips';
import type { Photo } from './types/photo';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

function App() {
  const { photos, isLoading, addPhotos, removePhoto } = usePhotoStorage();
  const {
    settings,
    updateHomeBase,
    addHomeBase,
    removeHomeBase,
    resetToDefaults,
  } = useSettings();
  const { flightLines } = useTrips(photos, settings.homeBases);

  const [showUpload, setShowUpload] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiKey, setApiKey] = useState(MAPBOX_TOKEN || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(!MAPBOX_TOKEN);

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Settings className="w-5 h-5 text-white" />
          </button>
        </div>
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

        {/* Desktop buttons */}
        <div className="hidden md:block p-4 border-t border-white/10 space-y-2">
          <button
            onClick={() => setShowUpload(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-pink-500 hover:bg-pink-600 transition-colors text-white font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Photos
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/80"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </aside>

      {/* Main content - Globe */}
      <main className="flex-1 relative">
        {apiKey ? (
          <MapboxGlobe
            photos={photos}
            onLocationClick={handleLocationClick}
            selectedLocation={selectedLocation}
            accessToken={apiKey}
            flightLines={flightLines}
            homeBases={settings.homeBases}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-gray-900 to-gray-800" />
        )}

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

      {/* API Key input modal */}
      {showApiKeyInput && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                <Key className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Mapbox API Key</h2>
                <p className="text-white/60 text-sm">Required to display the map</p>
              </div>
            </div>
            <p className="text-white/70 text-sm mb-4">
              Get your free API key from{' '}
              <a
                href="https://mapbox.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-400 hover:text-pink-300 underline"
              >
                mapbox.com
              </a>
              {' '}(free tier includes 50k map loads/month)
            </p>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="pk.eyJ1Ijo..."
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 mb-4 focus:outline-none focus:border-pink-400"
            />
            <button
              onClick={() => {
                if (apiKey.trim()) {
                  setShowApiKeyInput(false);
                }
              }}
              disabled={!apiKey.trim()}
              className="w-full py-3 rounded-lg bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white font-medium"
            >
              Continue
            </button>
            <p className="text-white/50 text-xs mt-3 text-center">
              Tip: Add VITE_MAPBOX_TOKEN to a .env file to skip this step
            </p>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal
          homeBases={settings.homeBases}
          onUpdateHomeBase={updateHomeBase}
          onAddHomeBase={addHomeBase}
          onRemoveHomeBase={removeHomeBase}
          onResetToDefaults={resetToDefaults}
          onClose={() => setShowSettings(false)}
          mapboxToken={apiKey}
        />
      )}
    </div>
  );
}

export default App;
