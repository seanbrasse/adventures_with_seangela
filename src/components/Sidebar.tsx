import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { MapPin, Heart, Image, Sparkles, Plane, Plus, Lightbulb, Search, BookmarkCheck, Map, Calendar, FileText, ListTodo } from 'lucide-react';
import { differenceInMonths } from 'date-fns';
import styled from 'styled-components';
import type { Photo, Trip, PlannedTrip } from '../types/photo';
import { groupPhotosByLocation } from '../utils/exif';

interface SidebarProps {
  photos: Photo[];
  trips?: Trip[];
  plannedTrips?: PlannedTrip[];
  onLocationSelect: (photos: Photo[]) => void;
  onPlacesClick?: () => void;
  onPhotosClick?: () => void;
  onPlannedTripClick?: (trip: PlannedTrip) => void;
  onAddPlannedTrip?: () => void;
  onAddPhotos?: () => void;
  isAuthenticated?: boolean;
  onLoginClick?: () => void;
}

// Styled Components
const Container = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const EmptyState = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
`;

const EmptyIcon = styled.div`
  width: 4rem;
  height: 4rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.25rem;
`;

const EmptyTitle = styled.h3`
  font-size: 1.0625rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.5rem;
`;

const EmptyText = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.4);
  line-height: 1.5;
  max-width: 220px;
`;

const StatsSection = styled.div`
  padding: 1.25rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border-radius: 1rem;
  padding: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.2s ease;
  min-width: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
`;

const ClickableStatCard = styled(StatCard).attrs({ as: 'button' })`
  cursor: pointer;
  text-align: left;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.12);
  }
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.875rem;
`;

const StatIcon = styled.div`
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    color: rgba(255, 255, 255, 0.6);
  }
`;

const StatLabel = styled.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatValue = styled.p`
  font-size: 2rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.02em;
  line-height: 1;
`;

const TripsStat = styled.div`
  margin-top: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const TripsValue = styled.span`
  font-size: 1.125rem;
  font-weight: 600;
  color: #ffffff;
`;

const TripsLabel = styled.span`
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 400;
`;

const DateRange = styled.div`
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const DateText = styled.span`
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 400;
`;

const Divider = styled.div`
  margin: 0 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`;

const LocationsSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const ToggleHeader = styled.div`
  padding: 1.25rem 1.25rem 0.75rem;
  flex-shrink: 0;
`;

const ScrollableContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 1.25rem 1.25rem;

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

const LocationsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const LocationCard = styled.button`
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.875rem;
  background: transparent;
  border: none;
  border-radius: 0.875rem;
  transition: all 0.15s ease;
  text-align: left;
  cursor: pointer;
  min-height: 5.5rem;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  &:active {
    background: rgba(255, 255, 255, 0.08);
    transform: scale(0.99);
  }
`;

const Thumbnail = styled.div`
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 0.75rem;
  overflow: hidden;
  flex-shrink: 0;
  margin-top: 0.125rem;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const LocationInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const LocationName = styled.p`
  font-size: 0.9375rem;
  font-weight: 500;
  color: #ffffff;
  margin-bottom: 0.25rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  line-height: 1.4;
`;

const LocationMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8125rem;
`;

const MetaDot = styled.span`
  color: rgba(255, 255, 255, 0.2);
`;

const PlannedTripCard = styled.button`
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 1rem;
  transition: all 0.15s ease;
  text-align: left;
  cursor: pointer;
  margin-bottom: 0.625rem;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
  }

  &:active {
    background: rgba(255, 255, 255, 0.08);
    transform: scale(0.99);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const PlannedTripIcon = styled.div<{ $status: 'idea' | 'researching' | 'booked' }>`
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  background: ${({ $status }) =>
    $status === 'booked' ? 'rgba(34, 197, 94, 0.15)' :
    $status === 'researching' ? 'rgba(59, 130, 246, 0.15)' :
    'rgba(245, 158, 11, 0.15)'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 1.125rem;
    height: 1.125rem;
    color: ${({ $status }) =>
      $status === 'booked' ? '#22c55e' :
      $status === 'researching' ? '#3b82f6' :
      '#f59e0b'};
  }
`;

const PlannedTripInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const PlannedTripName = styled.p`
  font-size: 0.9375rem;
  font-weight: 500;
  color: #ffffff;
  margin-bottom: 0.25rem;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PlannedTripMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8125rem;
`;

const StatusBadge = styled.span<{ $status: 'idea' | 'researching' | 'booked' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: ${({ $status }) =>
    $status === 'booked' ? '#22c55e' :
    $status === 'researching' ? '#3b82f6' :
    '#f59e0b'};
`;

const PlannedTripDescription = styled.p`
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
  margin-top: 0.625rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const PlannedTripDetails = styled.div`
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`;

const PlannedTripDetailRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);

  &:last-child {
    margin-bottom: 0;
  }

  svg {
    width: 0.875rem;
    height: 0.875rem;
    flex-shrink: 0;
    margin-top: 0.125rem;
    color: rgba(255, 255, 255, 0.35);
  }
`;

const PlannedTripTodoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const PlannedTripTodoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);

  &::before {
    content: '';
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    flex-shrink: 0;
  }
`;

const PlannedTripNotes = styled.p`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const EditHint = styled.span`
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.3);
  margin-top: 0.5rem;
  display: block;
  text-align: right;
`;

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 0.625rem;
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  background: ${({ $active }) => $active ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  color: ${({ $active }) => $active ? '#ffffff' : 'rgba(255, 255, 255, 0.4)'};

  &:hover {
    background: ${({ $active }) => $active ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)'};
    color: ${({ $active }) => $active ? '#ffffff' : 'rgba(255, 255, 255, 0.6)'};
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const PlannedTripsEmpty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1.5rem;
  text-align: center;
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.04) 0%, transparent 100%);
  border-radius: 1rem;
  border: 1px dashed rgba(251, 191, 36, 0.2);
  margin-top: 0.5rem;
`;

const PlannedTripsEmptyIcon = styled.div`
  width: 4rem;
  height: 4rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(249, 115, 22, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  box-shadow: 0 8px 24px rgba(251, 191, 36, 0.1);
`;

const PlannedTripsEmptyTitle = styled.p`
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.375rem;
`;

const PlannedTripsEmptyText = styled.p`
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 1.25rem;
  line-height: 1.4;
`;

const AddPlannedTripButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border: none;
  color: #1a1a28;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.25);

  &:hover {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(251, 191, 36, 0.3);
  }
`;

// Your Trips empty state styled components
const TripsEmpty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1.5rem;
  text-align: center;
  background: linear-gradient(180deg, rgba(236, 72, 153, 0.04) 0%, transparent 100%);
  border-radius: 1rem;
  border: 1px dashed rgba(236, 72, 153, 0.2);
  margin-top: 0.5rem;
`;

const TripsEmptyIcon = styled.div`
  width: 4rem;
  height: 4rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  box-shadow: 0 8px 24px rgba(236, 72, 153, 0.1);
`;

const TripsEmptyTitle = styled.p`
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.375rem;
`;

const TripsEmptyText = styled.p`
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 1.25rem;
  line-height: 1.4;
`;

const AddTripsButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #ec4899 0%, #d946ef 100%);
  border: none;
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(236, 72, 153, 0.25);

  &:hover {
    background: linear-gradient(135deg, #d946ef 0%, #a855f7 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(236, 72, 153, 0.3);
  }
`;

export default function Sidebar({
  photos,
  trips = [],
  plannedTrips = [],
  onLocationSelect,
  onPlacesClick,
  onPhotosClick,
  onPlannedTripClick,
  onAddPlannedTrip,
  onAddPhotos,
  isAuthenticated = false,
  onLoginClick: _onLoginClick,
}: SidebarProps) {
  void _onLoginClick; // Suppress unused warning
  const locations = useMemo(() => {
    const groups = groupPhotosByLocation(photos);
    const locs: { key: string; lat: number; lng: number; photos: Photo[]; latestDate: Date }[] = [];

    groups.forEach((groupPhotos, key) => {
      const [lat, lng] = key.split(',').map(Number);
      if (lat !== 0 || lng !== 0) {
        const sortedPhotos = [...groupPhotos].sort((a, b) => b.date.getTime() - a.date.getTime());
        locs.push({
          key,
          lat,
          lng,
          photos: sortedPhotos,
          latestDate: sortedPhotos[0].date,
        });
      }
    });

    return locs.sort((a, b) => b.latestDate.getTime() - a.latestDate.getTime());
  }, [photos]);

  const [viewMode, setViewMode] = useState<'trips' | 'planned'>('trips');

  const stats = useMemo(() => {
    const totalPhotos = photos.length;
    const totalLocations = locations.length;
    const dates = photos.map((p) => p.date.getTime());
    const firstDate = dates.length > 0 ? new Date(Math.min(...dates)) : null;
    const lastDate = dates.length > 0 ? new Date(Math.max(...dates)) : null;

    // Count trips: actual trips from useTrips hook (includes multiple trips to same location)
    // Only count trips that started on or after Sep 1, 2024
    const tripStartDate = new Date('2024-09-01');
    const tripCount = trips.filter((trip) => trip.startDate >= tripStartDate).length;

    return { totalPhotos, totalLocations, firstDate, lastDate, trips: tripCount };
  }, [photos, locations, trips]);

  // Calculate relationship length since July 11th, 2024
  // This is outside useMemo so it updates with time
  const relationshipStart = new Date('2024-07-11');
  const now = new Date();
  const totalMonths = differenceInMonths(now, relationshipStart);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (photos.length === 0) {
    return (
      <EmptyState>
        <EmptyIcon>
          <Sparkles size={24} color="rgba(255, 255, 255, 0.5)" />
        </EmptyIcon>
        <EmptyTitle>No photos yet</EmptyTitle>
        <EmptyText>
          Add photos with location data to see them on your map
        </EmptyText>
      </EmptyState>
    );
  }

  return (
    <Container>
      <StatsSection>
        <StatsGrid>
          <ClickableStatCard onClick={onPhotosClick}>
            <StatHeader>
              <StatIcon>
                <Image size={16} />
              </StatIcon>
              <StatLabel>Photos</StatLabel>
            </StatHeader>
            <StatValue>{stats.totalPhotos}</StatValue>
          </ClickableStatCard>

          <ClickableStatCard onClick={onPlacesClick}>
            <StatHeader>
              <StatIcon>
                <MapPin size={16} />
              </StatIcon>
              <StatLabel>Locations</StatLabel>
            </StatHeader>
            <StatValue>{stats.totalLocations}</StatValue>
          </ClickableStatCard>
        </StatsGrid>

        {stats.trips > 0 && (
          <TripsStat>
            <Plane size={20} />
            <TripsValue>{stats.trips}</TripsValue>
            <TripsLabel>trip{stats.trips !== 1 ? 's' : ''} together</TripsLabel>
          </TripsStat>
        )}

        <DateRange>
          <Heart size={20} />
          <DateText>
            {years > 0 && `${years} year${years !== 1 ? 's' : ''}`}
            {years > 0 && months > 0 && ', '}
            {months > 0 && `${months} month${months !== 1 ? 's' : ''}`}
            {years === 0 && months === 0 && 'Just started!'}
            {' '}together
          </DateText>
        </DateRange>
      </StatsSection>

      <Divider />

      <LocationsSection>
        <ToggleHeader>
          <ToggleContainer>
            <ToggleButton
              $active={viewMode === 'trips'}
              onClick={() => setViewMode('trips')}
            >
              <Image size={14} />
              Your Trips
            </ToggleButton>
            <ToggleButton
              $active={viewMode === 'planned'}
              onClick={() => setViewMode('planned')}
            >
              <Map size={14} />
              Planned
            </ToggleButton>
          </ToggleContainer>
        </ToggleHeader>

        <ScrollableContent>
          {viewMode === 'trips' ? (
            <>
              {locations.length > 0 ? (
                <LocationsList>
                  {locations.map((loc) => {
                    const locationName = loc.photos[0].location.name || `${loc.lat.toFixed(2)}, ${loc.lng.toFixed(2)}`;
                    return (
                      <LocationCard
                        key={loc.key}
                        onClick={() => onLocationSelect(loc.photos)}
                      >
                        <Thumbnail>
                          <img
                            src={loc.photos[0].thumbnail}
                            alt=""
                          />
                        </Thumbnail>

                        <LocationInfo>
                          <LocationName>
                            {locationName}
                          </LocationName>
                          <LocationMeta>
                            <span>
                              {loc.photos.length} photo{loc.photos.length !== 1 ? 's' : ''}
                            </span>
                            <MetaDot>•</MetaDot>
                            <span>
                              {format(loc.latestDate, 'MMM d, yyyy')}
                            </span>
                          </LocationMeta>
                        </LocationInfo>
                      </LocationCard>
                    );
                  })}
                </LocationsList>
              ) : (
                <TripsEmpty>
                  <TripsEmptyIcon>
                    <Image size={24} color="#ec4899" />
                  </TripsEmptyIcon>
                  <TripsEmptyTitle>
                    Start your journey
                  </TripsEmptyTitle>
                  <TripsEmptyText>
                    Upload photos from your adventures to start building your map
                  </TripsEmptyText>
                  {isAuthenticated && onAddPhotos && (
                    <AddTripsButton onClick={onAddPhotos}>
                      <Plus size={16} />
                      Add Photos
                    </AddTripsButton>
                  )}
                </TripsEmpty>
              )}
            </>
          ) : (
            <>
              <LocationsList>
                {plannedTrips.map((trip) => {
                  const StatusIcon = trip.bookingStatus === 'booked' ? BookmarkCheck :
                                     trip.bookingStatus === 'researching' ? Search :
                                     Lightbulb;
                  const hasDetails = trip.description || trip.thingsToDo.length > 0 || trip.notes;
                  return (
                    <PlannedTripCard
                      key={trip.id}
                      onClick={() => onPlannedTripClick?.(trip)}
                    >
                      <PlannedTripIcon $status={trip.bookingStatus}>
                        <StatusIcon />
                      </PlannedTripIcon>
                      <PlannedTripInfo>
                        <PlannedTripName>
                          {trip.destinationName}
                        </PlannedTripName>
                        <PlannedTripMeta>
                          <StatusBadge $status={trip.bookingStatus}>
                            {trip.bookingStatus === 'booked' ? 'Booked' :
                             trip.bookingStatus === 'researching' ? 'Researching' :
                             'Just an idea'}
                          </StatusBadge>
                          {trip.potentialStartDate && (
                            <>
                              <MetaDot>•</MetaDot>
                              <span>{format(trip.potentialStartDate, 'MMM yyyy')}</span>
                            </>
                          )}
                        </PlannedTripMeta>

                        {trip.description && (
                          <PlannedTripDescription>
                            {trip.description}
                          </PlannedTripDescription>
                        )}

                        {hasDetails && (
                          <PlannedTripDetails>
                            {trip.potentialStartDate && trip.potentialEndDate && (
                              <PlannedTripDetailRow>
                                <Calendar />
                                <span>
                                  {format(trip.potentialStartDate, 'MMM d')} - {format(trip.potentialEndDate, 'MMM d, yyyy')}
                                </span>
                              </PlannedTripDetailRow>
                            )}

                            {trip.thingsToDo.length > 0 && (
                              <PlannedTripDetailRow>
                                <ListTodo />
                                <PlannedTripTodoList>
                                  {trip.thingsToDo.slice(0, 3).map((todo, i) => (
                                    <PlannedTripTodoItem key={i}>{todo}</PlannedTripTodoItem>
                                  ))}
                                  {trip.thingsToDo.length > 3 && (
                                    <span style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.35)' }}>
                                      +{trip.thingsToDo.length - 3} more
                                    </span>
                                  )}
                                </PlannedTripTodoList>
                              </PlannedTripDetailRow>
                            )}

                            {trip.notes && (
                              <PlannedTripDetailRow>
                                <FileText />
                                <PlannedTripNotes>{trip.notes}</PlannedTripNotes>
                              </PlannedTripDetailRow>
                            )}
                          </PlannedTripDetails>
                        )}

                        <EditHint>Click to edit</EditHint>
                      </PlannedTripInfo>
                    </PlannedTripCard>
                  );
                })}
              </LocationsList>
              {plannedTrips.length === 0 && (
                <PlannedTripsEmpty>
                  <PlannedTripsEmptyIcon>
                    <Map size={24} color="#fbbf24" />
                  </PlannedTripsEmptyIcon>
                  <PlannedTripsEmptyTitle>
                    No adventures planned yet
                  </PlannedTripsEmptyTitle>
                  <PlannedTripsEmptyText>
                    {isAuthenticated
                      ? "Dream up your next trip together and keep track of all the details"
                      : "Sign in to start planning your next adventure together"
                    }
                  </PlannedTripsEmptyText>
                  {isAuthenticated && onAddPlannedTrip && (
                    <AddPlannedTripButton onClick={onAddPlannedTrip}>
                      <Plus size={16} />
                      Start Planning
                    </AddPlannedTripButton>
                  )}
                </PlannedTripsEmpty>
              )}
            </>
          )}
        </ScrollableContent>
      </LocationsSection>
    </Container>
  );
}
