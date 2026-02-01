import { useState, useEffect, useCallback } from 'react';
import type { AppSettings, HomeBase } from '../types/photo';
import { DEFAULT_HOME_BASES } from '../types/photo';

const SETTINGS_KEY = 'photo-map-settings';

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
        const parsed = JSON.parse(stored);
        setSettings(parsed);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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
