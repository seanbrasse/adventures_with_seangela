import { useMemo, useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { X, ChevronLeft, ChevronRight, Trash2, MapPin, Pencil, Check, Clock, Calendar, MessageSquare, Plus, Settings } from 'lucide-react';
import styled from 'styled-components';
import type { Photo, Trip } from '../types/photo';
import TripSettingsModal from './TripSettingsModal';

export interface LocationContext {
  lat: number;
  lng: number;
  name: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  trip?: Trip;
  onClose: () => void;
  onDeletePhoto: (id: string) => void;
  onRenameLocation?: (photoIds: string[], newName: string) => void;
  onUpdatePhoto?: (id: string, updates: Partial<Photo>) => void;
  onUpdateTrip?: (id: string, updates: Partial<Trip>) => void;
  onDeleteTrip?: (tripId: string, deletePhotos: boolean) => void;
  onAddPhoto?: (location: LocationContext) => void;
  locationName?: string;
  mapboxToken?: string;
  isAuthenticated?: boolean;
}

// Styled Components
const Container = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.96);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;

  &:focus {
    outline: none;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.75rem 2.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.5);

  @media (max-width: 640px) {
    padding: 1rem 1rem;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1.25rem;
`;

const HeaderIcon = styled.div`
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.15) 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 1.75rem;
    height: 1.75rem;
    color: #f472b6;
  }

  @media (max-width: 640px) {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.75rem;

    svg {
      width: 1.25rem;
      height: 1.25rem;
    }
  }
`;

const HeaderText = styled.div``;

const TitleText = styled.h2`
  font-size: 1.625rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.01em;

  @media (max-width: 640px) {
    font-size: 1.125rem;
  }
`;

const PhotoCount = styled.span`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
`;

const TripMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
`;

const TripDate = styled.span`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);

  svg {
    width: 0.875rem;
    height: 0.875rem;
  }
`;

const TripDescription = styled.p`
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
  margin-top: 0.75rem;
  max-width: 500px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const SettingsButton = styled.button`
  padding: 0.5rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  svg {
    width: 1.125rem;
    height: 1.125rem;
    color: rgba(255, 255, 255, 0.6);
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @media (max-width: 640px) {
    /* Hide settings and add photo buttons in header on mobile */
    & > button:not(:last-child) {
      display: none;
    }
  }
`;

const MobileActionsBar = styled.div`
  display: none;
  padding: 0.75rem 1rem;
  gap: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.3);
  justify-content: flex-end;

  @media (max-width: 640px) {
    display: flex;
  }
`;

const AddPhotoButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.15) 100%);
  border: 1px solid rgba(236, 72, 153, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
  color: #f472b6;
  font-size: 0.9375rem;
  font-weight: 500;

  svg {
    width: 1.125rem;
    height: 1.125rem;
  }

  &:hover {
    background: linear-gradient(135deg, rgba(236, 72, 153, 0.3) 0%, rgba(168, 85, 247, 0.25) 100%);
    border-color: rgba(236, 72, 153, 0.5);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const CloseButton = styled.button`
  padding: 0.875rem;
  border-radius: 0.875rem;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  svg {
    width: 1.75rem;
    height: 1.75rem;
    color: #ffffff;
  }
`;

const FullscreenView = styled.div`
  flex: 1;
  display: flex;
  align-items: stretch;
  position: relative;
  overflow: hidden;
`;

const ImageSection = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-width: 0;

  @media (max-width: 640px) {
    align-items: flex-start;
    padding-bottom: 40vh; /* Leave room for details panel */
  }
`;

const DetailsSection = styled.div`
  width: 320px;
  background: rgba(0, 0, 0, 0.4);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  @media (max-width: 900px) {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 5;
    width: 300px;
  }

  @media (max-width: 640px) {
    position: absolute;
    left: 0;
    right: 0;
    top: auto;
    bottom: 0;
    width: 100%;
    height: 40vh;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1.5rem 1.5rem 0 0;
    background: rgba(10, 10, 20, 0.95);
    backdrop-filter: blur(12px);
  }
`;

const NavButton = styled.button<{ $position: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  ${({ $position }) => ($position === 'left' ? 'left: 1.75rem;' : 'right: 1.75rem;')}
  padding: 1.125rem;
  border-radius: 1rem;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;

  &:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.8);
    border-color: rgba(255, 255, 255, 0.2);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  svg {
    width: 2.5rem;
    height: 2.5rem;
    color: #ffffff;
  }

  @media (max-width: 640px) {
    top: 50%;
    ${({ $position }) => ($position === 'left' ? 'left: 0.5rem;' : 'right: 0.5rem;')}
    padding: 0.75rem;
    border-radius: 0.75rem;

    svg {
      width: 1.5rem;
      height: 1.5rem;
    }
  }
`;

const ImageContainer = styled.div`
  max-width: 100%;
  max-height: 100%;
  padding: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  @media (max-width: 640px) {
    padding: 0.5rem;
  }
`;

const MainImage = styled.img`
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 1rem;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);

  @media (max-width: 640px) {
    max-height: 50vh;
    border-radius: 0.75rem;
  }
`;

const PhotoDetailsPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  flex: 1;

  @media (max-width: 640px) {
    padding: 1rem 1.25rem;
    gap: 0.875rem;
  }
`;

const DetailsPanelTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;

  @media (max-width: 640px) {
    display: none;
  }
`;

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9375rem;

  svg {
    width: 1.125rem;
    height: 1.125rem;
    color: rgba(255, 255, 255, 0.5);
    flex-shrink: 0;
  }

  @media (max-width: 640px) {
    font-size: 0.875rem;
    gap: 0.5rem;
  }
`;

const EditableDateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9375rem;
  padding: 0.5rem;
  margin: -0.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  svg {
    width: 1.125rem;
    height: 1.125rem;
    color: rgba(255, 255, 255, 0.5);
    flex-shrink: 0;
  }
`;

const DateEditWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
`;

const DateInput = styled.input`
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  color: #ffffff;
  font-size: 0.875rem;
  color-scheme: dark;

  &:focus {
    outline: none;
    border-color: rgba(236, 72, 153, 0.5);
  }
`;

const TimeInput = styled.input`
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  color: #ffffff;
  font-size: 0.875rem;
  width: 110px;
  color-scheme: dark;

  &:focus {
    outline: none;
    border-color: rgba(236, 72, 153, 0.5);
  }
`;

const DateSaveButton = styled.button`
  padding: 0.375rem;
  border-radius: 0.375rem;
  background: rgba(236, 72, 153, 0.2);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(236, 72, 153, 0.4);
  }

  svg {
    width: 1rem;
    height: 1rem;
    color: #ec4899;
  }
`;

const EditHint = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.3);
  margin-left: auto;
`;

const DetailLabel = styled.span`
  color: rgba(255, 255, 255, 0.5);
  min-width: 70px;
`;

const DetailValue = styled.span`
  color: rgba(255, 255, 255, 0.9);
`;

const CaptionRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
  overflow: hidden;
`;

const CaptionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;

  svg {
    width: 1.125rem;
    height: 1.125rem;
  }
`;

const CaptionDisplay = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 0.5rem;
  transition: background 0.2s ease;
  min-width: 0;
  overflow: hidden;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const CaptionText = styled.p`
  flex: 1;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9375rem;
  line-height: 1.5;
  word-wrap: break-word;
  overflow-wrap: break-word;
  min-width: 0;

  @media (max-width: 640px) {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const CaptionPlaceholder = styled.p`
  flex: 1;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9375rem;
  font-style: italic;
  min-width: 0;
`;

const CaptionEditButton = styled.button`
  padding: 0.375rem;
  border-radius: 0.375rem;
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.5;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.1);
  }

  svg {
    width: 0.875rem;
    height: 0.875rem;
    color: rgba(255, 255, 255, 0.6);
  }
`;

const CaptionInputWrapper = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
`;

const CaptionTextarea = styled.textarea`
  flex: 1;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  color: #ffffff;
  font-size: 0.9375rem;
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  min-height: 80px;
  outline: none;

  &:focus {
    border-color: #ec4899;
    background: rgba(255, 255, 255, 0.15);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const CaptionInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1;
`;

const CharacterCount = styled.span<{ $nearLimit?: boolean }>`
  font-size: 0.75rem;
  color: ${({ $nearLimit }) => ($nearLimit ? '#fbbf24' : 'rgba(255, 255, 255, 0.4)')};
  text-align: right;
`;

const CaptionSaveButton = styled.button`
  padding: 0.5rem;
  border-radius: 0.5rem;
  background: #ec4899;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #db2777;
  }

  svg {
    width: 1rem;
    height: 1rem;
    color: #ffffff;
  }
`;

const DeletePhotoSection = styled.div`
  margin-top: auto;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const DeletePhotoButton = styled.button<{ $confirm: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.625rem;
  border: 1px solid ${({ $confirm }) => ($confirm ? '#ef4444' : 'rgba(239, 68, 68, 0.3)')};
  background: ${({ $confirm }) => ($confirm ? '#ef4444' : 'rgba(239, 68, 68, 0.1)')};
  color: ${({ $confirm }) => ($confirm ? '#ffffff' : '#f87171')};
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $confirm }) => ($confirm ? '#dc2626' : 'rgba(239, 68, 68, 0.2)')};
    border-color: ${({ $confirm }) => ($confirm ? '#dc2626' : 'rgba(239, 68, 68, 0.5)')};
  }

  svg {
    width: 1.125rem;
    height: 1.125rem;
  }
`;

const FullscreenCloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem;
  border-radius: 50%;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0.6;

  &:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.1);
  }

  svg {
    width: 1.25rem;
    height: 1.25rem;
    color: #ffffff;
  }
`;

const ImageCounter = styled.div`
  position: absolute;
  bottom: 1.75rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.75rem 1.5rem;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.0625rem;
  font-weight: 500;
`;

const GalleryView = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 2rem 2.5rem;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
`;

const DateGroup = styled.div`
  margin-bottom: 2.5rem;
`;

const DateHeader = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 1.25rem;
  padding: 0.875rem 0;

  @media (min-width: 768px) {
    position: sticky;
    top: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.85) 100%);
    backdrop-filter: blur(8px);
    z-index: 10;
    margin-left: -2.5rem;
    margin-right: -2.5rem;
    padding-left: 2.5rem;
    padding-right: 2.5rem;
  }
`;

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1.25rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
`;

const PhotoItem = styled.div`
  position: relative;
  aspect-ratio: 1;
  cursor: pointer;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
`;

const PhotoThumbnail = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;

  ${PhotoItem}:hover & {
    transform: scale(1.05);
  }
`;

const PhotoOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: transparent;
  transition: background 0.2s ease;

  ${PhotoItem}:hover & {
    background: rgba(0, 0, 0, 0.15);
  }
`;

const DeleteButton = styled.button<{ $confirm: boolean }>`
  position: absolute;
  top: 0.875rem;
  right: 0.875rem;
  padding: 0.625rem;
  border-radius: 0.625rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${({ $confirm }) => ($confirm ? '#ef4444' : 'rgba(0, 0, 0, 0.6)')};
  backdrop-filter: blur(4px);
  opacity: ${({ $confirm }) => ($confirm ? 1 : 0)};

  ${PhotoItem}:hover & {
    opacity: 1;
  }

  &:hover {
    background: ${({ $confirm }) => ($confirm ? '#dc2626' : 'rgba(0, 0, 0, 0.8)')};
  }

  svg {
    width: 1.25rem;
    height: 1.25rem;
    color: #ffffff;
  }
`;

const DeleteTooltip = styled.div`
  position: absolute;
  top: 3.75rem;
  right: 0.5rem;
  background: #ef4444;
  color: #ffffff;
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 0.5rem 0.875rem;
  border-radius: 0.5rem;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
`;

// Character limits
const CAPTION_MAX_LENGTH = 200;

export default function PhotoGallery({
  photos,
  trip,
  onClose,
  onDeletePhoto,
  onRenameLocation: _onRenameLocation,
  onUpdatePhoto,
  onUpdateTrip,
  onDeleteTrip,
  onAddPhoto,
  locationName,
  mapboxToken: _mapboxToken,
  isAuthenticated = false,
}: PhotoGalleryProps) {
  void _onRenameLocation;
  void _mapboxToken;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showTripSettings, setShowTripSettings] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editedDate, setEditedDate] = useState('');
  const [editedTime, setEditedTime] = useState('');
  const captionInputRef = useRef<HTMLTextAreaElement>(null);

  // Focus caption input when editing starts
  useEffect(() => {
    if (isEditingCaption && captionInputRef.current) {
      captionInputRef.current.focus();
    }
  }, [isEditingCaption]);

  const handleStartEditCaption = () => {
    if (selectedIndex !== null) {
      setEditedCaption(allPhotos[selectedIndex].description || '');
      setIsEditingCaption(true);
    }
  };

  const handleSaveCaption = () => {
    if (selectedIndex !== null && onUpdatePhoto) {
      onUpdatePhoto(allPhotos[selectedIndex].id, { description: editedCaption.trim() || undefined });
    }
    setIsEditingCaption(false);
  };

  const handleCaptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditingCaption(false);
    } else if (e.key === 'Enter' && e.metaKey) {
      handleSaveCaption();
    }
    e.stopPropagation();
  };

  // Helper to format date/time for inputs (using local time)
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeForInput = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleStartEditDate = () => {
    if (selectedIndex !== null) {
      const photo = allPhotos[selectedIndex];
      setEditedDate(formatDateForInput(photo.date));
      setEditedTime(formatTimeForInput(photo.date));
      setIsEditingDate(true);
    }
  };

  const handleSaveDate = () => {
    if (selectedIndex !== null && onUpdatePhoto && editedDate) {
      const [year, month, day] = editedDate.split('-').map(Number);
      const [hours, minutes] = editedTime ? editedTime.split(':').map(Number) : [12, 0];
      const newDate = new Date(year, month - 1, day, hours, minutes);
      onUpdatePhoto(allPhotos[selectedIndex].id, { date: newDate });
    }
    setIsEditingDate(false);
  };

  const handleDateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditingDate(false);
    } else if (e.key === 'Enter') {
      handleSaveDate();
    }
    e.stopPropagation();
  };

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

  // Get the display title - prefer trip name, fall back to location name
  const displayTitle = trip?.name || locationName || 'Photos';

  return (
    <Container onKeyDown={handleKeyDown} tabIndex={0}>
      <Header>
        <HeaderLeft>
          <HeaderIcon>
            <MapPin />
          </HeaderIcon>
          <HeaderText>
            <TitleText>{displayTitle}</TitleText>
            <TripMeta>
              <PhotoCount>
                {photos.length} photo{photos.length !== 1 ? 's' : ''}
              </PhotoCount>
              {trip && (
                <TripDate>
                  <Calendar />
                  {format(trip.startDate, 'MMM d')} - {format(trip.endDate, 'MMM d, yyyy')}
                </TripDate>
              )}
            </TripMeta>
            {trip?.description && (
              <TripDescription>{trip.description}</TripDescription>
            )}
          </HeaderText>
        </HeaderLeft>
        <HeaderActions>
          {isAuthenticated && trip && onUpdateTrip && onDeleteTrip && (
            <SettingsButton
              onClick={() => setShowTripSettings(true)}
              title="Trip settings"
            >
              <Settings />
            </SettingsButton>
          )}
          {isAuthenticated && onAddPhoto && photos.length > 0 && (
            <AddPhotoButton
              onClick={() => {
                const firstPhoto = photos[0];
                onAddPhoto({
                  lat: firstPhoto.location.lat,
                  lng: firstPhoto.location.lng,
                  name: locationName || firstPhoto.location.name || 'Unknown location',
                });
              }}
            >
              <Plus />
              Add Photo
            </AddPhotoButton>
          )}
          <CloseButton onClick={onClose}>
            <X />
          </CloseButton>
        </HeaderActions>
      </Header>

      {/* Mobile action buttons - shown below header on mobile */}
      {(isAuthenticated && (trip || (onAddPhoto && photos.length > 0))) && (
        <MobileActionsBar>
          {isAuthenticated && onAddPhoto && photos.length > 0 && (
            <AddPhotoButton
              onClick={() => {
                const firstPhoto = photos[0];
                onAddPhoto({
                  lat: firstPhoto.location.lat,
                  lng: firstPhoto.location.lng,
                  name: locationName || firstPhoto.location.name || 'Unknown location',
                });
              }}
            >
              <Plus />
              Add Photo
            </AddPhotoButton>
          )}
          {isAuthenticated && trip && onUpdateTrip && onDeleteTrip && (
            <SettingsButton
              onClick={() => setShowTripSettings(true)}
              title="Trip settings"
            >
              <Settings />
            </SettingsButton>
          )}
        </MobileActionsBar>
      )}

      {selectedIndex !== null ? (
        <FullscreenView>
          <ImageSection>
            <ImageContainer>
              <NavButton
                $position="left"
                onClick={handlePrev}
                disabled={selectedIndex === 0}
              >
                <ChevronLeft />
              </NavButton>

              <MainImage
                src={allPhotos[selectedIndex].url}
                alt={allPhotos[selectedIndex].description || 'Photo'}
              />

              <NavButton
                $position="right"
                onClick={handleNext}
                disabled={selectedIndex === allPhotos.length - 1}
              >
                <ChevronRight />
              </NavButton>
            </ImageContainer>
          </ImageSection>

          <DetailsSection>
            <PhotoDetailsPanel>
              <DetailsPanelTitle>Photo Details</DetailsPanelTitle>
              {isEditingDate ? (
                <DetailRow>
                  <Calendar />
                  <DateEditWrapper>
                    <DateInput
                      type="date"
                      value={editedDate}
                      onChange={(e) => setEditedDate(e.target.value)}
                      onKeyDown={handleDateKeyDown}
                    />
                    <TimeInput
                      type="time"
                      value={editedTime}
                      onChange={(e) => setEditedTime(e.target.value)}
                      onKeyDown={handleDateKeyDown}
                    />
                    <DateSaveButton onClick={handleSaveDate} title="Save date">
                      <Check />
                    </DateSaveButton>
                  </DateEditWrapper>
                </DetailRow>
              ) : isAuthenticated ? (
                <EditableDateRow onClick={handleStartEditDate}>
                  <Calendar />
                  <DetailLabel>Date</DetailLabel>
                  <DetailValue>{format(allPhotos[selectedIndex].date, 'EEEE, MMMM d, yyyy')}</DetailValue>
                  <EditHint>click to edit</EditHint>
                </EditableDateRow>
              ) : (
                <DetailRow>
                  <Calendar />
                  <DetailLabel>Date</DetailLabel>
                  <DetailValue>{format(allPhotos[selectedIndex].date, 'EEEE, MMMM d, yyyy')}</DetailValue>
                </DetailRow>
              )}
              {!isEditingDate && (
                <DetailRow>
                  <Clock />
                  <DetailLabel>Time</DetailLabel>
                  <DetailValue>{format(allPhotos[selectedIndex].date, 'h:mm a')}</DetailValue>
                </DetailRow>
              )}
              {allPhotos[selectedIndex].location.name && (
                <DetailRow>
                  <MapPin />
                  <DetailLabel>Location</DetailLabel>
                  <DetailValue>{allPhotos[selectedIndex].location.name}</DetailValue>
                </DetailRow>
              )}
              <CaptionRow>
                <CaptionHeader>
                  <MessageSquare />
                  Caption
                </CaptionHeader>
                {isEditingCaption && isAuthenticated ? (
                  <CaptionInputWrapper>
                    <CaptionInputContainer>
                      <CaptionTextarea
                        ref={captionInputRef}
                        value={editedCaption}
                        onChange={(e) => setEditedCaption(e.target.value.slice(0, CAPTION_MAX_LENGTH))}
                        onKeyDown={handleCaptionKeyDown}
                        placeholder="Add a caption..."
                        maxLength={CAPTION_MAX_LENGTH}
                      />
                      <CharacterCount $nearLimit={editedCaption.length > CAPTION_MAX_LENGTH * 0.8}>
                        {editedCaption.length}/{CAPTION_MAX_LENGTH}
                      </CharacterCount>
                    </CaptionInputContainer>
                    <CaptionSaveButton onClick={handleSaveCaption} title="Save caption">
                      <Check />
                    </CaptionSaveButton>
                  </CaptionInputWrapper>
                ) : isAuthenticated ? (
                  <CaptionDisplay onClick={handleStartEditCaption}>
                    {allPhotos[selectedIndex].description ? (
                      <CaptionText>{allPhotos[selectedIndex].description}</CaptionText>
                    ) : (
                      <CaptionPlaceholder>Click to add a caption...</CaptionPlaceholder>
                    )}
                    <CaptionEditButton title="Edit caption">
                      <Pencil />
                    </CaptionEditButton>
                  </CaptionDisplay>
                ) : (
                  <CaptionDisplay as="div" style={{ cursor: 'default' }}>
                    {allPhotos[selectedIndex].description ? (
                      <CaptionText>{allPhotos[selectedIndex].description}</CaptionText>
                    ) : (
                      <CaptionPlaceholder>No caption</CaptionPlaceholder>
                    )}
                  </CaptionDisplay>
                )}
              </CaptionRow>
              {isAuthenticated && (
                <DeletePhotoSection>
                  <DeletePhotoButton
                    $confirm={deleteConfirm === allPhotos[selectedIndex].id}
                    onClick={() => handleDelete(allPhotos[selectedIndex].id)}
                  >
                    <Trash2 />
                    {deleteConfirm === allPhotos[selectedIndex].id ? 'Click again to confirm' : 'Delete Photo'}
                  </DeletePhotoButton>
                </DeletePhotoSection>
              )}
            </PhotoDetailsPanel>
          </DetailsSection>

          <FullscreenCloseButton onClick={() => setSelectedIndex(null)}>
            <X />
          </FullscreenCloseButton>

          <ImageCounter>
            {selectedIndex + 1} / {allPhotos.length}
          </ImageCounter>
        </FullscreenView>
      ) : (
        <GalleryView>
          {Array.from(photosByDate.entries()).map(([date, datePhotos]) => (
            <DateGroup key={date}>
              <DateHeader>{date}</DateHeader>
              <PhotoGrid>
                {datePhotos.map((photo) => {
                  const photoIndex = allPhotos.findIndex((p) => p.id === photo.id);
                  return (
                    <PhotoItem
                      key={photo.id}
                      onClick={() => setSelectedIndex(photoIndex)}
                    >
                      <PhotoThumbnail
                        src={photo.url}
                        alt={photo.description || 'Photo'}
                      />
                      <PhotoOverlay />
                      {isAuthenticated && (
                        <>
                          <DeleteButton
                            $confirm={deleteConfirm === photo.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(photo.id);
                            }}
                          >
                            <Trash2 />
                          </DeleteButton>
                          {deleteConfirm === photo.id && (
                            <DeleteTooltip>Click again to delete</DeleteTooltip>
                          )}
                        </>
                      )}
                    </PhotoItem>
                  );
                })}
              </PhotoGrid>
            </DateGroup>
          ))}
        </GalleryView>
      )}

      {showTripSettings && trip && onUpdateTrip && onDeleteTrip && (
        <TripSettingsModal
          trip={trip}
          photoCount={photos.length}
          onClose={() => setShowTripSettings(false)}
          onUpdateTrip={onUpdateTrip}
          onDeleteTrip={onDeleteTrip}
        />
      )}
    </Container>
  );
}
