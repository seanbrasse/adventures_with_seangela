import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { X, MapPin, User, RotateCcw, Plus, Calendar, Home, Search, Loader2, LogOut } from 'lucide-react';
import styled, { keyframes } from 'styled-components';
import type { HomeBase } from '../types/photo';
import { v4 as uuidv4 } from 'uuid';

interface SettingsModalProps {
  homeBases: HomeBase[];
  onUpdateHomeBase: (id: string, updates: Partial<HomeBase>) => void;
  onAddHomeBase: (homeBase: HomeBase) => void;
  onRemoveHomeBase: (id: string) => void;
  onResetToDefaults: () => void;
  onClose: () => void;
  mapboxToken?: string;
  onLogout?: () => void;
}

// Fixed people - cannot add or remove
const PEOPLE = [
  { id: 'angela', name: 'Angela', color: '#EC4899' },
  { id: 'sean', name: 'Sean', color: '#3B82F6' },
];

interface GeocodingResult {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
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

  @media (max-width: 640px) {
    padding: 0;
    align-items: flex-end;
  }
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

  @media (max-width: 640px) {
    max-height: 95vh;
    border-radius: 1.5rem 1.5rem 0 0;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2rem 2.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);

  @media (max-width: 640px) {
    padding: 1.25rem 1.25rem;
  }
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

  @media (max-width: 640px) {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
  }
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

  @media (max-width: 640px) {
    padding: 1.25rem;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const SectionIcon = styled.div`
  width: 3rem;
  height: 3rem;
  border-radius: 1rem;
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

const ResetButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 0.875rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.15);
  }

  svg {
    width: 1rem;
    height: 1rem;
  }
`;

const SectionDescription = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
  margin-bottom: 2rem;
`;

const PersonSection = styled.div`
  margin-bottom: 2.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const PersonHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
`;

const PersonAvatar = styled.div<{ $color: string }>`
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 1rem;
  background: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px ${({ $color }) => $color}40;

  svg {
    width: 1.75rem;
    height: 1.75rem;
    color: #ffffff;
  }
`;

const PersonName = styled.span`
  font-size: 1.375rem;
  font-weight: 600;
  color: #ffffff;
`;

const HomeBasesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  margin-left: 1rem;
`;

const HomeBaseCard = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border-radius: 1.25rem;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
  }
`;

const HomeBaseDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
`;

const HomeBaseInfo = styled.div`
  flex: 1;
`;

const HomeBaseCity = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const CityName = styled.span`
  font-size: 1.0625rem;
  font-weight: 500;
  color: #ffffff;
`;

const Badge = styled.span<{ $variant: 'permanent' | 'temporary' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 500;
  background: ${({ $variant }) =>
    $variant === 'permanent' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(251, 191, 36, 0.15)'};
  color: ${({ $variant }) =>
    $variant === 'permanent' ? '#f472b6' : '#fbbf24'};

  svg {
    width: 0.875rem;
    height: 0.875rem;
  }
`;

const HomeBaseDates = styled.p`
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.4);
`;

const EditBadge = styled.span`
  padding: 0.5rem 1rem;
  border-radius: 0.625rem;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
  font-weight: 500;
`;

const AddHomeBaseCard = styled.button`
  width: 100%;
  padding: 1.5rem;
  border: 2px dashed rgba(255, 255, 255, 0.12);
  border-radius: 1.25rem;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.02);
    color: #ffffff;
  }

  svg {
    width: 1.25rem;
    height: 1.25rem;
  }
`;

const AddHomeBaseForm = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border-radius: 1.25rem;
  padding: 1.75rem;
  border: 2px dashed rgba(255, 255, 255, 0.12);
`;

const FormTitle = styled.h4`
  font-size: 1.125rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 1.5rem;
`;

const FormGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const FormGroup = styled.div``;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.625rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.875rem 1.125rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.875rem;
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

const Select = styled.select`
  width: 100%;
  padding: 0.875rem 1.125rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.875rem;
  color: #ffffff;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: rgba(236, 72, 153, 0.5);
  }

  option {
    background: #1a1a28;
    color: #ffffff;
  }
`;

const DateRow = styled.div`
  display: flex;
  gap: 1rem;
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const CancelButton = styled.button`
  padding: 0.875rem 1.5rem;
  border-radius: 0.875rem;
  background: rgba(255, 255, 255, 0.06);
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }
`;

const SubmitButton = styled.button`
  padding: 0.875rem 1.5rem;
  border-radius: 0.875rem;
  background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
  border: none;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 8px 24px rgba(236, 72, 153, 0.25);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #db2777 0%, #be185d 100%);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DeleteButton = styled.button`
  padding: 0.875rem 1.5rem;
  border-radius: 0.875rem;
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

const Footer = styled.div`
  padding: 1.75rem 2.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  @media (max-width: 640px) {
    padding: 1rem 1.25rem;
  }
`;

const DoneButton = styled.button`
  width: 100%;
  padding: 1.125rem 2rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
  border: none;
  color: #ffffff;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 8px 24px rgba(236, 72, 153, 0.3);

  &:hover {
    background: linear-gradient(135deg, #db2777 0%, #be185d 100%);
    transform: translateY(-1px);
  }
`;

const SignOutSection = styled.div`
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
`;

const SignOutButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border-radius: 0.875rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.8);
    border-color: rgba(255, 255, 255, 0.15);
  }

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
  padding: 0.875rem 1.125rem 0.875rem 3rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.875rem;
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

const SearchIcon = styled.div`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);

  svg {
    width: 1.125rem;
    height: 1.125rem;
    color: rgba(255, 255, 255, 0.4);
  }
`;

const LoadingIcon = styled.div`
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);

  svg {
    width: 1.125rem;
    height: 1.125rem;
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
  border-radius: 0.875rem;
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
  font-size: 0.9375rem;
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
  margin-top: 0.625rem;
  font-size: 0.875rem;
  color: #34d399;
`;

const CurrentCity = styled.p`
  margin-top: 0.625rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.4);
`;

function formatDateForInput(date?: Date): string {
  if (!date) return '';
  // Format as local date to avoid timezone shift
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string): Date | undefined {
  if (!value) return undefined;
  // Parse as local date to avoid timezone shift
  // Input format is "YYYY-MM-DD"
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// City autocomplete component using Mapbox Geocoding API
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
          )}.json?access_token=${mapboxToken}&types=neighborhood,locality,place,district,region&limit=8`
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
        placeholder="Search for a neighborhood or city..."
      />
      <SearchIcon>
        <Search />
      </SearchIcon>
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

export default function SettingsModal({
  homeBases,
  onUpdateHomeBase,
  onAddHomeBase,
  onRemoveHomeBase,
  onResetToDefaults,
  onClose,
  mapboxToken,
  onLogout,
}: SettingsModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingForPerson, setAddingForPerson] = useState<string | null>(null);
  const [newCitySearch, setNewCitySearch] = useState('');
  const [newHomeBase, setNewHomeBase] = useState<{
    city: string;
    lat: number;
    lng: number;
    isPermanent: boolean;
    startDate?: Date;
    endDate?: Date;
  }>({
    city: '',
    lat: 0,
    lng: 0,
    isPermanent: false,
  });

  // Group home bases by person
  const groupedHomeBases = useMemo(() => {
    const groups: Record<string, HomeBase[]> = {};
    for (const person of PEOPLE) {
      groups[person.id] = homeBases
        .filter((hb) => hb.personId === person.id)
        .sort((a, b) => {
          if (a.isPermanent && !b.isPermanent) return -1;
          if (!a.isPermanent && b.isPermanent) return 1;
          if (a.startDate && b.startDate) {
            return a.startDate.getTime() - b.startDate.getTime();
          }
          return 0;
        });
    }
    return groups;
  }, [homeBases]);

  const handleAddHomeBase = (personId: string) => {
    if (!newHomeBase.city) return;

    const person = PEOPLE.find((p) => p.id === personId);
    if (!person) return;

    onAddHomeBase({
      id: uuidv4(),
      personId,
      name: person.name,
      city: newHomeBase.city,
      lat: newHomeBase.lat,
      lng: newHomeBase.lng,
      color: person.color,
      radius: 40,
      isPermanent: newHomeBase.isPermanent,
      startDate: newHomeBase.isPermanent ? undefined : newHomeBase.startDate,
      endDate: newHomeBase.isPermanent ? undefined : newHomeBase.endDate,
    });

    // Reset form
    setNewHomeBase({
      city: '',
      lat: 0,
      lng: 0,
      isPermanent: false,
    });
    setNewCitySearch('');
    setAddingForPerson(null);
  };

  const handleCitySelect = (result: GeocodingResult) => {
    setNewHomeBase((prev) => ({
      ...prev,
      city: result.text,
      lng: result.center[0],
      lat: result.center[1],
    }));
    setNewCitySearch(result.place_name);
  };

  const handleEditCitySelect = (homeBaseId: string, result: GeocodingResult) => {
    onUpdateHomeBase(homeBaseId, {
      city: result.text,
      lng: result.center[0],
      lat: result.center[1],
    });
  };

  return (
    <Overlay>
      <Modal>
        <Header>
          <HeaderContent>
            <Title>Settings</Title>
            <Subtitle>Manage your home locations and preferences</Subtitle>
          </HeaderContent>
          <CloseButton onClick={onClose}>
            <X />
          </CloseButton>
        </Header>

        <Content>
          <SectionHeader>
            <SectionTitle>
              <SectionIcon>
                <MapPin />
              </SectionIcon>
              Home Bases
            </SectionTitle>
            <ResetButton onClick={onResetToDefaults}>
              <RotateCcw />
              Reset
            </ResetButton>
          </SectionHeader>

          <SectionDescription>
            Manage home locations for each person. Temporary homes override permanent ones during their active dates.
          </SectionDescription>

          {PEOPLE.map((person) => (
            <PersonSection key={person.id}>
              <PersonHeader>
                <PersonAvatar $color={person.color}>
                  <User />
                </PersonAvatar>
                <PersonName>{person.name}</PersonName>
              </PersonHeader>

              <HomeBasesList>
                {groupedHomeBases[person.id]?.map((homeBase) => (
                  <HomeBaseCard key={homeBase.id}>
                    {editingId === homeBase.id ? (
                      <EditHomeBaseForm
                        homeBase={homeBase}
                        mapboxToken={mapboxToken}
                        onUpdate={(updates) => onUpdateHomeBase(homeBase.id, updates)}
                        onCitySelect={(result) => handleEditCitySelect(homeBase.id, result)}
                        onDelete={() => {
                          onRemoveHomeBase(homeBase.id);
                          setEditingId(null);
                        }}
                        onDone={() => setEditingId(null)}
                        canDelete={!homeBase.isPermanent || groupedHomeBases[person.id].length > 1}
                      />
                    ) : (
                      <HomeBaseDisplay onClick={() => setEditingId(homeBase.id)}>
                        <HomeBaseInfo>
                          <HomeBaseCity>
                            <CityName>{homeBase.city}</CityName>
                            {homeBase.isPermanent ? (
                              <Badge $variant="permanent">
                                <Home />
                                Permanent
                              </Badge>
                            ) : (
                              <Badge $variant="temporary">
                                <Calendar />
                                Temporary
                              </Badge>
                            )}
                          </HomeBaseCity>
                          {!homeBase.isPermanent && homeBase.startDate && homeBase.endDate && (
                            <HomeBaseDates>
                              {homeBase.startDate.toLocaleDateString()} - {homeBase.endDate.toLocaleDateString()}
                            </HomeBaseDates>
                          )}
                        </HomeBaseInfo>
                        <EditBadge>Edit</EditBadge>
                      </HomeBaseDisplay>
                    )}
                  </HomeBaseCard>
                ))}

                {addingForPerson === person.id ? (
                  <AddHomeBaseForm>
                    <FormTitle>Add Home Base</FormTitle>
                    <FormGrid>
                      <FormGroup>
                        <Label>City</Label>
                        <CityAutocomplete
                          value={newCitySearch}
                          onChange={setNewCitySearch}
                          onSelect={handleCitySelect}
                          mapboxToken={mapboxToken}
                        />
                        {newHomeBase.city && (
                          <SelectedCity>
                            Selected: {newHomeBase.city} ({newHomeBase.lat.toFixed(4)}, {newHomeBase.lng.toFixed(4)})
                          </SelectedCity>
                        )}
                      </FormGroup>

                      <FormGroup>
                        <Label>Type</Label>
                        <Select
                          value={newHomeBase.isPermanent ? 'permanent' : 'temporary'}
                          onChange={(e) =>
                            setNewHomeBase((prev) => ({
                              ...prev,
                              isPermanent: e.target.value === 'permanent',
                            }))
                          }
                        >
                          <option value="temporary">Temporary</option>
                          <option value="permanent">Permanent</option>
                        </Select>
                      </FormGroup>

                      {!newHomeBase.isPermanent && (
                        <DateRow>
                          <FormGroup style={{ flex: 1 }}>
                            <Label>Start Date</Label>
                            <Input
                              type="date"
                              value={formatDateForInput(newHomeBase.startDate)}
                              onChange={(e) =>
                                setNewHomeBase((prev) => ({
                                  ...prev,
                                  startDate: parseDateInput(e.target.value),
                                }))
                              }
                            />
                          </FormGroup>
                          <FormGroup style={{ flex: 1 }}>
                            <Label>End Date</Label>
                            <Input
                              type="date"
                              value={formatDateForInput(newHomeBase.endDate)}
                              onChange={(e) =>
                                setNewHomeBase((prev) => ({
                                  ...prev,
                                  endDate: parseDateInput(e.target.value),
                                }))
                              }
                            />
                          </FormGroup>
                        </DateRow>
                      )}

                      <FormActions>
                        <CancelButton
                          onClick={() => {
                            setAddingForPerson(null);
                            setNewCitySearch('');
                            setNewHomeBase({
                              city: '',
                              lat: 0,
                              lng: 0,
                              isPermanent: false,
                            });
                          }}
                        >
                          Cancel
                        </CancelButton>
                        <SubmitButton
                          onClick={() => handleAddHomeBase(person.id)}
                          disabled={!newHomeBase.city}
                        >
                          Add Home Base
                        </SubmitButton>
                      </FormActions>
                    </FormGrid>
                  </AddHomeBaseForm>
                ) : (
                  <AddHomeBaseCard onClick={() => setAddingForPerson(person.id)}>
                    <Plus />
                    Add Home Base for {person.name}
                  </AddHomeBaseCard>
                )}
              </HomeBasesList>
            </PersonSection>
          ))}

          {onLogout && (
            <SignOutSection>
              <SignOutButton onClick={onLogout}>
                <LogOut />
                Sign Out
              </SignOutButton>
            </SignOutSection>
          )}
        </Content>

        <Footer>
          <DoneButton onClick={onClose}>Done</DoneButton>
        </Footer>
      </Modal>
    </Overlay>
  );
}

// Separate component for editing a home base
function EditHomeBaseForm({
  homeBase,
  mapboxToken,
  onUpdate,
  onCitySelect,
  onDelete,
  onDone,
  canDelete,
}: {
  homeBase: HomeBase;
  mapboxToken?: string;
  onUpdate: (updates: Partial<HomeBase>) => void;
  onCitySelect: (result: GeocodingResult) => void;
  onDelete: () => void;
  onDone: () => void;
  canDelete: boolean;
}) {
  const [citySearch, setCitySearch] = useState(homeBase.city);

  return (
    <FormGrid>
      <FormGroup>
        <Label>City</Label>
        <CityAutocomplete
          value={citySearch}
          onChange={setCitySearch}
          onSelect={(result) => {
            onCitySelect(result);
            setCitySearch(result.text);
          }}
          mapboxToken={mapboxToken}
        />
        <CurrentCity>
          Current: {homeBase.city} ({homeBase.lat.toFixed(4)}, {homeBase.lng.toFixed(4)})
        </CurrentCity>
      </FormGroup>

      <FormGroup>
        <Label>Type</Label>
        <Select
          value={homeBase.isPermanent ? 'permanent' : 'temporary'}
          onChange={(e) =>
            onUpdate({
              isPermanent: e.target.value === 'permanent',
              startDate: e.target.value === 'permanent' ? undefined : homeBase.startDate,
              endDate: e.target.value === 'permanent' ? undefined : homeBase.endDate,
            })
          }
        >
          <option value="temporary">Temporary</option>
          <option value="permanent">Permanent</option>
        </Select>
      </FormGroup>

      {!homeBase.isPermanent && (
        <DateRow>
          <FormGroup style={{ flex: 1 }}>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={formatDateForInput(homeBase.startDate)}
              onChange={(e) =>
                onUpdate({ startDate: parseDateInput(e.target.value) })
              }
            />
          </FormGroup>
          <FormGroup style={{ flex: 1 }}>
            <Label>End Date</Label>
            <Input
              type="date"
              value={formatDateForInput(homeBase.endDate)}
              onChange={(e) =>
                onUpdate({ endDate: parseDateInput(e.target.value) })
              }
            />
          </FormGroup>
        </DateRow>
      )}

      <FormGroup>
        <Label>Radius (km)</Label>
        <Input
          type="number"
          value={homeBase.radius}
          onChange={(e) => onUpdate({ radius: parseInt(e.target.value) || 40 })}
        />
      </FormGroup>

      <FormActions style={{ justifyContent: 'space-between' }}>
        {canDelete ? (
          <DeleteButton onClick={onDelete}>Delete</DeleteButton>
        ) : (
          <div />
        )}
        <SubmitButton onClick={onDone}>Done</SubmitButton>
      </FormActions>
    </FormGrid>
  );
}
