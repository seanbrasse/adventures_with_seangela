import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, MapPin, Check, AlertCircle, Loader2, Clipboard, Search, Calendar, Plane } from 'lucide-react';
import styled, { keyframes } from 'styled-components';
import type { Photo, PlannedTrip } from '../types/photo';
import { extractPhotoData, uploadPhotoToStorage } from '../utils/exif';
import { reverseGeocode } from '../utils/geocoding';
import type { ExtractedPhotoData } from '../utils/exif';

export interface TargetLocation {
  lat: number;
  lng: number;
  name: string;
}

interface PhotoUploadProps {
  onUpload: (photos: Photo[]) => void;
  onClose: () => void;
  mapboxToken?: string;
  targetLocation?: TargetLocation | null;
  convertingFromPlannedTrip?: PlannedTrip;
}

interface PendingPhoto extends ExtractedPhotoData {
  locationMismatch?: {
    distance: number;
    photoLocation: string;
  };
}

interface GeocodingResult {
  id: string;
  place_name: string;
  center: [number, number];
  text: string;
}

// Animations
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Styled Components
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const Modal = styled.div`
  background: linear-gradient(180deg, #16162a 0%, #111120 100%);
  border-radius: 1.75rem;
  max-width: 56rem;
  width: 100%;
  max-height: 88vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: between;
  padding: 2rem 2.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const Title = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  font-size: 1.0625rem;
  color: rgba(255, 255, 255, 0.5);
`;

const CloseButton = styled.button`
  padding: 0.875rem;
  border-radius: 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 1.5rem;
    height: 1.5rem;
    color: rgba(255, 255, 255, 0.6);
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 2rem 2.5rem;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
`;

const UploadingBanner = styled.div`
  margin-bottom: 1.5rem;
  padding: 1.75rem;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(168, 85, 247, 0.12) 100%);
  border-radius: 1.25rem;
  border: 1px solid rgba(236, 72, 153, 0.2);
`;

const UploadingHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
`;

const UploadingIcon = styled.div`
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 1rem;
  background: rgba(236, 72, 153, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 1.75rem;
    height: 1.75rem;
    color: #f472b6;
    animation: ${spin} 1s linear infinite;
  }
`;

const UploadingText = styled.div`
  p:first-child {
    font-size: 1.125rem;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 0.25rem;
  }

  p:last-child {
    font-size: 0.9375rem;
    color: rgba(255, 255, 255, 0.6);
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 0.625rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $progress: number }>`
  width: ${({ $progress }) => $progress}%;
  height: 100%;
  background: linear-gradient(90deg, #ec4899 0%, #a855f7 100%);
  border-radius: 9999px;
  transition: width 0.3s ease;
`;

const DropZone = styled.div<{ $active: boolean; $disabled: boolean }>`
  border: 2px dashed ${({ $active }) => ($active ? '#ec4899' : 'rgba(255, 255, 255, 0.15)')};
  border-radius: 1.5rem;
  padding: 4rem 3rem;
  text-align: center;
  transition: all 0.2s ease;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  background: ${({ $active }) => ($active ? 'rgba(236, 72, 153, 0.08)' : 'transparent')};

  &:hover {
    border-color: ${({ $disabled }) => ($disabled ? 'rgba(255, 255, 255, 0.15)' : 'rgba(236, 72, 153, 0.5)')};
    background: ${({ $disabled }) => ($disabled ? 'transparent' : 'rgba(255, 255, 255, 0.02)')};
  }
`;

const DropZoneIcon = styled.div`
  width: 5.5rem;
  height: 5.5rem;
  border-radius: 1.5rem;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.15) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  box-shadow: 0 8px 32px rgba(236, 72, 153, 0.15);

  svg {
    width: 2.75rem;
    height: 2.75rem;
    color: #f472b6;
  }
`;

const DropZoneTitle = styled.p`
  font-size: 1.375rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.625rem;
`;

const DropZoneText = styled.p`
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 2rem;
`;

const PasteTip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1.25rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.875rem;
  color: #f472b6;
  font-size: 0.9375rem;
  font-weight: 500;

  svg {
    width: 1.25rem;
    height: 1.25rem;
  }
`;

const ProcessingIndicator = styled.div`
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1rem;

  svg {
    animation: ${spin} 1s linear infinite;
  }
`;

const PhotosSection = styled.div`
  margin-top: 2rem;
`;

const PhotosSectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 1.25rem;
`;

const PhotosList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
`;

const PhotoCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
`;

const PhotoThumbnail = styled.img`
  width: 4.5rem;
  height: 4.5rem;
  object-fit: cover;
  border-radius: 0.75rem;
  flex-shrink: 0;
`;

const PhotoInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const PhotoName = styled.p`
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const LocationButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
  border: 1px dashed rgba(251, 191, 36, 0.4);
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.5rem 0.75rem;
  transition: all 0.2s ease;

  &:hover {
    color: #fcd34d;
    background: rgba(251, 191, 36, 0.15);
    border-color: rgba(251, 191, 36, 0.6);
  }
`;

const LocationDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #34d399;
  font-size: 0.9375rem;
`;

const DateSection = styled.div`
  margin-top: 0.75rem;
`;

const DateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.5);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9375rem;
  padding: 0;
  transition: color 0.2s ease;

  &:hover {
    color: rgba(255, 255, 255, 0.7);
  }
`;

const DateEditWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DateInput = styled.input`
  padding: 0.625rem 0.875rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0.625rem;
  color: #ffffff;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #ec4899;
  }
`;

const IconButton = styled.button<{ $variant?: 'success' | 'neutral' }>`
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${({ $variant }) =>
    $variant === 'success' ? '#10b981' : 'rgba(255, 255, 255, 0.08)'};

  &:hover {
    background: ${({ $variant }) =>
      $variant === 'success' ? '#059669' : 'rgba(255, 255, 255, 0.15)'};
  }

  svg {
    width: 1rem;
    height: 1rem;
    color: #ffffff;
  }
`;

const RemoveButton = styled.button`
  padding: 0.625rem;
  border-radius: 0.625rem;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 1.25rem;
    height: 1.25rem;
    color: rgba(255, 255, 255, 0.5);
  }
`;

const Footer = styled.div`
  padding: 1.75rem 2.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.02);
`;

const FooterStatus = styled.div`
  font-size: 1rem;
`;

const ReadyCount = styled.span`
  color: #34d399;
  font-weight: 600;
`;

const NeedsLocationCount = styled.span`
  color: #fbbf24;
  margin-left: 1rem;
`;

const FooterButtons = styled.div`
  display: flex;
  gap: 1rem;
`;

const CancelButton = styled.button`
  padding: 1rem 2rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #ffffff;
  font-size: 1.0625rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SubmitButton = styled.button`
  padding: 1rem 2rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
  border: none;
  color: #ffffff;
  font-size: 1.0625rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.2s ease;
  box-shadow: 0 8px 24px rgba(236, 72, 153, 0.3);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #db2777 0%, #be185d 100%);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    animation: ${spin} 1s linear infinite;
  }
`;

// Location Autocomplete Styled Components
const AutocompleteWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.25rem;
`;

const SearchInputWrapper = styled.div`
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 0.625rem;
  color: #ffffff;
  font-size: 0.9375rem;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    outline: none;
    border-color: #fbbf24;
    background: rgba(251, 191, 36, 0.12);
    box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.875rem;
  top: 50%;
  transform: translateY(-50%);

  svg {
    width: 1rem;
    height: 1rem;
    color: #fbbf24;
  }
`;

const LoadingIcon = styled.div`
  position: absolute;
  right: 0.875rem;
  top: 50%;
  transform: translateY(-50%);

  svg {
    width: 1rem;
    height: 1rem;
    color: #fbbf24;
    animation: ${spin} 1s linear infinite;
  }
`;

const ResultsList = styled.div`
  background: #1a1a28;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.625rem;
  overflow: hidden;
  max-height: 12rem;
  overflow-y: auto;
`;

const ResultItem = styled.button`
  width: 100%;
  padding: 0.75rem;
  text-align: left;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  transition: background 0.15s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(251, 191, 36, 0.1);
  }

  svg {
    color: #fbbf24;
    margin-top: 0.125rem;
    flex-shrink: 0;
  }

  span {
    font-size: 0.875rem;
    line-height: 1.4;
  }
`;

const CancelTextButton = styled.button`
  padding: 0.375rem 0.75rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: color 0.15s ease;
  align-self: flex-start;

  &:hover {
    color: #ffffff;
  }
`;

const TargetLocationBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: rgba(236, 72, 153, 0.1);
  border: 1px solid rgba(236, 72, 153, 0.3);
  border-radius: 0.875rem;
  margin-bottom: 1.5rem;

  svg {
    color: #ec4899;
    flex-shrink: 0;
  }
`;

const TargetLocationText = styled.div`
  flex: 1;

  p {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 0.125rem;
  }

  strong {
    font-size: 1rem;
    color: #ffffff;
    font-weight: 600;
  }
`;

const ConvertingBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 0.875rem;
  margin-bottom: 1.5rem;

  svg {
    color: #34d399;
    flex-shrink: 0;
  }
`;

const ConvertingText = styled.div`
  flex: 1;

  p {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 0.125rem;
  }

  strong {
    font-size: 1rem;
    color: #ffffff;
    font-weight: 600;
  }
`;

const LocationMismatchWarning = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 0.75rem;
  margin-top: 0.75rem;
`;

const WarningHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: #fbbf24;
  }

  span {
    font-size: 0.875rem;
    font-weight: 500;
    color: #fbbf24;
  }
`;

const WarningText = styled.p`
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
`;

const WarningActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const WarningButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  ${({ $variant }) =>
    $variant === 'primary'
      ? `
    background: rgba(236, 72, 153, 0.2);
    border: 1px solid rgba(236, 72, 153, 0.4);
    color: #ec4899;

    &:hover {
      background: rgba(236, 72, 153, 0.3);
    }
  `
      : `
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.8);

    &:hover {
      background: rgba(255, 255, 255, 0.12);
    }
  `}
`;

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
    <AutocompleteWrapper>
      <SearchInputWrapper>
        <SearchInput
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a location..."
          autoFocus
        />
        <SearchIcon>
          <Search />
        </SearchIcon>
        {isLoading && (
          <LoadingIcon>
            <Loader2 />
          </LoadingIcon>
        )}
      </SearchInputWrapper>

      {results.length > 0 && (
        <ResultsList>
          {results.map((result) => (
            <ResultItem
              key={result.id}
              onClick={() => onSelect(result.center[1], result.center[0], result.text)}
            >
              <MapPin size={18} />
              <span>{result.place_name}</span>
            </ResultItem>
          ))}
        </ResultsList>
      )}

      <CancelTextButton onClick={onCancel}>Cancel</CancelTextButton>
    </AutocompleteWrapper>
  );
}

// Calculate distance between two points in km (Haversine formula)
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Threshold for considering a photo "at" the target location (in km)
const LOCATION_MATCH_THRESHOLD = 50;

export default function PhotoUpload({ onUpload, onClose, mapboxToken, targetLocation, convertingFromPlannedTrip }: PhotoUploadProps) {
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
        const pendingPhoto: PendingPhoto = { ...photoData };

        // If uploading to a specific location and photo has no GPS, use target location
        if (photoData.needsLocation && targetLocation) {
          pendingPhoto.location = {
            lat: targetLocation.lat,
            lng: targetLocation.lng,
            name: targetLocation.name,
          };
          pendingPhoto.needsLocation = false;
        }
        // If photo has GPS, check if it matches target location
        else if (!photoData.needsLocation && targetLocation) {
          const distance = getDistanceKm(
            photoData.location.lat,
            photoData.location.lng,
            targetLocation.lat,
            targetLocation.lng
          );

          if (distance > LOCATION_MATCH_THRESHOLD) {
            // Photo GPS is far from target location - mark as mismatch
            let photoLocationName = 'Unknown location';
            if (mapboxToken) {
              const geocodeResult = await reverseGeocode(
                photoData.location.lat,
                photoData.location.lng,
                mapboxToken
              );
              if (geocodeResult) {
                photoLocationName = geocodeResult.fullName;
                pendingPhoto.location = {
                  lat: geocodeResult.center.lat,
                  lng: geocodeResult.center.lng,
                  name: geocodeResult.fullName,
                };
              }
            }
            pendingPhoto.locationMismatch = {
              distance: Math.round(distance),
              photoLocation: photoLocationName,
            };
          } else {
            // Photo is close to target - use target location for consistency
            pendingPhoto.location = {
              lat: targetLocation.lat,
              lng: targetLocation.lng,
              name: targetLocation.name,
            };
          }
        }
        // Regular upload (no target location) - geocode as before
        else if (!photoData.needsLocation && mapboxToken && !photoData.location.name) {
          const geocodeResult = await reverseGeocode(
            photoData.location.lat,
            photoData.location.lng,
            mapboxToken
          );
          if (geocodeResult) {
            // Use the city center coordinates instead of exact GPS
            // This generalizes locations so all photos in the same city
            // appear at the same point (e.g., "Brooklyn" center, not an apartment)
            pendingPhoto.location = {
              lat: geocodeResult.center.lat,
              lng: geocodeResult.center.lng,
              name: geocodeResult.fullName,
            };
          }
        }
        newPhotos.push(pendingPhoto);
      }
    }

    setPendingPhotos((prev) => [...prev, ...newPhotos]);
    setIsProcessing(false);

    // Auto-open location editor for the first photo that needs a location
    const firstNeedsLocation = newPhotos.find((p) => p.needsLocation);
    if (firstNeedsLocation) {
      setEditingLocation(firstNeedsLocation.id);
    }
  }, [mapboxToken, targetLocation]);

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

  // Handle location mismatch: use target location instead of photo GPS
  const handleUseTargetLocation = (id: string) => {
    if (!targetLocation) return;
    setPendingPhotos((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              location: {
                lat: targetLocation.lat,
                lng: targetLocation.lng,
                name: targetLocation.name,
              },
              locationMismatch: undefined,
            }
          : p
      )
    );
  };

  // Handle location mismatch: keep photo's GPS location
  const handleKeepPhotoLocation = (id: string) => {
    setPendingPhotos((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, locationMismatch: undefined }
          : p
      )
    );
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
  const unresolvedMismatchCount = pendingPhotos.filter((p) => p.locationMismatch).length;

  // When converting a planned trip, all location mismatches must be resolved
  const hasUnresolvedMismatches = convertingFromPlannedTrip && unresolvedMismatchCount > 0;
  const canSubmit = validCount > 0 && !hasUnresolvedMismatches;

  return (
    <Overlay>
      <Modal>
        <Header>
          <HeaderContent>
            <Title>{convertingFromPlannedTrip ? 'Add Trip Photos' : 'Add Photos'}</Title>
            <Subtitle>
              {convertingFromPlannedTrip
                ? 'Upload photos from your trip to convert it from a plan to a real trip'
                : 'Upload photos to add them to your map'}
            </Subtitle>
          </HeaderContent>
          <CloseButton onClick={onClose} disabled={isUploading}>
            <X />
          </CloseButton>
        </Header>

        <Content>
          {isUploading && (
            <UploadingBanner>
              <UploadingHeader>
                <UploadingIcon>
                  <Loader2 />
                </UploadingIcon>
                <UploadingText>
                  <p>Uploading photos...</p>
                  <p>{uploadProgress}% complete</p>
                </UploadingText>
              </UploadingHeader>
              <ProgressBar>
                <ProgressFill $progress={uploadProgress} />
              </ProgressBar>
            </UploadingBanner>
          )}

          {convertingFromPlannedTrip && (
            <ConvertingBanner>
              <Plane size={20} />
              <ConvertingText>
                <p>Converting planned trip to real trip</p>
                <strong>{convertingFromPlannedTrip.destinationName}</strong>
              </ConvertingText>
            </ConvertingBanner>
          )}

          {targetLocation && (
            <TargetLocationBanner>
              <MapPin size={20} />
              <TargetLocationText>
                <p>Adding photos to</p>
                <strong>{targetLocation.name}</strong>
              </TargetLocationText>
            </TargetLocationBanner>
          )}

          <DropZone
            ref={dropZoneRef}
            $active={dragActive}
            $disabled={isUploading}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={isUploading}
            />
            <DropZoneIcon>
              <Upload />
            </DropZoneIcon>
            <DropZoneTitle>Drag & drop photos here</DropZoneTitle>
            <DropZoneText>or click to browse your files</DropZoneText>
            <PasteTip>
              <Clipboard />
              <span>Tip: Copy photos in Photos app, then paste here (Cmd+V)</span>
            </PasteTip>
          </DropZone>

          {isProcessing && (
            <ProcessingIndicator>
              <Loader2 size={20} />
              <span>Processing photos...</span>
            </ProcessingIndicator>
          )}

          {pendingPhotos.length > 0 && (
            <PhotosSection>
              <PhotosSectionTitle>
                Selected Photos ({pendingPhotos.length})
              </PhotosSectionTitle>
              <PhotosList>
                {pendingPhotos.map((photo) => (
                  <PhotoCard key={photo.id}>
                    <PhotoThumbnail src={photo.thumbnail} alt="" />
                    <PhotoInfo>
                      <PhotoName>{photo.description || 'Untitled photo'}</PhotoName>

                      {photo.needsLocation ? (
                        editingLocation === photo.id ? (
                          <LocationAutocomplete
                            mapboxToken={mapboxToken}
                            onSelect={(lat, lng, name) => handleSetLocation(photo.id, lat, lng, name)}
                            onCancel={() => setEditingLocation(null)}
                          />
                        ) : (
                          <LocationButton onClick={() => setEditingLocation(photo.id)}>
                            <AlertCircle size={16} />
                            <span>Add location</span>
                          </LocationButton>
                        )
                      ) : (
                        <>
                          <LocationDisplay>
                            <MapPin size={16} />
                            <span>{photo.location.name || `${photo.location.lat.toFixed(4)}, ${photo.location.lng.toFixed(4)}`}</span>
                          </LocationDisplay>

                          {photo.locationMismatch && targetLocation && (
                            <LocationMismatchWarning>
                              <WarningHeader>
                                <AlertCircle size={16} />
                                <span>Location mismatch</span>
                              </WarningHeader>
                              <WarningText>
                                This photo was taken {photo.locationMismatch.distance}km away in {photo.locationMismatch.photoLocation}.
                                {convertingFromPlannedTrip
                                  ? ` Use the planned destination or discard this photo.`
                                  : ` Would you like to add it to ${targetLocation.name} anyway?`}
                              </WarningText>
                              <WarningActions>
                                <WarningButton $variant="primary" onClick={() => handleUseTargetLocation(photo.id)}>
                                  Use {targetLocation.name}
                                </WarningButton>
                                {convertingFromPlannedTrip ? (
                                  <WarningButton onClick={() => handleRemove(photo.id)}>
                                    Discard photo
                                  </WarningButton>
                                ) : (
                                  <WarningButton onClick={() => handleKeepPhotoLocation(photo.id)}>
                                    Keep original location
                                  </WarningButton>
                                )}
                              </WarningActions>
                            </LocationMismatchWarning>
                          )}
                        </>
                      )}

                      <DateSection>
                        {editingDate === photo.id ? (
                          <DateEditWrapper>
                            <DateInput
                              type="date"
                              value={manualDate}
                              onChange={(e) => setManualDate(e.target.value)}
                            />
                            <IconButton $variant="success" onClick={() => handleSetDate(photo.id)}>
                              <Check />
                            </IconButton>
                            <IconButton onClick={() => { setEditingDate(null); setManualDate(''); }}>
                              <X />
                            </IconButton>
                          </DateEditWrapper>
                        ) : (
                          <DateButton
                            onClick={() => {
                              setEditingDate(photo.id);
                              setManualDate(photo.date.toISOString().split('T')[0]);
                            }}
                          >
                            <Calendar size={16} />
                            <span>{photo.date.toLocaleDateString()}</span>
                          </DateButton>
                        )}
                      </DateSection>
                    </PhotoInfo>
                    <RemoveButton onClick={() => handleRemove(photo.id)} disabled={isUploading}>
                      <X />
                    </RemoveButton>
                  </PhotoCard>
                ))}
              </PhotosList>
            </PhotosSection>
          )}
        </Content>

        <Footer>
          <FooterStatus>
            {validCount > 0 && !hasUnresolvedMismatches && (
              <ReadyCount>{validCount} ready to add</ReadyCount>
            )}
            {needsLocationCount > 0 && (
              <NeedsLocationCount>{needsLocationCount} need location</NeedsLocationCount>
            )}
            {hasUnresolvedMismatches && (
              <NeedsLocationCount>
                {unresolvedMismatchCount} photo{unresolvedMismatchCount !== 1 ? 's' : ''} need location resolved
              </NeedsLocationCount>
            )}
          </FooterStatus>
          <FooterButtons>
            <CancelButton onClick={onClose} disabled={isUploading}>
              Cancel
            </CancelButton>
            <SubmitButton
              onClick={handleSubmit}
              disabled={!canSubmit || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 size={20} />
                  Uploading...
                </>
              ) : (
                <>Add {validCount} Photo{validCount !== 1 ? 's' : ''}</>
              )}
            </SubmitButton>
          </FooterButtons>
        </Footer>
      </Modal>
    </Overlay>
  );
}
