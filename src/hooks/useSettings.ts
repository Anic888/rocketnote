import { useState, useEffect, useCallback, useRef } from 'react';
import { EditorSettings } from '../types';

const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 14,
  tabSize: 4,
  wordWrap: 'off',
  minimap: true,
  lineNumbers: 'on',
  theme: 'dark',
  themeStyle: 'dark-glass',
  colorMode: 'dark',
  accentColor: 'indigo',
  autoSave: false,
  autoSaveDelay: 5000,
  fontFamily: "'SF Mono', 'Monaco', 'Menlo', 'Courier New', monospace",
  bracketPairColorization: true,
  stickyScroll: true,
  formatOnSave: true,
};

function resolveTheme(colorMode: string): 'dark' | 'light' {
  if (colorMode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return colorMode as 'dark' | 'light';
}

export function useSettings() {
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef(settings);

  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('notepad-settings');
    if (saved) {
      setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
    }
  }, []);

  // Apply all theme attributes
  useEffect(() => {
    const resolved = resolveTheme(settings.colorMode);
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-theme-style', settings.themeStyle);
    document.documentElement.setAttribute('data-accent', settings.accentColor);
    // Keep settings.theme in sync for backward compat
    if (settings.theme !== resolved) {
      setSettings(prev => ({ ...prev, theme: resolved }));
    }
  }, [settings.colorMode, settings.themeStyle, settings.accentColor]);

  // Listen for system color scheme changes
  useEffect(() => {
    if (settings.colorMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const resolved = mq.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', resolved);
      setSettings(prev => ({ ...prev, theme: resolved }));
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.colorMode]);

  const updateSettings = useCallback((newSettings: Partial<EditorSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('notepad-settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { settings, settingsRef, updateSettings };
}
