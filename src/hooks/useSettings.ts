import { useState, useEffect, useCallback } from 'react';
import type { AppSettings, HomeBase } from '../types/photo';
import { DEFAULT_HOME_BASES } from '../types/photo';

const SETTINGS_KEY = 'photo-map-settings';
const SETTINGS_VERSION = 2; // Bump this when schema changes

// Stored home base with dates as strings
interface StoredHomeBase extends Omit<HomeBase, 'startDate' | 'endDate'> {
  startDate?: string;
  endDate?: string;
}

interface StoredSettings {
  version?: number;
  homeBases: StoredHomeBase[];
}

// Convert stored home base to runtime format
function parseHomeBase(stored: StoredHomeBase): HomeBase {
  return {
    ...stored,
    startDate: stored.startDate ? new Date(stored.startDate) : undefined,
    endDate: stored.endDate ? new Date(stored.endDate) : undefined,
  };
}

// Convert runtime home base to stored format
function serializeHomeBase(hb: HomeBase): StoredHomeBase {
  return {
    ...hb,
    startDate: hb.startDate?.toISOString(),
    endDate: hb.endDate?.toISOString(),
  };
}

// Check if stored data is valid (has required fields)
function isValidStoredData(parsed: StoredSettings): boolean {
  if (!parsed.homeBases || !Array.isArray(parsed.homeBases)) return false;
  // Check if all home bases have the new schema fields
  return parsed.homeBases.every(
    (hb) => hb.personId && typeof hb.personId === 'string'
  );
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    homeBases: DEFAULT_HOME_BASES,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed: StoredSettings = JSON.parse(stored);
        // Check version and validity - if old schema, reset to defaults
        if (parsed.version !== SETTINGS_VERSION || !isValidStoredData(parsed)) {
          console.log('Settings schema changed, resetting to defaults');
          localStorage.removeItem(SETTINGS_KEY);
          // Keep defaults
        } else {
          setSettings({
            homeBases: parsed.homeBases.map(parseHomeBase),
          });
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      localStorage.removeItem(SETTINGS_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        const toStore: StoredSettings = {
          version: SETTINGS_VERSION,
          homeBases: settings.homeBases.map(serializeHomeBase),
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(toStore));
      } catch (error) {
        console.error('Error saving settings:', error);
      }
    }
  }, [settings, isLoading]);

  const updateHomeBase = useCallback((id: string, updates: Partial<HomeBase>) => {
    setSettings((prev) => ({
      ...prev,
      homeBases: prev.homeBases.map((hb) =>
        hb.id === id ? { ...hb, ...updates } : hb
      ),
    }));
  }, []);

  const addHomeBase = useCallback((homeBase: HomeBase) => {
    setSettings((prev) => ({
      ...prev,
      homeBases: [...prev.homeBases, homeBase],
    }));
  }, []);

  const removeHomeBase = useCallback((id: string) => {
    setSettings((prev) => ({
      ...prev,
      homeBases: prev.homeBases.filter((hb) => hb.id !== id),
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings({ homeBases: DEFAULT_HOME_BASES });
  }, []);

  return {
    settings,
    isLoading,
    updateHomeBase,
    addHomeBase,
    removeHomeBase,
    resetToDefaults,
  };
}
