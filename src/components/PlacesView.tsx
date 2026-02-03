import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { X, MapPin, Calendar, Plane, Image, ChevronRight, Plus, Lightbulb, Search, BookmarkCheck, ImagePlus } from 'lucide-react';
import styled from 'styled-components';
import type { Photo, Trip, PlannedTrip } from '../types/photo';
import { groupPhotosByLocation } from '../utils/exif';

interface PlacesViewProps {
  photos: Photo[];
  trips: Trip[];
  plannedTrips?: PlannedTrip[];
  onClose: () => void;
  onLocationSelect: (photos: Photo[]) => void;
  onPlannedTripClick?: (trip: PlannedTrip) => void;
  onAddPlannedTrip?: () => void;
  onAddTrip?: () => void;
  onTripClick?: (trip: Trip) => void;
  onAddPhotos?: () => void;
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

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 2rem;

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

const PlacesList = styled.div`
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const PlaceCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1.25rem;
  overflow: hidden;
`;

const PlaceHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem 1.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;

const PlaceThumbnail = styled.div`
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 1rem;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const PlaceInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const PlaceName = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.375rem;
`;

const PlaceMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 0.375rem;

  svg {
    width: 0.875rem;
    height: 0.875rem;
  }
`;

const PlaceArrow = styled.div`
  svg {
    width: 1.25rem;
    height: 1.25rem;
    color: rgba(255, 255, 255, 0.3);
  }
`;

const TripsSection = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.2);
`;

const TripsTitle = styled.div`
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.5rem;
  margin-bottom: 0.25rem;
`;

const TripCard = styled.button`
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: transparent;
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const TripIcon = styled.div`
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.625rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.15) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 1.125rem;
    height: 1.125rem;
    color: #60a5fa;
  }
`;

const TripInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TripName = styled.h3`
  font-size: 0.9375rem;
  font-weight: 500;
  color: #ffffff;
  margin-bottom: 0.25rem;
`;

const TripDates = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 0.5rem;

  svg {
    width: 0.75rem;
    height: 0.75rem;
  }
`;

const TripDescription = styled.p`
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.4);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const TripPhotos = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
  margin-top: 0.375rem;
`;

const NoPhotosTripCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1.25rem;
  overflow: hidden;
`;

const NoPhotosTripHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem 1.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;

const NoPhotosTripIcon = styled.div`
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 1.75rem;
    height: 1.75rem;
    color: #ec4899;
  }
`;

const NoPhotosEmpty = styled.div`
  padding: 1.25rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const NoPhotosEmptyIcon = styled.div`
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.625rem;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 1.125rem;
    height: 1.125rem;
    color: rgba(255, 255, 255, 0.35);
  }
`;

const NoPhotosEmptyText = styled.div`
  flex: 1;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.4);
`;

const NoPhotosAddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background: rgba(236, 72, 153, 0.15);
  border: none;
  color: #ec4899;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(236, 72, 153, 0.25);
  }

  svg {
    width: 0.875rem;
    height: 0.875rem;
  }
`;

const TripArrow = styled.div`
  padding-top: 0.125rem;

  svg {
    width: 1rem;
    height: 1rem;
    color: rgba(255, 255, 255, 0.25);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.5);
`;

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.25rem;
  border-radius: 0.75rem;
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: none;
  background: ${({ $active }) => ($active ? 'rgba(255, 255, 255, 0.12)' : 'transparent')};
  color: ${({ $active }) => ($active ? '#ffffff' : 'rgba(255, 255, 255, 0.5)')};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${({ $active }) => ($active ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)')};
    color: ${({ $active }) => ($active ? '#ffffff' : 'rgba(255, 255, 255, 0.7)')};
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const AddPlannedButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
  border: none;
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #db2777 0%, #be185d 100%);
  }

  svg {
    width: 1rem;
    height: 1rem;
  }
`;

const PlannedTripCard = styled.button`
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1.25rem;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
  }
`;

const PlannedTripIcon = styled.div<{ $status: 'idea' | 'researching' | 'booked' }>`
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 1rem;
  background: ${({ $status }) =>
    $status === 'booked' ? 'rgba(34, 197, 94, 0.15)' :
    $status === 'researching' ? 'rgba(59, 130, 246, 0.15)' :
    'rgba(245, 158, 11, 0.15)'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 1.5rem;
    height: 1.5rem;
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

const PlannedTripName = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.375rem;
`;

const PlannedTripMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
`;

const StatusBadge = styled.span<{ $status: 'idea' | 'researching' | 'booked' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${({ $status }) =>
    $status === 'booked' ? 'rgba(34, 197, 94, 0.15)' :
    $status === 'researching' ? 'rgba(59, 130, 246, 0.15)' :
    'rgba(245, 158, 11, 0.15)'};
  color: ${({ $status }) =>
    $status === 'booked' ? '#22c55e' :
    $status === 'researching' ? '#3b82f6' :
    '#f59e0b'};

  svg {
    width: 0.75rem;
    height: 0.75rem;
  }
`;

const PlannedTripDescription = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.4);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const PlannedTripArrow = styled.div`
  padding-top: 0.25rem;

  svg {
    width: 1.25rem;
    height: 1.25rem;
    color: rgba(255, 255, 255, 0.3);
  }
`;

const EmptyPlannedState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
`;

const EmptyPlannedIcon = styled.div`
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;

  svg {
    width: 2.5rem;
    height: 2.5rem;
    color: #f472b6;
  }
`;

const EmptyPlannedTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.5rem;
`;

const EmptyPlannedText = styled.p`
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 1.5rem;
  max-width: 300px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.5;
`;

const EmptyAddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border-radius: 0.875rem;
  background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
  border: none;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);

  &:hover {
    background: linear-gradient(135deg, #db2777 0%, #be185d 100%);
    transform: translateY(-1px);
  }

  svg {
    width: 1.125rem;
    height: 1.125rem;
  }
`;

interface LocationWithTrips {
  key: string;
  lat: number;
  lng: number;
  name: string;
  photos: Photo[];
  trips: Trip[];
  latestDate: Date;
}

export default function PlacesView({
  photos,
  trips,
  plannedTrips = [],
  onClose,
  onLocationSelect,
  onPlannedTripClick,
  onAddPlannedTrip,
  onAddTrip,
  onTripClick,
  onAddPhotos,
}: PlacesViewProps) {
  const [viewMode, setViewMode] = useState<'past' | 'planned'>('past');

  // Find trips that have no photos
  const tripsWithoutPhotos = useMemo(() => {
    return trips.filter((trip) => trip.photoIds.length === 0)
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }, [trips]);

  const locationsWithTrips = useMemo(() => {
    const groups = groupPhotosByLocation(photos);
    const locations: LocationWithTrips[] = [];

    groups.forEach((groupPhotos, key) => {
      const [lat, lng] = key.split(',').map(Number);
      if (lat !== 0 || lng !== 0) {
        const sortedPhotos = [...groupPhotos].sort(
          (a, b) => b.date.getTime() - a.date.getTime()
        );
        const locationName =
          sortedPhotos[0].location.name || `${lat.toFixed(2)}, ${lng.toFixed(2)}`;

        // Find trips that have photos in this location
        const photoIds = sortedPhotos.map((p) => p.id);
        const locationTrips = trips.filter((trip) =>
          trip.photoIds.some((id) => photoIds.includes(id))
        );

        locations.push({
          key,
          lat,
          lng,
          name: locationName,
          photos: sortedPhotos,
          trips: locationTrips.sort(
            (a, b) => b.startDate.getTime() - a.startDate.getTime()
          ),
          latestDate: sortedPhotos[0].date,
        });
      }
    });

    return locations.sort((a, b) => b.latestDate.getTime() - a.latestDate.getTime());
  }, [photos, trips]);

  const handlePlaceClick = (location: LocationWithTrips) => {
    onLocationSelect(location.photos);
    onClose();
  };

  const handleTripClick = (trip: Trip, e: React.MouseEvent) => {
    e.stopPropagation();
    // Get photos for this trip
    const tripPhotos = photos.filter((p) => trip.photoIds.includes(p.id));
    if (tripPhotos.length > 0) {
      onLocationSelect(tripPhotos);
      onClose();
    }
  };

  const formatTripDates = (trip: Trip) => {
    const startYear = trip.startDate.getFullYear();
    const endYear = trip.endDate.getFullYear();

    if (startYear === endYear) {
      return `${format(trip.startDate, 'MMM d')} - ${format(trip.endDate, 'MMM d, yyyy')}`;
    }
    return `${format(trip.startDate, 'MMM d, yyyy')} - ${format(trip.endDate, 'MMM d, yyyy')}`;
  };

  const getStatusIcon = (status: 'idea' | 'researching' | 'booked') => {
    switch (status) {
      case 'booked':
        return BookmarkCheck;
      case 'researching':
        return Search;
      default:
        return Lightbulb;
    }
  };

  const getStatusLabel = (status: 'idea' | 'researching' | 'booked') => {
    switch (status) {
      case 'booked':
        return 'Booked';
      case 'researching':
        return 'Researching';
      default:
        return 'Just an idea';
    }
  };

  const renderPastTrips = () => {
    if (locationsWithTrips.length === 0 && tripsWithoutPhotos.length === 0) {
      return (
        <EmptyState>No trips yet. Add a trip to get started!</EmptyState>
      );
    }

    return (
      <PlacesList>
        {/* Show trips without photos first */}
        {tripsWithoutPhotos.map((trip) => (
          <NoPhotosTripCard key={trip.id}>
            <NoPhotosTripHeader onClick={() => onTripClick?.(trip)}>
              <NoPhotosTripIcon>
                <Plane />
              </NoPhotosTripIcon>
              <PlaceInfo>
                <PlaceName>{trip.name || trip.locationName}</PlaceName>
                <PlaceMeta>
                  <MetaItem>
                    <Calendar />
                    {formatTripDates(trip)}
                  </MetaItem>
                </PlaceMeta>
                {trip.description && (
                  <TripDescription style={{ marginTop: '0.5rem' }}>{trip.description}</TripDescription>
                )}
              </PlaceInfo>
              <PlaceArrow>
                <ChevronRight />
              </PlaceArrow>
            </NoPhotosTripHeader>
            <NoPhotosEmpty>
              <NoPhotosEmptyIcon>
                <Image />
              </NoPhotosEmptyIcon>
              <NoPhotosEmptyText>No photos added yet</NoPhotosEmptyText>
              {onAddPhotos && (
                <NoPhotosAddButton onClick={(e) => { e.stopPropagation(); onAddPhotos(); }}>
                  <ImagePlus />
                  Add Photos
                </NoPhotosAddButton>
              )}
            </NoPhotosEmpty>
          </NoPhotosTripCard>
        ))}

        {/* Show locations with photos */}
        {locationsWithTrips.map((location) => (
          <PlaceCard key={location.key}>
            <PlaceHeader onClick={() => handlePlaceClick(location)}>
              <PlaceThumbnail>
                <img src={location.photos[0].thumbnail} alt="" />
              </PlaceThumbnail>
              <PlaceInfo>
                <PlaceName>{location.name}</PlaceName>
                <PlaceMeta>
                  <MetaItem>
                    <Image />
                    {location.photos.length} photo{location.photos.length !== 1 ? 's' : ''}
                  </MetaItem>
                  {location.trips.length > 0 && (
                    <MetaItem>
                      <Plane />
                      {location.trips.length} trip{location.trips.length !== 1 ? 's' : ''}
                    </MetaItem>
                  )}
                </PlaceMeta>
              </PlaceInfo>
              <PlaceArrow>
                <ChevronRight />
              </PlaceArrow>
            </PlaceHeader>

            {location.trips.length > 0 && (
              <TripsSection>
                <TripsTitle>Trips to {location.name}</TripsTitle>
                {location.trips.map((trip) => {
                  const tripPhotoCount = trip.photoIds.filter((id) =>
                    location.photos.some((p) => p.id === id)
                  ).length;
                  return (
                    <TripCard
                      key={trip.id}
                      onClick={(e) => handleTripClick(trip, e)}
                    >
                      <TripIcon>
                        <Plane />
                      </TripIcon>
                      <TripInfo>
                        <TripName>{trip.name}</TripName>
                        <TripDates>
                          <Calendar />
                          {formatTripDates(trip)}
                        </TripDates>
                        {trip.description && (
                          <TripDescription>{trip.description}</TripDescription>
                        )}
                        <TripPhotos>
                          {tripPhotoCount} photo{tripPhotoCount !== 1 ? 's' : ''} from this trip
                        </TripPhotos>
                      </TripInfo>
                      <TripArrow>
                        <ChevronRight />
                      </TripArrow>
                    </TripCard>
                  );
                })}
              </TripsSection>
            )}
          </PlaceCard>
        ))}
      </PlacesList>
    );
  };

  const renderPlannedTrips = () => {
    if (plannedTrips.length === 0) {
      return (
        <EmptyPlannedState>
          <EmptyPlannedIcon>
            <Plane />
          </EmptyPlannedIcon>
          <EmptyPlannedTitle>No planned trips yet</EmptyPlannedTitle>
          <EmptyPlannedText>
            Start dreaming about your next adventure together!
          </EmptyPlannedText>
          {onAddPlannedTrip && (
            <EmptyAddButton onClick={onAddPlannedTrip}>
              <Plus />
              Plan a Trip
            </EmptyAddButton>
          )}
        </EmptyPlannedState>
      );
    }

    return (
      <PlacesList>
        {plannedTrips.map((trip) => {
          const StatusIcon = getStatusIcon(trip.bookingStatus);
          return (
            <PlannedTripCard
              key={trip.id}
              onClick={() => onPlannedTripClick?.(trip)}
            >
              <PlannedTripIcon $status={trip.bookingStatus}>
                <StatusIcon />
              </PlannedTripIcon>
              <PlannedTripInfo>
                <PlannedTripName>{trip.destinationName}</PlannedTripName>
                <PlannedTripMeta>
                  <StatusBadge $status={trip.bookingStatus}>
                    <StatusIcon />
                    {getStatusLabel(trip.bookingStatus)}
                  </StatusBadge>
                  {trip.potentialStartDate && (
                    <span>
                      <Calendar size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                      {format(trip.potentialStartDate, 'MMM yyyy')}
                    </span>
                  )}
                </PlannedTripMeta>
                {trip.description && (
                  <PlannedTripDescription>{trip.description}</PlannedTripDescription>
                )}
              </PlannedTripInfo>
              <PlannedTripArrow>
                <ChevronRight />
              </PlannedTripArrow>
            </PlannedTripCard>
          );
        })}
      </PlacesList>
    );
  };

  return (
    <Overlay onClick={onClose}>
      <Header onClick={(e) => e.stopPropagation()}>
        <HeaderLeft>
          <HeaderIcon>
            <MapPin />
          </HeaderIcon>
          <HeaderTitle>Your Trips</HeaderTitle>
        </HeaderLeft>
        <HeaderActions>
          <ToggleContainer>
            <ToggleButton
              $active={viewMode === 'past'}
              onClick={() => setViewMode('past')}
            >
              Past
            </ToggleButton>
            <ToggleButton
              $active={viewMode === 'planned'}
              onClick={() => setViewMode('planned')}
            >
              Planned
            </ToggleButton>
          </ToggleContainer>
          {viewMode === 'past' && onAddTrip && (
            <AddPlannedButton onClick={onAddTrip}>
              <Plus />
              Add
            </AddPlannedButton>
          )}
          {viewMode === 'planned' && onAddPlannedTrip && (
            <AddPlannedButton onClick={onAddPlannedTrip}>
              <Plus />
              Add
            </AddPlannedButton>
          )}
          <CloseButton onClick={onClose}>
            <X />
          </CloseButton>
        </HeaderActions>
      </Header>

      <Content onClick={(e) => e.stopPropagation()}>
        {viewMode === 'past' ? renderPastTrips() : renderPlannedTrips()}
      </Content>
    </Overlay>
  );
}
