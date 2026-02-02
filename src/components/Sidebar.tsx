import { useMemo } from 'react';
import { format } from 'date-fns';
import { MapPin, Calendar, Image, Sparkles } from 'lucide-react';
import styled from 'styled-components';
import type { Photo } from '../types/photo';
import { groupPhotosByLocation } from '../utils/exif';

interface SidebarProps {
  photos: Photo[];
  onLocationSelect: (photos: Photo[]) => void;
}

// Styled Components
const Container = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(15, 15, 25, 0.98) 0%, rgba(10, 10, 18, 1) 100%);
`;

const EmptyState = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2.5rem;
  text-align: center;
`;

const EmptyIcon = styled.div`
  width: 7rem;
  height: 7rem;
  border-radius: 2rem;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.25) 0%, rgba(168, 85, 247, 0.2) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
  box-shadow: 0 8px 32px rgba(236, 72, 153, 0.15);
`;

const EmptyTitle = styled.h3`
  font-size: 1.75rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 1rem;
  letter-spacing: -0.02em;
`;

const EmptyText = styled.p`
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
  max-width: 280px;
`;

const StatsSection = styled.div`
  padding: 2rem 1.75rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
`;

const StatCard = styled.div<{ $variant: 'pink' | 'blue' }>`
  background: ${({ $variant }) =>
    $variant === 'pink'
      ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.18) 0%, rgba(168, 85, 247, 0.12) 100%)'
      : 'linear-gradient(135deg, rgba(59, 130, 246, 0.18) 0%, rgba(6, 182, 212, 0.12) 100%)'};
  border-radius: 1.25rem;
  padding: 1.5rem;
  border: 1px solid ${({ $variant }) =>
    $variant === 'pink' ? 'rgba(236, 72, 153, 0.25)' : 'rgba(59, 130, 246, 0.25)'};
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: ${({ $variant }) =>
      $variant === 'pink' ? 'rgba(236, 72, 153, 0.4)' : 'rgba(59, 130, 246, 0.4)'};
  }
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.875rem;
  margin-bottom: 1rem;
`;

const StatIcon = styled.div<{ $variant: 'pink' | 'blue' }>`
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.875rem;
  background: ${({ $variant }) =>
    $variant === 'pink' ? 'rgba(236, 72, 153, 0.25)' : 'rgba(59, 130, 246, 0.25)'};
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    color: ${({ $variant }) => ($variant === 'pink' ? '#f472b6' : '#60a5fa')};
  }
`;

const StatLabel = styled.span<{ $variant: 'pink' | 'blue' }>`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ $variant }) => ($variant === 'pink' ? '#f9a8d4' : '#93c5fd')};
  letter-spacing: 0.01em;
`;

const StatValue = styled.p`
  font-size: 2.75rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.03em;
  line-height: 1;
`;

const DateRange = styled.div`
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0 0.25rem;

  svg {
    color: rgba(255, 255, 255, 0.35);
  }
`;

const DateText = styled.span`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
`;

const Divider = styled.div`
  margin: 0 1.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
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
  padding: 1.75rem;
`;

const SectionTitle = styled.h3`
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 1.5rem;
`;

const LocationsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const LocationCard = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.125rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 1.25rem;
  transition: all 0.2s ease;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(236, 72, 153, 0.3);
    transform: translateX(4px);
  }
`;

const Thumbnail = styled.div`
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 1rem;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.1);
  transition: border-color 0.2s ease;

  ${LocationCard}:hover & {
    border-color: rgba(236, 72, 153, 0.5);
  }

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
  font-size: 1.125rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
`;

const LocationMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9375rem;
`;

const MetaDot = styled.span`
  color: rgba(255, 255, 255, 0.2);
`;

export default function Sidebar({ photos, onLocationSelect }: SidebarProps) {
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

    return { totalPhotos, totalLocations, firstDate, lastDate };
  }, [photos, locations]);

  if (photos.length === 0) {
    return (
      <EmptyState>
        <EmptyIcon>
          <Sparkles size={40} color="#f472b6" />
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
          <StatCard $variant="pink">
            <StatHeader>
              <StatIcon $variant="pink">
                <Image size={22} />
              </StatIcon>
              <StatLabel $variant="pink">Photos</StatLabel>
            </StatHeader>
            <StatValue>{stats.totalPhotos}</StatValue>
          </StatCard>

          <StatCard $variant="blue">
            <StatHeader>
              <StatIcon $variant="blue">
                <MapPin size={22} />
              </StatIcon>
              <StatLabel $variant="blue">Places</StatLabel>
            </StatHeader>
            <StatValue>{stats.totalLocations}</StatValue>
          </StatCard>
        </StatsGrid>

        {stats.firstDate && stats.lastDate && (
          <DateRange>
            <Calendar size={20} />
            <DateText>
              {format(stats.firstDate, 'MMM yyyy')} – {format(stats.lastDate, 'MMM yyyy')}
            </DateText>
          </DateRange>
        )}
      </StatsSection>

      <Divider />

      <LocationsSection>
        <LocationsInner>
          <SectionTitle>Your Places</SectionTitle>
          <LocationsList>
            {locations.map((loc) => (
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
                    {loc.photos[0].location.name || `${loc.lat.toFixed(2)}, ${loc.lng.toFixed(2)}`}
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
            ))}
          </LocationsList>
        </LocationsInner>
      </LocationsSection>
    </Container>
  );
}
