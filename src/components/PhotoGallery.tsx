import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { X, ChevronLeft, ChevronRight, Trash2, MapPin, Pencil, Check } from 'lucide-react';
import styled from 'styled-components';
import type { Photo } from '../types/photo';
import { searchPlaces, type GeocodingResult } from '../utils/geocoding';

interface PhotoGalleryProps {
  photos: Photo[];
  onClose: () => void;
  onDeletePhoto: (id: string) => void;
  onRenameLocation?: (photoIds: string[], newName: string) => void;
  locationName?: string;
  mapboxToken?: string;
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
`;

const HeaderText = styled.div``;

const Title = styled.h2`
  font-size: 1.625rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.01em;
  margin-bottom: 0.375rem;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.375rem;
`;

const TitleText = styled.h2`
  font-size: 1.625rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.01em;
`;

const EditButton = styled.button`
  padding: 0.5rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  svg {
    width: 1rem;
    height: 1rem;
    color: rgba(255, 255, 255, 0.6);
  }
`;

const TitleInput = styled.input`
  font-size: 1.625rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.01em;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 0.5rem;
  padding: 0.25rem 0.75rem;
  outline: none;
  width: 100%;
  max-width: 400px;

  &:focus {
    border-color: #ec4899;
    background: rgba(255, 255, 255, 0.15);
  }
`;

const SaveButton = styled.button`
  padding: 0.5rem;
  border-radius: 0.5rem;
  background: #ec4899;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #db2777;
  }

  svg {
    width: 1rem;
    height: 1rem;
    color: #ffffff;
  }
`;

const InputWrapper = styled.div`
  position: relative;
  width: 100%;
  max-width: 400px;
`;

const AutocompleteDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.5rem;
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.75rem;
  overflow: hidden;
  z-index: 100;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
`;

const AutocompleteItem = styled.button<{ $isSelected?: boolean }>`
  width: 100%;
  padding: 0.875rem 1rem;
  background: ${({ $isSelected }) => ($isSelected ? 'rgba(236, 72, 153, 0.2)' : 'transparent')};
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  svg {
    width: 1rem;
    height: 1rem;
    color: rgba(255, 255, 255, 0.4);
    flex-shrink: 0;
  }
`;

const AutocompleteText = styled.span`
  font-size: 0.9375rem;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const AutocompleteLoading = styled.div`
  padding: 1rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
`;

const PhotoCount = styled.span`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
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
  align-items: center;
  justify-content: center;
  position: relative;
`;

const NavButton = styled.button<{ $position: 'left' | 'right' }>`
  position: absolute;
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
`;

const ImageContainer = styled.div`
  max-width: 100%;
  max-height: 100%;
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const MainImage = styled.img`
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 1rem;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
`;

const ImageInfo = styled.div`
  margin-top: 1.75rem;
  text-align: center;
`;

const ImageDate = styled.p`
  font-size: 1.25rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 0.5rem;
`;

const ImageDescription = styled.p`
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.6);
`;

const FullscreenCloseButton = styled.button`
  position: absolute;
  top: 1.75rem;
  right: 1.75rem;
  padding: 0.875rem;
  border-radius: 0.875rem;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }

  svg {
    width: 1.75rem;
    height: 1.75rem;
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
  position: sticky;
  top: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.85) 100%);
  backdrop-filter: blur(8px);
  z-index: 10;
  margin-left: -2.5rem;
  margin-right: -2.5rem;
  padding-left: 2.5rem;
  padding-right: 2.5rem;
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

export default function PhotoGallery({
  photos,
  onClose,
  onDeletePhoto,
  onRenameLocation,
  locationName,
  mapboxToken,
}: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(locationName || '');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  // Debounced search
  const handleSearch = useCallback(
    async (query: string) => {
      if (!mapboxToken || query.length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchPlaces(query, mapboxToken);
        setSearchResults(results);
        setShowDropdown(results.length > 0);
        setSelectedResultIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [mapboxToken]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditedName(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  const handleSelectResult = (result: GeocodingResult) => {
    setEditedName(result.place_name);
    setShowDropdown(false);
    setSearchResults([]);
    // Auto-save after selection
    if (onRenameLocation) {
      const photoIds = photos.map(p => p.id);
      onRenameLocation(photoIds, result.place_name);
    }
    setIsEditingName(false);
  };

  const handleSaveName = () => {
    if (editedName.trim() && onRenameLocation) {
      const photoIds = photos.map(p => p.id);
      onRenameLocation(photoIds, editedName.trim());
    }
    setIsEditingName(false);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleKeyDownName = (e: React.KeyboardEvent) => {
    if (showDropdown && searchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedResultIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedResultIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Enter' && selectedResultIndex >= 0) {
        e.preventDefault();
        handleSelectResult(searchResults[selectedResultIndex]);
        return;
      }
    }

    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setEditedName(locationName || '');
      setIsEditingName(false);
      setShowDropdown(false);
      setSearchResults([]);
    }
    e.stopPropagation();
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

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
    <Container onKeyDown={handleKeyDown} tabIndex={0}>
      <Header>
        <HeaderLeft>
          <HeaderIcon>
            <MapPin />
          </HeaderIcon>
          <HeaderText>
            {isEditingName ? (
              <TitleRow>
                <InputWrapper>
                  <TitleInput
                    ref={inputRef}
                    value={editedName}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDownName}
                    onBlur={() => {
                      // Delay to allow click on dropdown items
                      setTimeout(() => {
                        if (!showDropdown) {
                          handleSaveName();
                        }
                      }, 200);
                    }}
                    placeholder="Search for a place..."
                  />
                  {showDropdown && (
                    <AutocompleteDropdown>
                      {isSearching ? (
                        <AutocompleteLoading>Searching...</AutocompleteLoading>
                      ) : (
                        searchResults.map((result, index) => (
                          <AutocompleteItem
                            key={result.id}
                            $isSelected={index === selectedResultIndex}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectResult(result)}
                          >
                            <MapPin />
                            <AutocompleteText>{result.place_name}</AutocompleteText>
                          </AutocompleteItem>
                        ))
                      )}
                    </AutocompleteDropdown>
                  )}
                </InputWrapper>
                <SaveButton onClick={handleSaveName} title="Save name">
                  <Check />
                </SaveButton>
              </TitleRow>
            ) : (
              <TitleRow>
                <TitleText>{locationName || 'Photos'}</TitleText>
                {onRenameLocation && (
                  <EditButton
                    onClick={() => {
                      setEditedName(locationName || '');
                      setIsEditingName(true);
                    }}
                    title="Rename location"
                  >
                    <Pencil />
                  </EditButton>
                )}
              </TitleRow>
            )}
            <PhotoCount>
              {photos.length} photo{photos.length !== 1 ? 's' : ''}
            </PhotoCount>
          </HeaderText>
        </HeaderLeft>
        <CloseButton onClick={onClose}>
          <X />
        </CloseButton>
      </Header>

      {selectedIndex !== null ? (
        <FullscreenView>
          <NavButton
            $position="left"
            onClick={handlePrev}
            disabled={selectedIndex === 0}
          >
            <ChevronLeft />
          </NavButton>

          <ImageContainer>
            <MainImage
              src={allPhotos[selectedIndex].url}
              alt={allPhotos[selectedIndex].description || 'Photo'}
            />
            <ImageInfo>
              <ImageDate>
                {format(allPhotos[selectedIndex].date, 'MMMM d, yyyy')}
              </ImageDate>
              {allPhotos[selectedIndex].description && (
                <ImageDescription>
                  {allPhotos[selectedIndex].description}
                </ImageDescription>
              )}
            </ImageInfo>
          </ImageContainer>

          <NavButton
            $position="right"
            onClick={handleNext}
            disabled={selectedIndex === allPhotos.length - 1}
          >
            <ChevronRight />
          </NavButton>

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
                        src={photo.thumbnail}
                        alt={photo.description || 'Photo'}
                      />
                      <PhotoOverlay />
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
                    </PhotoItem>
                  );
                })}
              </PhotoGrid>
            </DateGroup>
          ))}
        </GalleryView>
      )}
    </Container>
  );
}
