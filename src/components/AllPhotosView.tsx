import { useMemo } from 'react';
import { format } from 'date-fns';
import { X, Image, Calendar, Plane, MapPin } from 'lucide-react';
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

const SectionList = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
`;

const Section = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1.25rem;
  overflow: hidden;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.2);
`;

const SectionIcon = styled.div`
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.15) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 1.25rem;
    height: 1.25rem;
    color: #60a5fa;
  }
`;

const SectionInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const SectionTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.25rem;
`;

const SectionMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.5);
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

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem;
  padding: 1rem 1.25rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
    padding: 1.25rem 1.5rem;
  }
`;

const PhotoCard = styled.button`
  position: relative;
  aspect-ratio: 1;
  border-radius: 0.75rem;
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
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, transparent 50%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 0.75rem;
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

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.5);
`;

interface PhotosByTrip {
  trip: Trip | null;
  photos: Photo[];
}

export default function AllPhotosView({
  photos,
  trips,
  onClose,
  onPhotoClick,
}: AllPhotosViewProps) {
  const photosByTrip = useMemo(() => {
    const result: PhotosByTrip[] = [];
    const assignedPhotoIds = new Set<string>();

    // Sort trips by start date (most recent first)
    const sortedTrips = [...trips].sort(
      (a, b) => b.startDate.getTime() - a.startDate.getTime()
    );

    // Group photos by trip
    sortedTrips.forEach((trip) => {
      const tripPhotos = photos.filter((p) => trip.photoIds.includes(p.id));
      if (tripPhotos.length > 0) {
        result.push({
          trip,
          photos: tripPhotos.sort((a, b) => b.date.getTime() - a.date.getTime()),
        });
        tripPhotos.forEach((p) => assignedPhotoIds.add(p.id));
      }
    });

    // Collect unassigned photos
    const unassignedPhotos = photos.filter((p) => !assignedPhotoIds.has(p.id));
    if (unassignedPhotos.length > 0) {
      result.push({
        trip: null,
        photos: unassignedPhotos.sort((a, b) => b.date.getTime() - a.date.getTime()),
      });
    }

    return result;
  }, [photos, trips]);

  const formatTripDates = (trip: Trip) => {
    const startYear = trip.startDate.getFullYear();
    const endYear = trip.endDate.getFullYear();

    if (startYear === endYear) {
      return `${format(trip.startDate, 'MMM d')} - ${format(trip.endDate, 'MMM d, yyyy')}`;
    }
    return `${format(trip.startDate, 'MMM d, yyyy')} - ${format(trip.endDate, 'MMM d, yyyy')}`;
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
        <Content onClick={(e) => e.stopPropagation()}>
          <EmptyState>No photos yet. Upload some memories to get started!</EmptyState>
        </Content>
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

      <Content onClick={(e) => e.stopPropagation()}>
        <SectionList>
          {photosByTrip.map((section, index) => (
            <Section key={section.trip?.id || 'unassigned'}>
              <SectionHeader>
                <SectionIcon>
                  {section.trip ? <Plane /> : <Image />}
                </SectionIcon>
                <SectionInfo>
                  <SectionTitle>
                    {section.trip ? section.trip.name || section.trip.locationName : 'Other Photos'}
                  </SectionTitle>
                  <SectionMeta>
                    {section.trip ? (
                      <>
                        <MetaItem>
                          <Calendar />
                          {formatTripDates(section.trip)}
                        </MetaItem>
                        <MetaItem>
                          <Image />
                          {section.photos.length} photo{section.photos.length !== 1 ? 's' : ''}
                        </MetaItem>
                      </>
                    ) : (
                      <MetaItem>
                        <Image />
                        {section.photos.length} photo{section.photos.length !== 1 ? 's' : ''} not assigned to a trip
                      </MetaItem>
                    )}
                  </SectionMeta>
                </SectionInfo>
              </SectionHeader>

              <PhotoGrid>
                {section.photos.map((photo) => (
                  <PhotoCard
                    key={photo.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPhotoClick(photo);
                    }}
                  >
                    <PhotoImage src={photo.thumbnail} alt="" loading="lazy" />
                    <PhotoOverlay>
                      <PhotoDate>
                        <Calendar />
                        {format(photo.date, 'MMM d, yyyy')}
                      </PhotoDate>
                      {photo.location.name && (
                        <PhotoLocation>
                          <MapPin size={10} style={{ display: 'inline', marginRight: '2px' }} />
                          {photo.location.name}
                        </PhotoLocation>
                      )}
                    </PhotoOverlay>
                  </PhotoCard>
                ))}
              </PhotoGrid>
            </Section>
          ))}
        </SectionList>
      </Content>
    </Overlay>
  );
}
