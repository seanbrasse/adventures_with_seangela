import { useMemo } from 'react';
import { format } from 'date-fns';
import { MapPin, Heart, Image, Sparkles, Plane } from 'lucide-react';
import { differenceInMonths } from 'date-fns';
import styled from 'styled-components';
import type { Photo, Trip } from '../types/photo';
import { groupPhotosByLocation } from '../utils/exif';

interface SidebarProps {
  photos: Photo[];
  trips?: Trip[];
  onLocationSelect: (photos: Photo[]) => void;
  onPlacesClick?: () => void;
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
  overflow-y: auto;

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

const LocationsInner = styled.div`
  padding: 1.25rem;
`;

const SectionTitle = styled.h3`
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 1rem;
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

export default function Sidebar({ photos, trips = [], onLocationSelect, onPlacesClick }: SidebarProps) {
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
          <StatCard>
            <StatHeader>
              <StatIcon>
                <Image size={16} />
              </StatIcon>
              <StatLabel>Photos</StatLabel>
            </StatHeader>
            <StatValue>{stats.totalPhotos}</StatValue>
          </StatCard>

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
        <LocationsInner>
          <SectionTitle>Your Trips</SectionTitle>
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
        </LocationsInner>
      </LocationsSection>
    </Container>
  );
}
