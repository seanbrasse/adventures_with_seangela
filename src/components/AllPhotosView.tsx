import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { X, Image, Calendar, MapPin, Filter, ChevronDown, Plane, SlidersHorizontal } from 'lucide-react';
import styled from 'styled-components';
import type { Photo, Trip } from '../types/photo';

interface AllPhotosViewProps {
  photos: Photo[];
  trips: Trip[];
  onClose: () => void;
  onPhotoClick: (photo: Photo) => void;
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.4);
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const HeaderIcon = styled.div`
  width: 3rem;
  height: 3rem;
  border-radius: 0.875rem;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.15) 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 1.5rem;
    height: 1.5rem;
    color: #f472b6;
  }
`;

const HeaderTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: #ffffff;
`;

const HeaderSubtitle = styled.span`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  margin-left: 0.75rem;
`;

const CloseButton = styled.button`
  padding: 0.75rem;
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

const FiltersBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: rgba(10, 10, 15, 0.98);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-wrap: wrap;

  @media (max-width: 640px) {
    padding: 0.75rem 1rem;
    gap: 0.5rem;
  }
`;

const FilterLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;

  svg {
    width: 1rem;
    height: 1rem;
  }

  @media (max-width: 640px) {
    font-size: 0;
    gap: 0;

    svg {
      font-size: 1rem;
    }
  }
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const FilterSelect = styled.div`
  position: relative;
`;

const FilterButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  border-radius: 0.5rem;
  background: ${({ $active }) => $active ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255, 255, 255, 0.06)'};
  border: 1px solid ${({ $active }) => $active ? 'rgba(236, 72, 153, 0.4)' : 'rgba(255, 255, 255, 0.1)'};
  color: ${({ $active }) => $active ? '#f472b6' : 'rgba(255, 255, 255, 0.8)'};
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${({ $active }) => $active ? 'rgba(236, 72, 153, 0.25)' : 'rgba(255, 255, 255, 0.1)'};
  }

  svg {
    width: 0.875rem;
    height: 0.875rem;
  }

  @media (max-width: 640px) {
    padding: 0.375rem 0.625rem;
    font-size: 0.75rem;
    gap: 0.375rem;

    svg {
      width: 0.75rem;
      height: 0.75rem;
    }
  }
`;

const Dropdown = styled.div<{ $visible: boolean; $alignRight?: boolean }>`
  position: absolute;
  top: calc(100% + 0.5rem);
  left: ${({ $alignRight }) => $alignRight ? 'auto' : '0'};
  right: ${({ $alignRight }) => $alignRight ? '0' : 'auto'};
  z-index: 1000;
  min-width: 200px;
  max-height: 300px;
  overflow-y: auto;
  background: #1a1a28;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  display: ${({ $visible }) => $visible ? 'block' : 'none'};

  @media (max-width: 640px) {
    min-width: 160px;
  }

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

const DropdownItem = styled.button<{ $selected?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: ${({ $selected }) => $selected ? 'rgba(236, 72, 153, 0.15)' : 'transparent'};
  border: none;
  color: ${({ $selected }) => $selected ? '#f472b6' : '#ffffff'};
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: ${({ $selected }) => $selected ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  }

  &:first-child {
    border-radius: 0.75rem 0.75rem 0 0;
  }

  &:last-child {
    border-radius: 0 0 0.75rem 0.75rem;
  }
`;

const DropdownIcon = styled.span`
  width: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 1rem;
    height: 1rem;
  }
`;

const ClearFiltersButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: auto;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.8);
  }

  svg {
    width: 0.75rem;
    height: 0.75rem;
  }
`;

const ScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
  position: relative;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
  }
`;

const PhotosContent = styled.div`
  padding: 1.5rem;
  position: relative;
  z-index: 1;
`;

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.5rem;
  max-width: 1400px;
  margin: 0 auto;

  @media (min-width: 640px) {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.75rem;
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
  }
`;

const PhotoCard = styled.button`
  position: relative;
  aspect-ratio: 1;
  border-radius: 0.625rem;
  overflow: hidden;
  border: none;
  padding: 0;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  &:hover img {
    transform: scale(1.05);
  }

  &:hover > div {
    opacity: 1;
  }
`;

const PhotoImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
`;

const PhotoOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.2) 40%, transparent 60%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 0.75rem;
  opacity: 0;
  transition: opacity 0.2s ease;
`;

const PhotoDate = styled.span`
  font-size: 0.75rem;
  font-weight: 500;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 0.25rem;

  svg {
    width: 0.75rem;
    height: 0.75rem;
    opacity: 0.7;
  }
`;

const PhotoLocation = styled.span`
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 0.25rem;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const PhotoTrip = styled.span`
  font-size: 0.625rem;
  color: #f472b6;
  margin-top: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;

  svg {
    width: 0.625rem;
    height: 0.625rem;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.5);
`;

const ResultsCount = styled.div`
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 1rem;
  max-width: 1400px;
  margin: 0 auto 1rem;
`;

type SortOption = 'date-desc' | 'date-asc' | 'location';

export default function AllPhotosView({
  photos,
  trips,
  onClose,
  onPhotoClick,
}: AllPhotosViewProps) {
  const [tripFilter, setTripFilter] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');

  const [tripDropdownOpen, setTripDropdownOpen] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // Get unique locations from photos
  const uniqueLocations = useMemo(() => {
    const locations = new Map<string, string>();
    photos.forEach((photo) => {
      if (photo.location.name) {
        // Use the first part of the location name as a key
        const key = photo.location.name.split(',')[0].trim();
        if (!locations.has(key)) {
          locations.set(key, photo.location.name);
        }
      }
    });
    return Array.from(locations.entries())
      .map(([key, full]) => ({ key, full }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [photos]);

  // Get unique years from photos
  const uniqueYears = useMemo(() => {
    const years = new Set<number>();
    photos.forEach((photo) => {
      years.add(photo.date.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [photos]);

  // Create a map of photo ID to trip for quick lookup
  const photoToTrip = useMemo(() => {
    const map = new Map<string, Trip>();
    trips.forEach((trip) => {
      trip.photoIds.forEach((photoId) => {
        map.set(photoId, trip);
      });
    });
    return map;
  }, [trips]);

  // Filter and sort photos
  const filteredPhotos = useMemo(() => {
    let result = [...photos];

    // Filter by trip
    if (tripFilter) {
      const trip = trips.find((t) => t.id === tripFilter);
      if (trip) {
        result = result.filter((p) => trip.photoIds.includes(p.id));
      }
    }

    // Filter by location
    if (locationFilter) {
      result = result.filter((p) =>
        p.location.name?.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    // Filter by year
    if (yearFilter) {
      result = result.filter((p) => p.date.getFullYear() === yearFilter);
    }

    // Sort
    switch (sortBy) {
      case 'date-desc':
        result.sort((a, b) => b.date.getTime() - a.date.getTime());
        break;
      case 'date-asc':
        result.sort((a, b) => a.date.getTime() - b.date.getTime());
        break;
      case 'location':
        result.sort((a, b) => (a.location.name || '').localeCompare(b.location.name || ''));
        break;
    }

    return result;
  }, [photos, trips, tripFilter, locationFilter, yearFilter, sortBy]);

  const hasActiveFilters = tripFilter || locationFilter || yearFilter;

  const clearFilters = () => {
    setTripFilter(null);
    setLocationFilter(null);
    setYearFilter(null);
  };

  const closeAllDropdowns = () => {
    setTripDropdownOpen(false);
    setLocationDropdownOpen(false);
    setYearDropdownOpen(false);
    setSortDropdownOpen(false);
  };

  const getSelectedTripName = () => {
    if (!tripFilter) return 'All Trips';
    const trip = trips.find((t) => t.id === tripFilter);
    return trip?.name || trip?.locationName || 'Unknown';
  };

  const getSelectedLocationName = () => {
    if (!locationFilter) return 'All Locations';
    const loc = uniqueLocations.find((l) => l.key === locationFilter);
    return loc?.key || locationFilter;
  };

  if (photos.length === 0) {
    return (
      <Overlay onClick={onClose}>
        <Header onClick={(e) => e.stopPropagation()}>
          <HeaderLeft>
            <HeaderIcon>
              <Image />
            </HeaderIcon>
            <HeaderTitle>All Photos</HeaderTitle>
          </HeaderLeft>
          <CloseButton onClick={onClose}>
            <X />
          </CloseButton>
        </Header>
        <ScrollArea onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <EmptyState>No photos yet. Upload some memories to get started!</EmptyState>
        </ScrollArea>
      </Overlay>
    );
  }

  return (
    <Overlay onClick={onClose}>
      <Header onClick={(e) => e.stopPropagation()}>
        <HeaderLeft>
          <HeaderIcon>
            <Image />
          </HeaderIcon>
          <HeaderTitle>
            All Photos
            <HeaderSubtitle>{photos.length} photo{photos.length !== 1 ? 's' : ''}</HeaderSubtitle>
          </HeaderTitle>
        </HeaderLeft>
        <CloseButton onClick={onClose}>
          <X />
        </CloseButton>
      </Header>

      <ScrollArea onClick={(e) => e.stopPropagation()}>
        <FiltersBar onClick={(e) => { e.stopPropagation(); closeAllDropdowns(); }}>
          <FilterLabel>
            <SlidersHorizontal />
            Filters:
          </FilterLabel>

          <FilterGroup>
            {/* Trip Filter */}
            <FilterSelect onClick={(e) => e.stopPropagation()}>
              <FilterButton
                $active={!!tripFilter}
                onClick={() => {
                  closeAllDropdowns();
                  setTripDropdownOpen(!tripDropdownOpen);
                }}
              >
                <Plane />
                {getSelectedTripName()}
                <ChevronDown />
              </FilterButton>
              <Dropdown $visible={tripDropdownOpen}>
                <DropdownItem
                  $selected={!tripFilter}
                  onClick={() => { setTripFilter(null); setTripDropdownOpen(false); }}
                >
                  <DropdownIcon><Plane /></DropdownIcon>
                  All Trips
                </DropdownItem>
                {trips.map((trip) => (
                  <DropdownItem
                    key={trip.id}
                    $selected={tripFilter === trip.id}
                    onClick={() => { setTripFilter(trip.id); setTripDropdownOpen(false); }}
                  >
                    <DropdownIcon><Plane /></DropdownIcon>
                    {trip.name || trip.locationName}
                  </DropdownItem>
                ))}
              </Dropdown>
            </FilterSelect>

            {/* Location Filter */}
            <FilterSelect onClick={(e) => e.stopPropagation()}>
              <FilterButton
                $active={!!locationFilter}
                onClick={() => {
                  closeAllDropdowns();
                  setLocationDropdownOpen(!locationDropdownOpen);
                }}
              >
                <MapPin />
                {getSelectedLocationName()}
                <ChevronDown />
              </FilterButton>
              <Dropdown $visible={locationDropdownOpen}>
                <DropdownItem
                  $selected={!locationFilter}
                  onClick={() => { setLocationFilter(null); setLocationDropdownOpen(false); }}
                >
                  <DropdownIcon><MapPin /></DropdownIcon>
                  All Locations
                </DropdownItem>
                {uniqueLocations.map((loc) => (
                  <DropdownItem
                    key={loc.key}
                    $selected={locationFilter === loc.key}
                    onClick={() => { setLocationFilter(loc.key); setLocationDropdownOpen(false); }}
                  >
                    <DropdownIcon><MapPin /></DropdownIcon>
                    {loc.key}
                  </DropdownItem>
                ))}
              </Dropdown>
            </FilterSelect>

            {/* Year Filter */}
            <FilterSelect onClick={(e) => e.stopPropagation()}>
              <FilterButton
                $active={!!yearFilter}
                onClick={() => {
                  closeAllDropdowns();
                  setYearDropdownOpen(!yearDropdownOpen);
                }}
              >
                <Calendar />
                {yearFilter || 'All Years'}
                <ChevronDown />
              </FilterButton>
              <Dropdown $visible={yearDropdownOpen} $alignRight>
                <DropdownItem
                  $selected={!yearFilter}
                  onClick={() => { setYearFilter(null); setYearDropdownOpen(false); }}
                >
                  <DropdownIcon><Calendar /></DropdownIcon>
                  All Years
                </DropdownItem>
                {uniqueYears.map((year) => (
                  <DropdownItem
                    key={year}
                    $selected={yearFilter === year}
                    onClick={() => { setYearFilter(year); setYearDropdownOpen(false); }}
                  >
                    <DropdownIcon><Calendar /></DropdownIcon>
                    {year}
                  </DropdownItem>
                ))}
              </Dropdown>
            </FilterSelect>

            {/* Sort */}
            <FilterSelect onClick={(e) => e.stopPropagation()}>
              <FilterButton
                onClick={() => {
                  closeAllDropdowns();
                  setSortDropdownOpen(!sortDropdownOpen);
                }}
              >
                <Filter />
                {sortBy === 'date-desc' ? 'Newest First' : sortBy === 'date-asc' ? 'Oldest First' : 'By Location'}
                <ChevronDown />
              </FilterButton>
              <Dropdown $visible={sortDropdownOpen}>
                <DropdownItem
                  $selected={sortBy === 'date-desc'}
                  onClick={() => { setSortBy('date-desc'); setSortDropdownOpen(false); }}
                >
                  Newest First
                </DropdownItem>
                <DropdownItem
                  $selected={sortBy === 'date-asc'}
                  onClick={() => { setSortBy('date-asc'); setSortDropdownOpen(false); }}
                >
                  Oldest First
                </DropdownItem>
                <DropdownItem
                  $selected={sortBy === 'location'}
                  onClick={() => { setSortBy('location'); setSortDropdownOpen(false); }}
                >
                  By Location
                </DropdownItem>
              </Dropdown>
            </FilterSelect>
          </FilterGroup>

          {hasActiveFilters && (
            <ClearFiltersButton onClick={clearFilters}>
              <X />
              Clear Filters
            </ClearFiltersButton>
          )}
        </FiltersBar>

        <PhotosContent>
          <ResultsCount>
          Showing {filteredPhotos.length} of {photos.length} photos
          {hasActiveFilters && ' (filtered)'}
        </ResultsCount>

        {filteredPhotos.length === 0 ? (
          <EmptyState>No photos match your filters. Try adjusting them.</EmptyState>
        ) : (
          <PhotoGrid>
            {filteredPhotos.map((photo) => {
              const trip = photoToTrip.get(photo.id);
              return (
                <PhotoCard
                  key={photo.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPhotoClick(photo);
                  }}
                >
                  <PhotoImage src={photo.url} alt="" loading="lazy" />
                  <PhotoOverlay>
                    <PhotoDate>
                      <Calendar />
                      {format(photo.date, 'MMM d, yyyy')}
                    </PhotoDate>
                    {photo.location.name && (
                      <PhotoLocation>{photo.location.name}</PhotoLocation>
                    )}
                    {trip && (
                      <PhotoTrip>
                        <Plane />
                        {trip.name || trip.locationName}
                      </PhotoTrip>
                    )}
                  </PhotoOverlay>
                </PhotoCard>
              );
            })}
          </PhotoGrid>
        )}
        </PhotosContent>
      </ScrollArea>
    </Overlay>
  );
}
