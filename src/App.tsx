import { useState, useCallback, useMemo, useEffect } from 'react';
import { Plus, Menu, X, Heart, Key, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import styled, { createGlobalStyle } from 'styled-components';
import MapboxGlobe from './components/MapboxGlobe';
import PhotoGallery, { type LocationContext } from './components/PhotoGallery';
import PhotoUpload from './components/PhotoUpload';
import Sidebar from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import PlacesView from './components/PlacesView';
import PlannedTripModal from './components/PlannedTripModal';
import { usePhotoStorage } from './hooks/usePhotoStorage';
import { useSettings } from './hooks/useSettings';
import { useTrips } from './hooks/useTrips';
import { usePlannedTrips } from './hooks/usePlannedTrips';
import type { Photo, PlannedTrip } from './types/photo';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

// Global Styles
const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: #0a0a14;
    color: #ffffff;
    /* Prevent browser pinch-zoom on touch devices */
    touch-action: pan-x pan-y;
  }
`;

// Styled Components
const AppContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;

  @media (min-width: 768px) {
    flex-direction: row;
  }
`;

const MobileHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
  z-index: 20;
  position: relative;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  @media (min-width: 768px) {
    display: none;
  }
`;

const MobileHeaderButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const IconButton = styled.button`
  padding: 0.625rem;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  svg {
    width: 1.25rem;
    height: 1.25rem;
    color: #ffffff;
  }
`;

const AddButton = styled.button`
  padding: 0.625rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);

  &:hover {
    background: linear-gradient(135deg, #db2777 0%, #be185d 100%);
  }

  svg {
    width: 1.25rem;
    height: 1.25rem;
    color: #ffffff;
  }
`;

const MobileTitle = styled.h1`
  font-size: 1.125rem;
  font-weight: 600;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 0.625rem;

  svg {
    color: #f472b6;
    fill: #f472b6;
  }
`;

const MobileOverlay = styled.div<{ $visible: boolean }>`
  display: ${({ $visible }) => ($visible ? 'block' : 'none')};
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 30;

  @media (min-width: 768px) {
    display: none;
  }
`;

const SidebarWrapper = styled.div<{ $collapsed: boolean }>`
  display: none;

  @media (min-width: 768px) {
    display: flex;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 20;
    height: auto;
    max-height: 100%;
  }
`;

const SidebarContainer = styled.aside<{ $open: boolean; $collapsed: boolean }>`
  position: fixed;
  inset: 0;
  right: auto;
  z-index: 40;
  width: 380px;
  max-width: 85vw;
  background: #0d0d12;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  transform: ${({ $open }) => ($open ? 'translateX(0)' : 'translateX(-100%)')};
  transition: transform 0.3s ease, width 0.3s ease;
  display: flex;
  flex-direction: column;

  @media (min-width: 768px) {
    position: relative;
    inset: auto;
    transform: translateX(0);
    width: ${({ $collapsed }) => ($collapsed ? '0px' : '380px')};
    min-width: ${({ $collapsed }) => ($collapsed ? '0px' : '380px')};
    max-width: none;
    max-height: 100vh;
    overflow: hidden;
    transition: width 0.3s ease, min-width 0.3s ease;
    border-radius: 0 0 1rem 0;
  }
`;

const MobileSidebarContainer = styled.aside<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  right: auto;
  z-index: 40;
  width: 380px;
  max-width: 85vw;
  background: #0d0d12;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  transform: ${({ $open }) => ($open ? 'translateX(0)' : 'translateX(-100%)')};
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;

  @media (min-width: 768px) {
    display: none;
  }
`;

const SidebarHeader = styled.div`
  padding: 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Logo = styled.h1`
  font-size: 1.0625rem;
  font-weight: 600;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 0.625rem;

  svg {
    width: 1.25rem;
    height: 1.25rem;
    color: #f472b6;
    fill: #f472b6;
  }
`;

const CloseButton = styled.button`
  padding: 0.625rem;
  border-radius: 0.625rem;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  svg {
    width: 1.5rem;
    height: 1.5rem;
    color: #ffffff;
  }

  @media (min-width: 768px) {
    display: none;
  }
`;

const SidebarContent = styled.div`
  overflow-y: auto;
  width: 100%;
  max-height: calc(100vh - 200px);
`;

const SidebarFooter = styled.div`
  display: none;
  padding: 1rem 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);

  @media (min-width: 768px) {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const CollapseToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 24px;
  height: 48px;
  background: #1a1a24;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-left: none;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  z-index: 50;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: #252532;
    border-color: rgba(255, 255, 255, 0.2);
  }

  svg {
    width: 16px;
    height: 16px;
    color: rgba(255, 255, 255, 0.6);
  }
`;

const PrimaryButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 0.625rem;
  background: #ec4899;
  border: none;
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: #db2777;
  }

  &:active {
    transform: scale(0.98);
  }

  svg {
    width: 1rem;
    height: 1rem;
  }
`;

const SecondaryButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 0.625rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.8);
  }

  svg {
    width: 1rem;
    height: 1rem;
  }
`;

const MainContent = styled.main`
  flex: 1;
  position: relative;
  background: #0a0a14;
`;

const EmptyPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #0f0f1a 0%, #0a0a14 100%);
`;

const EmptyStateOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const EmptyStateCard = styled.div`
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(16px);
  border-radius: 1.75rem;
  padding: 3rem;
  text-align: center;
  max-width: 28rem;
  margin: 1.5rem;
  pointer-events: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
`;

const EmptyStateIcon = styled.div`
  width: 5.5rem;
  height: 5.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.15) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.75rem;

  svg {
    width: 2.75rem;
    height: 2.75rem;
    color: #f472b6;
  }
`;

const EmptyStateTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 0.75rem;
  letter-spacing: -0.02em;
`;

const EmptyStateText = styled.p`
  font-size: 1.0625rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const EmptyStateButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  padding: 1rem 1.75rem;
  border-radius: 0.875rem;
  background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
  border: none;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 8px 24px rgba(236, 72, 153, 0.3);

  &:hover {
    background: linear-gradient(135deg, #db2777 0%, #be185d 100%);
    transform: translateY(-1px);
  }

  svg {
    width: 1.25rem;
    height: 1.25rem;
  }
`;

const ApiKeyModal = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
`;

const ApiKeyCard = styled.div`
  background: linear-gradient(180deg, #16162a 0%, #111120 100%);
  border-radius: 1.75rem;
  max-width: 32rem;
  width: 100%;
  padding: 2.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6);
`;

const ApiKeyHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-bottom: 1.75rem;
`;

const ApiKeyIcon = styled.div`
  width: 4rem;
  height: 4rem;
  border-radius: 1.25rem;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.15) 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 2rem;
    height: 2rem;
    color: #f472b6;
  }
`;

const ApiKeyHeaderText = styled.div`
  h2 {
    font-size: 1.625rem;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 0.375rem;
    letter-spacing: -0.01em;
  }

  p {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.5);
  }
`;

const ApiKeyDescription = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin-bottom: 1.75rem;

  a {
    color: #f472b6;
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: #f9a8d4;
      text-decoration: underline;
    }
  }
`;

const ApiKeyInput = styled.input`
  width: 100%;
  padding: 1.125rem 1.25rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  color: #ffffff;
  font-size: 1.0625rem;
  margin-bottom: 1.5rem;
  transition: all 0.2s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    outline: none;
    border-color: rgba(236, 72, 153, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }
`;

const ApiKeyButton = styled.button`
  width: 100%;
  padding: 1.125rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
  border: none;
  color: #ffffff;
  font-size: 1.0625rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 8px 24px rgba(236, 72, 153, 0.25);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #db2777 0%, #be185d 100%);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ApiKeyTip = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.45);
  text-align: center;
  margin-top: 1.25rem;
`;

const LoadingScreen = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a14;
`;

const LoadingContent = styled.div`
  text-align: center;
`;

const LoadingSpinner = styled.div`
  width: 4rem;
  height: 4rem;
  border: 3px solid rgba(236, 72, 153, 0.2);
  border-top-color: #ec4899;
  border-radius: 50%;
  margin: 0 auto 1.25rem;
  animation: spin 1s linear infinite;

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoadingText = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.6);
`;

function App() {
  const { photos, isLoading, addPhotos, removePhoto, updatePhoto } = usePhotoStorage();
  const {
    settings,
    updateHomeBase,
    addHomeBase,
    removeHomeBase,
    resetToDefaults,
  } = useSettings();
  const { trips, flightLines, updateTrip, deleteTrip } = useTrips(photos, settings.homeBases);
  const {
    plannedTrips,
    addPlannedTrip,
    updatePlannedTrip,
    deletePlannedTrip,
  } = usePlannedTrips();

  const [showUpload, setShowUpload] = useState(false);
  const [showPlannedTripModal, setShowPlannedTripModal] = useState(false);
  const [editingPlannedTrip, setEditingPlannedTrip] = useState<PlannedTrip | undefined>(undefined);
  const [showGallery, setShowGallery] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlacesView, setShowPlacesView] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [apiKey, setApiKey] = useState(MAPBOX_TOKEN || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(!MAPBOX_TOKEN);
  const [uploadTargetLocation, setUploadTargetLocation] = useState<LocationContext | null>(null);

  // Prevent browser zoom from trackpad pinch (Ctrl+wheel)
  // This allows only the map to handle zoom gestures
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, []);

  const handleLocationClick = useCallback((locationPhotos: Photo[]) => {
    setSelectedPhotos(locationPhotos);
    setShowGallery(true);
    if (locationPhotos.length > 0) {
      setSelectedLocation(locationPhotos[0].location);
    }
  }, []);

  const handlePlacesClick = useCallback(() => {
    setShowPlacesView(true);
  }, []);

  const handleCloseGallery = useCallback(() => {
    setShowGallery(false);
    setSelectedPhotos([]);
    setSelectedLocation(null);
  }, []);

  const handleUpload = useCallback(
    (newPhotos: Photo[]) => {
      addPhotos(newPhotos);
      setUploadTargetLocation(null);
    },
    [addPhotos]
  );

  const handleAddPhotoToLocation = useCallback((location: LocationContext) => {
    setUploadTargetLocation(location);
    setShowGallery(false);
    setShowUpload(true);
  }, []);

  const handleDeletePhoto = useCallback(
    (id: string) => {
      removePhoto(id);
      setSelectedPhotos((prev) => prev.filter((p) => p.id !== id));
    },
    [removePhoto]
  );

  const handleRenameLocation = useCallback(
    (photoIds: string[], newName: string) => {
      photoIds.forEach((id) => {
        const photo = photos.find((p) => p.id === id);
        if (photo) {
          updatePhoto(id, {
            location: {
              ...photo.location,
              name: newName,
            },
          });
        }
      });
      // Update selected photos to reflect the new name
      setSelectedPhotos((prev) =>
        prev.map((p) => ({
          ...p,
          location: { ...p.location, name: newName },
        }))
      );
    },
    [photos, updatePhoto]
  );

  // Find the trip that contains the selected photos
  const selectedTrip = useMemo(() => {
    if (selectedPhotos.length === 0) return undefined;
    const firstPhotoId = selectedPhotos[0].id;
    return trips.find(trip => trip.photoIds.includes(firstPhotoId));
  }, [selectedPhotos, trips]);

  const handleDeleteTrip = useCallback((tripId: string, deletePhotos: boolean) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;

    if (deletePhotos) {
      // Delete all photos in the trip
      trip.photoIds.forEach(photoId => {
        removePhoto(photoId);
      });
    }

    // Delete the trip
    deleteTrip(tripId);

    // Close the gallery
    handleCloseGallery();
  }, [trips, removePhoto, deleteTrip, handleCloseGallery]);

  // Planned trip handlers
  const handleAddPlannedTrip = useCallback(() => {
    setEditingPlannedTrip(undefined);
    setShowPlannedTripModal(true);
  }, []);

  const handlePlannedTripClick = useCallback((trip: PlannedTrip) => {
    setEditingPlannedTrip(trip);
    setShowPlannedTripModal(true);
  }, []);

  const handleSavePlannedTrip = useCallback((tripData: Omit<PlannedTrip, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingPlannedTrip) {
      updatePlannedTrip(editingPlannedTrip.id, tripData);
    } else {
      addPlannedTrip(tripData);
    }
    setShowPlannedTripModal(false);
    setEditingPlannedTrip(undefined);
  }, [editingPlannedTrip, addPlannedTrip, updatePlannedTrip]);

  const handleDeletePlannedTrip = useCallback(() => {
    if (editingPlannedTrip) {
      deletePlannedTrip(editingPlannedTrip.id);
      setShowPlannedTripModal(false);
      setEditingPlannedTrip(undefined);
    }
  }, [editingPlannedTrip, deletePlannedTrip]);

  const handleConvertPlannedTrip = useCallback(() => {
    // Convert planned trip to show the upload modal with the location pre-filled
    if (editingPlannedTrip) {
      setUploadTargetLocation({
        lat: editingPlannedTrip.lat,
        lng: editingPlannedTrip.lng,
        name: editingPlannedTrip.destinationName,
      });
      // Delete the planned trip
      deletePlannedTrip(editingPlannedTrip.id);
      setShowPlannedTripModal(false);
      setEditingPlannedTrip(undefined);
      setShowUpload(true);
    }
  }, [editingPlannedTrip, deletePlannedTrip]);

  if (isLoading) {
    return (
      <>
        <GlobalStyle />
        <LoadingScreen>
          <LoadingContent>
            <LoadingSpinner />
            <LoadingText>Loading your memories...</LoadingText>
          </LoadingContent>
        </LoadingScreen>
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      <AppContainer>
        {/* Mobile header */}
        <MobileHeader>
          <MobileHeaderButtons>
            <IconButton onClick={() => setSidebarOpen(true)}>
              <Menu />
            </IconButton>
            <IconButton onClick={() => setShowSettings(true)}>
              <Settings />
            </IconButton>
          </MobileHeaderButtons>
          <MobileTitle>
            <Heart size={20} />
            Adventures with Seangela
          </MobileTitle>
          <AddButton onClick={() => setShowUpload(true)}>
            <Plus />
          </AddButton>
        </MobileHeader>

        {/* Mobile sidebar overlay */}
        <MobileOverlay $visible={sidebarOpen} onClick={() => setSidebarOpen(false)} />

        {/* Mobile Sidebar */}
        <MobileSidebarContainer $open={sidebarOpen}>
          <SidebarHeader>
            <Logo>
              <Heart />
              Adventures with Seangela
            </Logo>
            <CloseButton onClick={() => setSidebarOpen(false)}>
              <X />
            </CloseButton>
          </SidebarHeader>

          <SidebarContent>
            <Sidebar
              photos={photos}
              trips={trips}
              plannedTrips={plannedTrips}
              onLocationSelect={handleLocationClick}
              onPlacesClick={handlePlacesClick}
              onPlannedTripClick={handlePlannedTripClick}
              onAddPlannedTrip={handleAddPlannedTrip}
              onAddPhotos={() => setShowUpload(true)}
            />
          </SidebarContent>
        </MobileSidebarContainer>

        {/* Desktop Sidebar with collapse toggle */}
        <SidebarWrapper $collapsed={sidebarCollapsed}>
          <SidebarContainer $open={true} $collapsed={sidebarCollapsed}>
            <SidebarHeader>
              <Logo>
                <Heart />
                Adventures with Seangela
              </Logo>
            </SidebarHeader>

            <SidebarContent>
              <Sidebar
                photos={photos}
                trips={trips}
                plannedTrips={plannedTrips}
                onLocationSelect={handleLocationClick}
                onPlacesClick={handlePlacesClick}
                onPlannedTripClick={handlePlannedTripClick}
                onAddPlannedTrip={handleAddPlannedTrip}
                onAddPhotos={() => setShowUpload(true)}
              />
            </SidebarContent>

            <SidebarFooter>
              <PrimaryButton onClick={() => setShowUpload(true)}>
                <Plus />
                Add Photos
              </PrimaryButton>
              <SecondaryButton onClick={() => setShowSettings(true)}>
                <Settings />
                Settings
              </SecondaryButton>
            </SidebarFooter>
          </SidebarContainer>

          <CollapseToggle
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
          </CollapseToggle>
        </SidebarWrapper>

        {/* Main content - Globe */}
        <MainContent>
          {apiKey ? (
            <MapboxGlobe
              photos={photos}
              trips={trips}
              plannedTrips={plannedTrips}
              onLocationClick={handleLocationClick}
              onPlannedTripClick={handlePlannedTripClick}
              selectedLocation={selectedLocation}
              accessToken={apiKey}
              flightLines={flightLines}
              homeBases={settings.homeBases}
              sidebarCollapsed={sidebarCollapsed}
            />
          ) : (
            <EmptyPlaceholder />
          )}

          {/* Empty state overlay */}
          {photos.length === 0 && (
            <EmptyStateOverlay>
              <EmptyStateCard>
                <EmptyStateIcon>
                  <Heart />
                </EmptyStateIcon>
                <EmptyStateTitle>Start Your Journey</EmptyStateTitle>
                <EmptyStateText>
                  Add photos from your adventures together and watch them appear on the globe!
                </EmptyStateText>
                <EmptyStateButton onClick={() => setShowUpload(true)}>
                  <Plus />
                  Add Your First Photos
                </EmptyStateButton>
              </EmptyStateCard>
            </EmptyStateOverlay>
          )}
        </MainContent>

        {/* Photo upload modal */}
        {showUpload && (
          <PhotoUpload
            onUpload={handleUpload}
            onClose={() => {
              setShowUpload(false);
              setUploadTargetLocation(null);
            }}
            mapboxToken={apiKey}
            targetLocation={uploadTargetLocation}
          />
        )}

        {/* Photo gallery modal */}
        {showGallery && selectedPhotos.length > 0 && (
          <PhotoGallery
            photos={selectedPhotos}
            trip={selectedTrip}
            onClose={handleCloseGallery}
            onDeletePhoto={handleDeletePhoto}
            onRenameLocation={handleRenameLocation}
            onUpdatePhoto={(id, updates) => {
              updatePhoto(id, updates);
              setSelectedPhotos((prev) =>
                prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
              );
            }}
            onUpdateTrip={updateTrip}
            onDeleteTrip={handleDeleteTrip}
            onAddPhoto={handleAddPhotoToLocation}
            locationName={selectedPhotos[0]?.location.name}
            mapboxToken={apiKey}
          />
        )}

        {/* API Key input modal */}
        {showApiKeyInput && (
          <ApiKeyModal>
            <ApiKeyCard>
              <ApiKeyHeader>
                <ApiKeyIcon>
                  <Key />
                </ApiKeyIcon>
                <ApiKeyHeaderText>
                  <h2>Mapbox API Key</h2>
                  <p>Required to display the map</p>
                </ApiKeyHeaderText>
              </ApiKeyHeader>
              <ApiKeyDescription>
                Get your free API key from{' '}
                <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer">
                  mapbox.com
                </a>{' '}
                (free tier includes 50k map loads/month)
              </ApiKeyDescription>
              <ApiKeyInput
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="pk.eyJ1Ijo..."
              />
              <ApiKeyButton
                onClick={() => {
                  if (apiKey.trim()) {
                    setShowApiKeyInput(false);
                  }
                }}
                disabled={!apiKey.trim()}
              >
                Continue
              </ApiKeyButton>
              <ApiKeyTip>Tip: Add VITE_MAPBOX_TOKEN to a .env file to skip this step</ApiKeyTip>
            </ApiKeyCard>
          </ApiKeyModal>
        )}

        {/* Places view modal */}
        {showPlacesView && (
          <PlacesView
            photos={photos}
            trips={trips}
            plannedTrips={plannedTrips}
            onClose={() => setShowPlacesView(false)}
            onLocationSelect={handleLocationClick}
            onPlannedTripClick={handlePlannedTripClick}
            onAddPlannedTrip={handleAddPlannedTrip}
          />
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

        {/* Planned trip modal */}
        {showPlannedTripModal && (
          <PlannedTripModal
            trip={editingPlannedTrip}
            onSave={handleSavePlannedTrip}
            onDelete={editingPlannedTrip ? handleDeletePlannedTrip : undefined}
            onConvertToTrip={editingPlannedTrip ? handleConvertPlannedTrip : undefined}
            onClose={() => {
              setShowPlannedTripModal(false);
              setEditingPlannedTrip(undefined);
            }}
            mapboxToken={apiKey}
          />
        )}
      </AppContainer>
    </>
  );
}

export default App;
