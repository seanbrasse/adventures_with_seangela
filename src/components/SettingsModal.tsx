import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { X, MapPin, User, RotateCcw, Plus, Calendar, Home, Search, Loader2 } from 'lucide-react';
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
}

// Fixed people - cannot add or remove
const PEOPLE = [
  { id: 'sean', name: 'Sean', color: '#3B82F6' },
  { id: 'angela', name: 'Angela', color: '#EC4899' },
];

interface GeocodingResult {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  text: string;
}

function formatDateForInput(date?: Date): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

function parseDateInput(value: string): Date | undefined {
  if (!value) return undefined;
  return new Date(value);
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
  const inputRef = useRef<HTMLInputElement>(null);

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
          )}.json?access_token=${mapboxToken}&types=place,locality,region&limit=5`
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
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          onBlur={() => {
            // Delay hiding to allow click on result
            setTimeout(() => setShowResults(false), 200);
          }}
          placeholder="Search for a city..."
          className="w-full px-3 py-2 pl-9 bg-white/10 border border-white/20 rounded text-white text-sm placeholder-white/40"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 animate-spin" />
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-white/20 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.id}
              className="w-full px-3 py-2 text-left text-white text-sm hover:bg-white/10 transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(result);
                setShowResults(false);
              }}
            >
              {result.place_name}
            </button>
          ))}
        </div>
      )}
    </div>
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
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-pink-400" />
                Home Bases
              </h3>
              <button
                onClick={onResetToDefaults}
                className="flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
            <p className="text-white/60 text-sm mb-4">
              Manage home locations for each person. Temporary homes override permanent ones during their active dates.
            </p>

            {/* People sections */}
            {PEOPLE.map((person) => (
              <div key={person.id} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: person.color }}
                  >
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-medium text-lg">{person.name}</span>
                </div>

                <div className="space-y-2 ml-10">
                  {groupedHomeBases[person.id]?.map((homeBase) => (
                    <div
                      key={homeBase.id}
                      className="bg-white/5 rounded-lg p-3"
                    >
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
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => setEditingId(homeBase.id)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-white text-sm font-medium">{homeBase.city}</span>
                              {homeBase.isPermanent ? (
                                <span className="text-xs px-2 py-0.5 bg-pink-500/20 text-pink-300 rounded-full flex items-center gap-1">
                                  <Home className="w-3 h-3" />
                                  Permanent
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Temporary
                                </span>
                              )}
                            </div>
                            {!homeBase.isPermanent && homeBase.startDate && homeBase.endDate && (
                              <p className="text-white/50 text-xs mt-1">
                                {homeBase.startDate.toLocaleDateString()} - {homeBase.endDate.toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <span className="text-white/40 text-xs">Edit</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add home base form for this person */}
                  {addingForPerson === person.id ? (
                    <div className="bg-white/5 rounded-lg p-3 border border-dashed border-white/20">
                      <h4 className="text-white text-sm font-medium mb-3">Add Home Base</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-white/60 text-xs mb-1 block">City</label>
                          <CityAutocomplete
                            value={newCitySearch}
                            onChange={setNewCitySearch}
                            onSelect={handleCitySelect}
                            mapboxToken={mapboxToken}
                          />
                          {newHomeBase.city && (
                            <p className="text-green-400 text-xs mt-1">
                              Selected: {newHomeBase.city} ({newHomeBase.lat.toFixed(4)}, {newHomeBase.lng.toFixed(4)})
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="text-white/60 text-xs mb-1 block">Type</label>
                          <select
                            value={newHomeBase.isPermanent ? 'permanent' : 'temporary'}
                            onChange={(e) =>
                              setNewHomeBase((prev) => ({
                                ...prev,
                                isPermanent: e.target.value === 'permanent',
                              }))
                            }
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                          >
                            <option value="temporary">Temporary</option>
                            <option value="permanent">Permanent</option>
                          </select>
                        </div>

                        {!newHomeBase.isPermanent && (
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-white/60 text-xs mb-1 block">Start Date</label>
                              <input
                                type="date"
                                value={formatDateForInput(newHomeBase.startDate)}
                                onChange={(e) =>
                                  setNewHomeBase((prev) => ({
                                    ...prev,
                                    startDate: parseDateInput(e.target.value),
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-white/60 text-xs mb-1 block">End Date</label>
                              <input
                                type="date"
                                value={formatDateForInput(newHomeBase.endDate)}
                                onChange={(e) =>
                                  setNewHomeBase((prev) => ({
                                    ...prev,
                                    endDate: parseDateInput(e.target.value),
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <button
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
                            className="px-3 py-1.5 text-white/60 hover:text-white text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleAddHomeBase(person.id)}
                            disabled={!newHomeBase.city}
                            className="px-3 py-1.5 bg-pink-500 text-white rounded text-sm hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingForPerson(person.id)}
                      className="w-full p-3 border border-dashed border-white/20 rounded-lg text-white/60 hover:text-white hover:border-white/40 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Home Base for {person.name}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
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
    <div className="space-y-3">
      <div>
        <label className="text-white/60 text-xs mb-1 block">City</label>
        <CityAutocomplete
          value={citySearch}
          onChange={setCitySearch}
          onSelect={(result) => {
            onCitySelect(result);
            setCitySearch(result.text);
          }}
          mapboxToken={mapboxToken}
        />
        <p className="text-white/50 text-xs mt-1">
          Current: {homeBase.city} ({homeBase.lat.toFixed(4)}, {homeBase.lng.toFixed(4)})
        </p>
      </div>

      <div>
        <label className="text-white/60 text-xs mb-1 block">Type</label>
        <select
          value={homeBase.isPermanent ? 'permanent' : 'temporary'}
          onChange={(e) =>
            onUpdate({
              isPermanent: e.target.value === 'permanent',
              startDate: e.target.value === 'permanent' ? undefined : homeBase.startDate,
              endDate: e.target.value === 'permanent' ? undefined : homeBase.endDate,
            })
          }
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
        >
          <option value="temporary">Temporary</option>
          <option value="permanent">Permanent</option>
        </select>
      </div>

      {!homeBase.isPermanent && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-white/60 text-xs mb-1 block">Start Date</label>
            <input
              type="date"
              value={formatDateForInput(homeBase.startDate)}
              onChange={(e) =>
                onUpdate({ startDate: parseDateInput(e.target.value) })
              }
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-white/60 text-xs mb-1 block">End Date</label>
            <input
              type="date"
              value={formatDateForInput(homeBase.endDate)}
              onChange={(e) =>
                onUpdate({ endDate: parseDateInput(e.target.value) })
              }
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-white/60 text-xs mb-1 block">Radius (km)</label>
          <input
            type="number"
            value={homeBase.radius}
            onChange={(e) => onUpdate({ radius: parseInt(e.target.value) || 40 })}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
          />
        </div>
      </div>

      <div className="flex justify-between pt-2">
        {canDelete ? (
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-red-400 hover:text-red-300 text-sm"
          >
            Delete
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={onDone}
          className="px-4 py-1.5 bg-pink-500 text-white rounded text-sm hover:bg-pink-600"
        >
          Done
        </button>
      </div>
    </div>
  );
}
