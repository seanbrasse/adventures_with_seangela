import { useState, useMemo } from 'react';
import { X, MapPin, User, RotateCcw, Plus, Calendar, Home } from 'lucide-react';
import type { HomeBase } from '../types/photo';
import { v4 as uuidv4 } from 'uuid';

interface SettingsModalProps {
  homeBases: HomeBase[];
  onUpdateHomeBase: (id: string, updates: Partial<HomeBase>) => void;
  onAddHomeBase: (homeBase: HomeBase) => void;
  onRemoveHomeBase: (id: string) => void;
  onResetToDefaults: () => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

function formatDateForInput(date?: Date): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

function parseDateInput(value: string): Date | undefined {
  if (!value) return undefined;
  return new Date(value);
}

export default function SettingsModal({
  homeBases,
  onUpdateHomeBase,
  onAddHomeBase,
  onRemoveHomeBase,
  onResetToDefaults,
  onClose,
}: SettingsModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHomeBase, setNewHomeBase] = useState<Partial<HomeBase>>({
    personId: '',
    name: '',
    city: '',
    lat: 0,
    lng: 0,
    color: PRESET_COLORS[0],
    radius: 50,
    isPermanent: false,
  });

  // Group home bases by person
  const groupedHomeBases = useMemo(() => {
    const groups: Record<string, HomeBase[]> = {};
    for (const hb of homeBases) {
      if (!groups[hb.personId]) {
        groups[hb.personId] = [];
      }
      groups[hb.personId].push(hb);
    }
    // Sort each group: permanent first, then by start date
    for (const personId of Object.keys(groups)) {
      groups[personId].sort((a, b) => {
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

  // Get unique people
  const people = useMemo(() => {
    const uniquePeople: { id: string; name: string; color: string }[] = [];
    const seen = new Set<string>();
    for (const hb of homeBases) {
      if (!seen.has(hb.personId)) {
        seen.add(hb.personId);
        uniquePeople.push({ id: hb.personId, name: hb.name, color: hb.color });
      }
    }
    return uniquePeople;
  }, [homeBases]);

  const handleAddHomeBase = () => {
    if (newHomeBase.name && newHomeBase.city && newHomeBase.personId) {
      onAddHomeBase({
        id: uuidv4(),
        personId: newHomeBase.personId,
        name: newHomeBase.name,
        city: newHomeBase.city,
        lat: newHomeBase.lat || 0,
        lng: newHomeBase.lng || 0,
        color: newHomeBase.color || PRESET_COLORS[0],
        radius: newHomeBase.radius || 50,
        isPermanent: newHomeBase.isPermanent,
        startDate: newHomeBase.startDate,
        endDate: newHomeBase.endDate,
      });
      setNewHomeBase({
        personId: '',
        name: '',
        city: '',
        lat: 0,
        lng: 0,
        color: PRESET_COLORS[0],
        radius: 50,
        isPermanent: false,
      });
      setShowAddForm(false);
    }
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
              Set home locations for each person. Temporary homes override permanent ones during their active dates.
            </p>

            {/* Group by person */}
            {Object.entries(groupedHomeBases).map(([personId, personHomeBases]) => (
              <div key={personId} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: personHomeBases[0]?.color }}
                  >
                    <User className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-white font-medium">{personHomeBases[0]?.name}</span>
                </div>

                <div className="space-y-2 ml-8">
                  {personHomeBases.map((homeBase) => (
                    <div
                      key={homeBase.id}
                      className="bg-white/5 rounded-lg p-3"
                    >
                      {editingId === homeBase.id ? (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-white/60 text-xs mb-1 block">City</label>
                              <input
                                type="text"
                                value={homeBase.city}
                                onChange={(e) =>
                                  onUpdateHomeBase(homeBase.id, { city: e.target.value })
                                }
                                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                              />
                            </div>
                            <div className="w-24">
                              <label className="text-white/60 text-xs mb-1 block">Type</label>
                              <select
                                value={homeBase.isPermanent ? 'permanent' : 'temporary'}
                                onChange={(e) =>
                                  onUpdateHomeBase(homeBase.id, {
                                    isPermanent: e.target.value === 'permanent',
                                    startDate: e.target.value === 'permanent' ? undefined : homeBase.startDate,
                                    endDate: e.target.value === 'permanent' ? undefined : homeBase.endDate,
                                  })
                                }
                                className="w-full px-2 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                              >
                                <option value="permanent">Permanent</option>
                                <option value="temporary">Temporary</option>
                              </select>
                            </div>
                          </div>

                          {!homeBase.isPermanent && (
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="text-white/60 text-xs mb-1 block">Start Date</label>
                                <input
                                  type="date"
                                  value={formatDateForInput(homeBase.startDate)}
                                  onChange={(e) =>
                                    onUpdateHomeBase(homeBase.id, {
                                      startDate: parseDateInput(e.target.value),
                                    })
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
                                    onUpdateHomeBase(homeBase.id, {
                                      endDate: parseDateInput(e.target.value),
                                    })
                                  }
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-white/60 text-xs mb-1 block">Latitude</label>
                              <input
                                type="number"
                                step="any"
                                value={homeBase.lat}
                                onChange={(e) =>
                                  onUpdateHomeBase(homeBase.id, {
                                    lat: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-white/60 text-xs mb-1 block">Longitude</label>
                              <input
                                type="number"
                                step="any"
                                value={homeBase.lng}
                                onChange={(e) =>
                                  onUpdateHomeBase(homeBase.id, {
                                    lng: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                              />
                            </div>
                            <div className="w-20">
                              <label className="text-white/60 text-xs mb-1 block">Radius</label>
                              <input
                                type="number"
                                value={homeBase.radius}
                                onChange={(e) =>
                                  onUpdateHomeBase(homeBase.id, {
                                    radius: parseInt(e.target.value) || 50,
                                  })
                                }
                                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                              />
                            </div>
                          </div>

                          <div className="flex justify-between">
                            <button
                              onClick={() => onRemoveHomeBase(homeBase.id)}
                              className="px-3 py-1 text-red-400 hover:text-red-300 text-sm"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1 bg-pink-500 text-white rounded text-sm hover:bg-pink-600"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => setEditingId(homeBase.id)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-white text-sm">{homeBase.city}</span>
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
                </div>
              </div>
            ))}

            {/* Add new home base */}
            {showAddForm ? (
              <div className="bg-white/5 rounded-lg p-4 border border-dashed border-white/20">
                <h4 className="text-white text-sm font-medium mb-3">Add Home Base</h4>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-white/60 text-xs mb-1 block">Person</label>
                      <select
                        value={newHomeBase.personId}
                        onChange={(e) => {
                          const person = people.find((p) => p.id === e.target.value);
                          setNewHomeBase((prev) => ({
                            ...prev,
                            personId: e.target.value,
                            name: person?.name || prev.name,
                            color: person?.color || prev.color,
                          }));
                        }}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                      >
                        <option value="">Select person...</option>
                        {people.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name}
                          </option>
                        ))}
                        <option value="new">+ New person</option>
                      </select>
                    </div>
                    {newHomeBase.personId === 'new' && (
                      <div className="flex-1">
                        <label className="text-white/60 text-xs mb-1 block">Name</label>
                        <input
                          type="text"
                          value={newHomeBase.name}
                          onChange={(e) =>
                            setNewHomeBase((prev) => ({ ...prev, name: e.target.value }))
                          }
                          placeholder="Person's name"
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-white/60 text-xs mb-1 block">City</label>
                      <input
                        type="text"
                        value={newHomeBase.city}
                        onChange={(e) =>
                          setNewHomeBase((prev) => ({ ...prev, city: e.target.value }))
                        }
                        placeholder="City name"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                      />
                    </div>
                    <div className="w-28">
                      <label className="text-white/60 text-xs mb-1 block">Type</label>
                      <select
                        value={newHomeBase.isPermanent ? 'permanent' : 'temporary'}
                        onChange={(e) =>
                          setNewHomeBase((prev) => ({
                            ...prev,
                            isPermanent: e.target.value === 'permanent',
                          }))
                        }
                        className="w-full px-2 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                      >
                        <option value="permanent">Permanent</option>
                        <option value="temporary">Temporary</option>
                      </select>
                    </div>
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

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-white/60 text-xs mb-1 block">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={newHomeBase.lat}
                        onChange={(e) =>
                          setNewHomeBase((prev) => ({
                            ...prev,
                            lat: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-white/60 text-xs mb-1 block">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={newHomeBase.lng}
                        onChange={(e) =>
                          setNewHomeBase((prev) => ({
                            ...prev,
                            lng: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                      />
                    </div>
                  </div>

                  {newHomeBase.personId === 'new' && (
                    <div>
                      <label className="text-white/60 text-xs mb-1 block">Color</label>
                      <div className="flex gap-1 flex-wrap">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => setNewHomeBase((prev) => ({ ...prev, color }))}
                            className={`w-6 h-6 rounded-full border-2 ${
                              newHomeBase.color === color
                                ? 'border-white'
                                : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1 text-white/60 hover:text-white text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        // If new person, generate a new personId
                        if (newHomeBase.personId === 'new') {
                          const newPersonId = uuidv4();
                          onAddHomeBase({
                            id: uuidv4(),
                            personId: newPersonId,
                            name: newHomeBase.name || '',
                            city: newHomeBase.city || '',
                            lat: newHomeBase.lat || 0,
                            lng: newHomeBase.lng || 0,
                            color: newHomeBase.color || PRESET_COLORS[0],
                            radius: newHomeBase.radius || 50,
                            isPermanent: newHomeBase.isPermanent,
                            startDate: newHomeBase.startDate,
                            endDate: newHomeBase.endDate,
                          });
                        } else {
                          handleAddHomeBase();
                        }
                        setNewHomeBase({
                          personId: '',
                          name: '',
                          city: '',
                          lat: 0,
                          lng: 0,
                          color: PRESET_COLORS[0],
                          radius: 50,
                          isPermanent: false,
                        });
                        setShowAddForm(false);
                      }}
                      disabled={
                        !newHomeBase.city ||
                        (!newHomeBase.personId || (newHomeBase.personId === 'new' && !newHomeBase.name))
                      }
                      className="px-3 py-1 bg-pink-500 text-white rounded text-sm hover:bg-pink-600 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full p-4 border border-dashed border-white/20 rounded-lg text-white/60 hover:text-white hover:border-white/40 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Home Base
              </button>
            )}
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
