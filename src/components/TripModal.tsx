import { useState, useCallback, useRef, useEffect } from 'react';
import { X, MapPin, Search, Loader2, Calendar, FileText } from 'lucide-react';
import styled, { keyframes } from 'styled-components';
import type { Trip } from '../types/photo';

interface TripModalProps {
  trip?: Trip; // If provided, we're editing
  onSave: (trip: Omit<Trip, 'id'>) => void;
  onDelete?: () => void;
  onClose: () => void;
  mapboxToken?: string;
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
  z-index: 50;
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
  max-width: 40rem;
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
  justify-content: space-between;
  padding: 2rem 2.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const HeaderIcon = styled.div`
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.15) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(236, 72, 153, 0.15);

  svg {
    width: 1.75rem;
    height: 1.75rem;
    color: #ec4899;
  }
`;

const HeaderText = styled.div``;

const Title = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.02em;
  margin-bottom: 0.25rem;
`;

const Subtitle = styled.p`
  font-size: 1rem;
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

const FormGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
`;

const FormGroup = styled.div``;

const Label = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.75rem;

  svg {
    width: 1rem;
    height: 1rem;
  }
`;

const SearchWrapper = styled.div`
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 1rem 1.25rem 1rem 3.25rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  color: #ffffff;
  font-size: 1.0625rem;
  transition: all 0.2s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }

  &:focus {
    outline: none;
    border-color: rgba(236, 72, 153, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }
`;

const SearchIconWrapper = styled.div`
  position: absolute;
  left: 1.125rem;
  top: 50%;
  transform: translateY(-50%);

  svg {
    width: 1.25rem;
    height: 1.25rem;
    color: rgba(255, 255, 255, 0.4);
  }
`;

const LoadingIcon = styled.div`
  position: absolute;
  right: 1.125rem;
  top: 50%;
  transform: translateY(-50%);

  svg {
    width: 1.25rem;
    height: 1.25rem;
    color: rgba(255, 255, 255, 0.4);
    animation: ${spin} 1s linear infinite;
  }
`;

const ResultsList = styled.div`
  position: absolute;
  z-index: 10;
  width: 100%;
  margin-top: 0.5rem;
  background: #1a1a28;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  overflow: hidden;
  max-height: 14rem;
  overflow-y: auto;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
`;

const ResultItem = styled.button`
  width: 100%;
  padding: 1rem 1.25rem;
  text-align: left;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #ffffff;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.15s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(236, 72, 153, 0.1);
  }
`;

const SelectedCity = styled.p`
  margin-top: 0.75rem;
  font-size: 0.9375rem;
  color: #34d399;
`;

const TextInput = styled.input`
  width: 100%;
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  color: #ffffff;
  font-size: 1rem;
  transition: all 0.2s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }

  &:focus {
    outline: none;
    border-color: rgba(236, 72, 153, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  color: #ffffff;
  font-size: 1rem;
  line-height: 1.5;
  resize: none;
  transition: all 0.2s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }

  &:focus {
    outline: none;
    border-color: rgba(236, 72, 153, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }
`;

const DateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const DateInput = styled.input`
  flex: 1;
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  color: #ffffff;
  font-size: 1rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: rgba(236, 72, 153, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }
`;

const DateSeparator = styled.span`
  color: rgba(255, 255, 255, 0.4);
  font-size: 1rem;
`;

const Footer = styled.div`
  padding: 1.75rem 2.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
`;

const FooterButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 0.875rem;
`;

const DeleteButton = styled.button`
  padding: 1rem 1.5rem;
  border-radius: 1rem;
  background: transparent;
  border: none;
  color: #f87171;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(248, 113, 113, 0.1);
  }
`;

const Spacer = styled.div`
  flex: 1;
`;

const CancelButton = styled.button`
  padding: 1rem 1.75rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.06);
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.0625rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }
`;

const SubmitButton = styled.button`
  padding: 1rem 2rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, #ec4899 0%, #d946ef 100%);
  border: none;
  color: #ffffff;
  font-size: 1.0625rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 8px 24px rgba(236, 72, 153, 0.25);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #d946ef 0%, #a855f7 100%);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

function formatDateForInput(date?: Date): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// City autocomplete component
function CityAutocomplete({
  value,
  onChange,
  onSelect,
  mapboxToken,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: GeocodingResult) => void;
  mapboxToken?: string;
}) {
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchCity = useCallback(
    async (query: string) => {
      if (!query || query.length < 2 || !mapboxToken) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            query
          )}.json?access_token=${mapboxToken}&types=neighborhood,locality,place,district,region,country&limit=8`
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
      searchCity(value);
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, searchCity]);

  return (
    <SearchWrapper>
      <SearchInput
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowResults(true);
        }}
        onFocus={() => setShowResults(true)}
        onBlur={() => {
          setTimeout(() => setShowResults(false), 200);
        }}
        placeholder="Search for a destination..."
      />
      <SearchIconWrapper>
        <Search />
      </SearchIconWrapper>
      {isLoading && (
        <LoadingIcon>
          <Loader2 />
        </LoadingIcon>
      )}

      {showResults && results.length > 0 && (
        <ResultsList>
          {results.map((result) => (
            <ResultItem
              key={result.id}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(result);
                setShowResults(false);
              }}
            >
              {result.place_name}
            </ResultItem>
          ))}
        </ResultsList>
      )}
    </SearchWrapper>
  );
}

export default function TripModal({
  trip,
  onSave,
  onDelete,
  onClose,
  mapboxToken,
}: TripModalProps) {
  const [destinationSearch, setDestinationSearch] = useState(trip?.locationName || '');
  const [formData, setFormData] = useState({
    name: trip?.name || '',
    locationName: trip?.locationName || '',
    lat: trip?.lat || 0,
    lng: trip?.lng || 0,
    description: trip?.description || '',
    notes: trip?.notes || '',
    startDate: trip?.startDate,
    endDate: trip?.endDate,
    travelers: trip?.travelers || ['angela', 'sean'], // Default both
    photoIds: trip?.photoIds || [],
  });

  const handleDestinationSelect = (result: GeocodingResult) => {
    setFormData((prev) => ({
      ...prev,
      locationName: result.place_name,
      lat: result.center[1],
      lng: result.center[0],
      // Auto-generate name if not already set
      name: prev.name || result.place_name,
    }));
    setDestinationSearch(result.place_name);
  };

  const handleSave = () => {
    if (!formData.locationName || !formData.startDate || !formData.endDate) return;

    const tripData: Omit<Trip, 'id'> = {
      name: formData.name || formData.locationName,
      locationName: formData.locationName,
      lat: formData.lat,
      lng: formData.lng,
      description: formData.description || undefined,
      notes: formData.notes || undefined,
      startDate: formData.startDate,
      endDate: formData.endDate,
      travelers: formData.travelers,
      photoIds: formData.photoIds,
    };

    onSave(tripData);
  };

  const isValid = formData.locationName && formData.startDate && formData.endDate;

  return (
    <Overlay>
      <Modal>
        <Header>
          <HeaderContent>
            <HeaderIcon>
              <MapPin />
            </HeaderIcon>
            <HeaderText>
              <Title>{trip ? 'Edit Trip' : 'Add Trip'}</Title>
              <Subtitle>Record a trip you've taken together</Subtitle>
            </HeaderText>
          </HeaderContent>
          <CloseButton onClick={onClose}>
            <X />
          </CloseButton>
        </Header>

        <Content>
          <FormGrid>
            <FormGroup>
              <Label>
                <MapPin />
                Destination
              </Label>
              <CityAutocomplete
                value={destinationSearch}
                onChange={setDestinationSearch}
                onSelect={handleDestinationSelect}
                mapboxToken={mapboxToken}
              />
              {formData.locationName && (
                <SelectedCity>Selected: {formData.locationName}</SelectedCity>
              )}
            </FormGroup>

            <FormGroup>
              <Label>Trip Name (optional)</Label>
              <TextInput
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Anniversary Trip to Paris"
              />
            </FormGroup>

            <FormGroup>
              <Label>
                <FileText />
                Description
              </Label>
              <TextArea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="What made this trip special?"
                rows={2}
              />
            </FormGroup>

            <FormGroup>
              <Label>
                <Calendar />
                Trip Dates
              </Label>
              <DateRow>
                <DateInput
                  type="date"
                  value={formatDateForInput(formData.startDate)}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      startDate: parseDateInput(e.target.value),
                    }))
                  }
                />
                <DateSeparator>to</DateSeparator>
                <DateInput
                  type="date"
                  value={formatDateForInput(formData.endDate)}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endDate: parseDateInput(e.target.value),
                    }))
                  }
                />
              </DateRow>
            </FormGroup>

            <FormGroup>
              <Label>Notes</Label>
              <TextArea
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes about the trip..."
                rows={3}
              />
            </FormGroup>
          </FormGrid>
        </Content>

        <Footer>
          <FooterButtons>
            {trip && onDelete && (
              <DeleteButton onClick={onDelete}>Delete</DeleteButton>
            )}
            <Spacer />
            <CancelButton onClick={onClose}>Cancel</CancelButton>
            <SubmitButton onClick={handleSave} disabled={!isValid}>
              {trip ? 'Save Changes' : 'Add Trip'}
            </SubmitButton>
          </FooterButtons>
        </Footer>
      </Modal>
    </Overlay>
  );
}
