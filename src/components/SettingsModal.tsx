import { useState } from 'react';
import { X, MapPin, User, RotateCcw, Plus } from 'lucide-react';
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
    name: '',
    city: '',
    lat: 0,
    lng: 0,
    color: PRESET_COLORS[homeBases.length % PRESET_COLORS.length],
    radius: 50,
  });

  const handleAddHomeBase = () => {
    if (newHomeBase.name && newHomeBase.city) {
      onAddHomeBase({
        id: uuidv4(),
        name: newHomeBase.name,
        city: newHomeBase.city,
        lat: newHomeBase.lat || 0,
        lng: newHomeBase.lng || 0,
        color: newHomeBase.color || PRESET_COLORS[0],
        radius: newHomeBase.radius || 50,
      });
      setNewHomeBase({
        name: '',
        city: '',
        lat: 0,
        lng: 0,
        color: PRESET_COLORS[(homeBases.length + 1) % PRESET_COLORS.length],
        radius: 50,
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
              Set home locations for each person. Flight lines will be drawn from these
              locations to trip destinations.
            </p>

            <div className="space-y-3">
              {homeBases.map((homeBase) => (
                <div
                  key={homeBase.id}
                  className="bg-white/5 rounded-lg p-4"
                >
                  {editingId === homeBase.id ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-white/60 text-xs mb-1 block">Name</label>
                          <input
                            type="text"
                            value={homeBase.name}
                            onChange={(e) =>
                              onUpdateHomeBase(homeBase.id, { name: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                          />
                        </div>
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
                      </div>
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
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-white/60 text-xs mb-1 block">Radius (km)</label>
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
                        <div className="flex-1">
                          <label className="text-white/60 text-xs mb-1 block">Color</label>
                          <div className="flex gap-1 flex-wrap">
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color}
                                onClick={() =>
                                  onUpdateHomeBase(homeBase.id, { color })
                                }
                                className={`w-6 h-6 rounded-full border-2 ${
                                  homeBase.color === color
                                    ? 'border-white'
                                    : 'border-transparent'
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
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
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: homeBase.color }}
                      >
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{homeBase.name}</p>
                        <p className="text-white/60 text-sm">
                          {homeBase.city} ({homeBase.lat.toFixed(2)}, {homeBase.lng.toFixed(2)})
                        </p>
                      </div>
                      <div className="text-white/40 text-sm">Click to edit</div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add new home base */}
              {showAddForm ? (
                <div className="bg-white/5 rounded-lg p-4 border border-dashed border-white/20">
                  <div className="space-y-3">
                    <div className="flex gap-2">
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
                    </div>
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
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-white/60 text-xs mb-1 block">Color</label>
                        <div className="flex gap-1 flex-wrap">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() =>
                                setNewHomeBase((prev) => ({ ...prev, color }))
                              }
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
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="px-3 py-1 text-white/60 hover:text-white text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddHomeBase}
                        disabled={!newHomeBase.name || !newHomeBase.city}
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
