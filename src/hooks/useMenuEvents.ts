import { useEffect } from 'react';
import { ask, confirm } from '@tauri-apps/api/dialog';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { Tab, EditorSettings, PanelType } from '../types';
import { detectLanguage } from '../utils';

interface UseMenuEventsParams {
  activeTab: Tab | null;
  activeTabId: string | null;
  tabs: Tab[];
  settings: EditorSettings;
  createNewTab: (path?: string | null, content?: string, name?: string) => string;
  openFile: (filePath?: string) => void;
  openFolder: () => void;
  saveFile: (tab: Tab, saveAs?: boolean) => void;
  closeTab: (tabId: string) => void;
  togglePanel: (panel: PanelType) => void;
  updateSettings: (newSettings: Partial<EditorSettings>) => void;
  setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
  setActiveTabId: (id: string | null) => void;
  setSplitView: React.Dispatch<React.SetStateAction<boolean>>;
  setSplitTabId: (id: string | null) => void;
  setSplitMode: (mode: 'preview' | 'file' | null) => void;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setFocusMode: React.Dispatch<React.SetStateAction<boolean>>;
  setSettingsOpen: (open: boolean) => void;
  setEncryptionOpen: (open: boolean) => void;
  setScreenshotMode: (open: boolean) => void;
  setAiOpen: (open: boolean) => void;
  setSnippetsOpen: (open: boolean) => void;
  setCloudOpen: (open: boolean) => void;
  setSupportOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
  setAboutInitialContent: (content: 'none' | 'privacy' | 'license' | 'documentation') => void;
  setShortcutsOpen: (open: boolean) => void;
}

export function useMenuEvents({
  activeTab,
  activeTabId,
  tabs,
  settings,
  createNewTab,
  openFile,
  openFolder,
  saveFile,
  closeTab,
  togglePanel,
  updateSettings,
  setTabs,
  setActiveTabId,
  setSplitView,
  setSplitTabId,
  setSplitMode,
  setSidebarOpen,
  setFocusMode,
  setSettingsOpen,
  setEncryptionOpen,
  setScreenshotMode,
  setAiOpen,
  setSnippetsOpen,
  setCloudOpen,
  setSupportOpen,
  setAboutOpen,
  setAboutInitialContent,
  setShortcutsOpen,
}: UseMenuEventsParams) {
  useEffect(() => {
    const listeners = [
      listen('menu-new', () => createNewTab()),
      listen('menu-open', () => openFile()),
      listen('menu-open-folder', () => openFolder()),
      listen('menu-save', () => activeTab && saveFile(activeTab)),
      listen('menu-save-as', () => activeTab && saveFile(activeTab, true)),
      listen('menu-save-all', () => {
        tabs.filter(t => t.isModified).forEach(t => saveFile(t));
      }),
      listen('menu-close', () => activeTabId && closeTab(activeTabId)),
      listen('menu-close-all', async () => {
        const modifiedTabs = tabs.filter(t => t.isModified);
        if (modifiedTabs.length > 0) {
          const shouldSave = await ask(
            `You have ${modifiedTabs.length} unsaved file(s). Save all before closing?`,
            { title: 'Close All Tabs', type: 'warning' }
          );
          if (shouldSave) {
            await Promise.all(modifiedTabs.map(t => saveFile(t)));
          } else {
            const shouldDiscard = await confirm(
              `Discard changes to ${modifiedTabs.length} file(s)?`,
              { title: 'Discard All Changes', type: 'warning' }
            );
            if (!shouldDiscard) return;
          }
        }
        setTabs([]);
        setActiveTabId(null);
        setSplitTabId(null);
        setSplitMode(null);
        setSplitView(false);
      }),
      listen('menu-find', () => togglePanel('search')),
      listen('menu-global-search', () => togglePanel('global-search')),
      listen('menu-sidebar', () => setSidebarOpen(prev => !prev)),
      listen('menu-terminal', () => togglePanel('terminal')),
      listen('menu-split', () => {
        setSplitView(prev => {
          if (prev) {
            setSplitMode(null);
            setSplitTabId(null);
          }
          return !prev;
        });
      }),
      listen('menu-focus-mode', () => setFocusMode(prev => !prev)),
      listen('menu-git', () => togglePanel('git')),
      listen('menu-ai', () => setAiOpen(true)),
      listen('menu-encryption', () => setEncryptionOpen(true)),
      listen('menu-screenshot', () => setScreenshotMode(true)),
      listen('menu-dev-tools', () => togglePanel('tools')),
      listen('menu-snippets', () => setSnippetsOpen(true)),
      listen('menu-settings', () => setSettingsOpen(true)),
      listen('menu-theme-toggle', () => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })),
      listen('menu-support', () => setSupportOpen(true)),
      listen('menu-cloud', () => setCloudOpen(true)),
      listen('menu-about', () => {
        setAboutInitialContent('none');
        setAboutOpen(true);
      }),
      listen('menu-documentation', () => {
        setAboutInitialContent('documentation');
        setAboutOpen(true);
      }),
      listen('menu-shortcuts', () => setShortcutsOpen(true)),
      listen('menu-privacy', () => {
        setAboutInitialContent('privacy');
        setAboutOpen(true);
      }),
      // Handle file open from file association (double-click in Finder)
      listen('open-file', async (event) => {
        const filePath = event.payload as string;
        if (filePath) {
          try {
            const content = await invoke<string>('read_file', { path: filePath });
            const name = await invoke<string>('get_file_name', { path: filePath });
            const lang = detectLanguage(name);

            const newTab: Tab = {
              id: Date.now().toString(),
              name,
              path: filePath,
              content,
              originalContent: content,
              isModified: false,
              language: lang,
              status: 'clean',
              lastSaved: Date.now(),
            };

            setTabs(prev => [...prev, newTab]);
            setActiveTabId(newTab.id);
          } catch (error) {
            console.error('Failed to open file:', error);
          }
        }
      }),
    ];

    return () => {
      listeners.forEach(p => p.then(fn => fn()));
    };
  }, [activeTab, activeTabId, tabs, createNewTab, openFile, openFolder, saveFile, closeTab, togglePanel, settings.theme, updateSettings, setTabs, setActiveTabId, setSplitView, setSplitTabId, setSplitMode, setSidebarOpen, setFocusMode, setSettingsOpen, setEncryptionOpen, setScreenshotMode, setAiOpen, setSnippetsOpen, setCloudOpen, setSupportOpen, setAboutOpen, setAboutInitialContent, setShortcutsOpen]);
}
