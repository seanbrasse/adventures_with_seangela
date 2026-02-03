import { useState, useCallback, useRef, useEffect } from 'react';
import { X, MapPin, Plus, Trash2, Search, Loader2, Calendar, BookmarkCheck, Lightbulb, FileText } from 'lucide-react';
import type { PlannedTrip } from '../types/photo';

interface PlannedTripModalProps {
  trip?: PlannedTrip; // If provided, we're editing
  onSave: (trip: Omit<PlannedTrip, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: () => void;
  onConvertToTrip?: () => void;
  onClose: () => void;
  mapboxToken?: string;
}

interface GeocodingResult {
  id: string;
  place_name: string;
  center: [number, number];
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
    <div className="relative">
      <div className="relative">
        <input
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
          className="w-full px-4 py-3 pl-11 bg-white/[0.06] border border-white/10 rounded-xl text-white text-base placeholder-white/40 focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.08] transition-all"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
        {isLoading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 animate-spin" />
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-[#1a1a28] border border-white/10 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.id}
              className="w-full px-4 py-3.5 text-left text-white text-base hover:bg-white/[0.06] transition-colors first:rounded-t-xl last:rounded-b-xl"
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

const BOOKING_STATUSES = [
  { value: 'idea', label: 'Just an idea', icon: Lightbulb, color: 'text-yellow-400' },
  { value: 'researching', label: 'Researching', icon: Search, color: 'text-blue-400' },
  { value: 'booked', label: 'Booked', icon: BookmarkCheck, color: 'text-green-400' },
] as const;

export default function PlannedTripModal({
  trip,
  onSave,
  onDelete,
  onConvertToTrip,
  onClose,
  mapboxToken,
}: PlannedTripModalProps) {
  const [destinationSearch, setDestinationSearch] = useState(trip?.destinationName || '');
  const [formData, setFormData] = useState({
    destinationName: trip?.destinationName || '',
    lat: trip?.lat || 0,
    lng: trip?.lng || 0,
    description: trip?.description || '',
    thingsToDo: trip?.thingsToDo || [],
    potentialStartDate: trip?.potentialStartDate,
    potentialEndDate: trip?.potentialEndDate,
    bookingStatus: trip?.bookingStatus || 'idea' as const,
    notes: trip?.notes || '',
  });
  const [newTodo, setNewTodo] = useState('');

  const handleDestinationSelect = (result: GeocodingResult) => {
    setFormData((prev) => ({
      ...prev,
      destinationName: result.text,
      lat: result.center[1],
      lng: result.center[0],
    }));
    setDestinationSearch(result.place_name);
  };

  const handleAddTodo = () => {
    if (newTodo.trim()) {
      setFormData((prev) => ({
        ...prev,
        thingsToDo: [...prev.thingsToDo, newTodo.trim()],
      }));
      setNewTodo('');
    }
  };

  const handleRemoveTodo = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      thingsToDo: prev.thingsToDo.filter((_, i) => i !== index),
    }));
  };

  const handleSave = () => {
    if (!formData.destinationName || !formData.lat || !formData.lng) return;
    onSave(formData);
  };

  const isValid = formData.destinationName && formData.lat && formData.lng;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-[#12121c] rounded-3xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/8">
          <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-amber-400" />
            </div>
            {trip ? 'Edit Planned Trip' : 'Plan a Trip'}
          </h2>
          <button
            onClick={onClose}
            className="p-3 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Destination */}
          <div>
            <label className="text-white/60 text-sm mb-2 block font-medium">Destination</label>
            <CityAutocomplete
              value={destinationSearch}
              onChange={setDestinationSearch}
              onSelect={handleDestinationSelect}
              mapboxToken={mapboxToken}
            />
            {formData.destinationName && (
              <p className="text-green-400 text-sm mt-2">
                Selected: {formData.destinationName}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-white/60 text-sm mb-2 block font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="What's this trip about?"
              rows={2}
              className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white text-base placeholder-white/40 focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.08] transition-all resize-none"
            />
          </div>

          {/* Potential Dates */}
          <div>
            <label className="text-white/60 text-sm mb-2 block font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Potential Dates
            </label>
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="date"
                  value={formatDateForInput(formData.potentialStartDate)}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      potentialStartDate: parseDateInput(e.target.value),
                    }))
                  }
                  className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white text-base focus:outline-none focus:border-pink-500/50"
                />
              </div>
              <span className="text-white/40 self-center">to</span>
              <div className="flex-1">
                <input
                  type="date"
                  value={formatDateForInput(formData.potentialEndDate)}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      potentialEndDate: parseDateInput(e.target.value),
                    }))
                  }
                  className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white text-base focus:outline-none focus:border-pink-500/50"
                />
              </div>
            </div>
          </div>

          {/* Booking Status */}
          <div>
            <label className="text-white/60 text-sm mb-2 block font-medium">Status</label>
            <div className="flex gap-2">
              {BOOKING_STATUSES.map((status) => {
                const Icon = status.icon;
                const isSelected = formData.bookingStatus === status.value;
                return (
                  <button
                    key={status.value}
                    onClick={() => setFormData((prev) => ({ ...prev, bookingStatus: status.value }))}
                    className={`flex-1 px-4 py-3 rounded-xl border transition-all flex items-center justify-center gap-2 text-sm font-medium ${
                      isSelected
                        ? 'bg-white/10 border-white/20 text-white'
                        : 'bg-white/[0.03] border-white/5 text-white/50 hover:bg-white/[0.06] hover:border-white/10'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? status.color : ''}`} />
                    {status.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Things To Do */}
          <div>
            <label className="text-white/60 text-sm mb-2 block font-medium">Things to Do</label>
            <div className="space-y-2 mb-3">
              {formData.thingsToDo.map((todo, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] rounded-xl border border-white/5"
                >
                  <span className="flex-1 text-white text-sm">{todo}</span>
                  <button
                    onClick={() => handleRemoveTodo(index)}
                    className="p-1.5 text-white/40 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                placeholder="Add something to do..."
                className="flex-1 px-4 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white text-sm placeholder-white/40 focus:outline-none focus:border-pink-500/50"
              />
              <button
                onClick={handleAddTodo}
                disabled={!newTodo.trim()}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-white/60 text-sm mb-2 block font-medium">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white text-base placeholder-white/40 focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.08] transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/8">
          <div className="flex gap-3">
            {trip && onDelete && (
              <button
                onClick={onDelete}
                className="px-5 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
              >
                Delete
              </button>
            )}
            {trip && onConvertToTrip && (
              <button
                onClick={onConvertToTrip}
                className="px-5 py-3 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-xl transition-colors font-medium"
              >
                Convert to Trip
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={onClose}
              className="px-5 py-3 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/25"
            >
              {trip ? 'Save Changes' : 'Add Trip'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
