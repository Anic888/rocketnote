import { useEffect } from 'react';
import { Tab, EditorSettings, PanelType } from '../types';
import { isShortcut } from '../utils';

interface UseKeyboardShortcutsParams {
  activeTab: Tab | null;
  activeTabId: string | null;
  tabs: Tab[];
  settings: EditorSettings;
  activePanel: PanelType;
  settingsOpen: boolean;
  focusMode: boolean;
  screenshotMode: boolean;
  cursorPosition: { line: number; column: number };
  createNewTab: () => string;
  openFile: () => void;
  openFolder: () => void;
  saveFile: (tab: Tab, saveAs?: boolean) => void;
  closeTab: (tabId: string) => void;
  togglePanel: (panel: PanelType) => void;
  toggleSplitView: () => void;
  toggleBookmark: (line: number) => void;
  updateTabContent: (tabId: string, content: string) => void;
  setActiveTabId: (id: string) => void;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSettingsOpen: (open: boolean) => void;
  setFocusMode: React.Dispatch<React.SetStateAction<boolean>>;
  setScreenshotMode: (open: boolean) => void;
  setAiOpen: (open: boolean) => void;
  setActivePanel: (panel: PanelType) => void;
  editorRef: React.RefObject<{
    undo: () => void;
    redo: () => void;
  } | null>;
}

export function useKeyboardShortcuts({
  activeTab,
  activeTabId,
  tabs,
  settings,
  activePanel,
  settingsOpen,
  focusMode,
  screenshotMode,
  cursorPosition,
  createNewTab,
  openFile,
  openFolder,
  saveFile,
  closeTab,
  togglePanel,
  toggleSplitView,
  toggleBookmark,
  updateTabContent,
  setActiveTabId,
  setSidebarOpen,
  setSettingsOpen,
  setFocusMode,
  setScreenshotMode,
  setAiOpen,
  setActivePanel,
  editorRef,
}: UseKeyboardShortcutsParams) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isShortcut(e, 'n', { cmd: true })) {
        e.preventDefault();
        createNewTab();
      }
      else if (isShortcut(e, 'o', { cmd: true, shift: false })) {
        e.preventDefault();
        openFile();
      }
      else if (isShortcut(e, 'o', { cmd: true, shift: true })) {
        e.preventDefault();
        openFolder();
      }
      else if (isShortcut(e, 's', { cmd: true, shift: false })) {
        e.preventDefault();
        if (activeTab) saveFile(activeTab);
      }
      else if (isShortcut(e, 's', { cmd: true, shift: true })) {
        e.preventDefault();
        if (activeTab) saveFile(activeTab, true);
      }
      else if (isShortcut(e, 'w', { cmd: true })) {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
      }
      else if (isShortcut(e, 'f', { cmd: true, shift: false })) {
        e.preventDefault();
        togglePanel('search');
      }
      else if (isShortcut(e, 'f', { cmd: true, shift: true })) {
        e.preventDefault();
        togglePanel('global-search');
      }
      else if (isShortcut(e, 'b', { cmd: true })) {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      }
      else if (isShortcut(e, ',', { cmd: true })) {
        e.preventDefault();
        setSettingsOpen(true);
      }
      else if (isShortcut(e, '`', { cmd: true })) {
        e.preventDefault();
        togglePanel('terminal');
      }
      else if (isShortcut(e, 'g', { cmd: true, shift: true })) {
        e.preventDefault();
        togglePanel('git');
      }
      else if (isShortcut(e, 'k', { cmd: true })) {
        e.preventDefault();
        setAiOpen(true);
      }
      else if (isShortcut(e, '\\', { cmd: true })) {
        e.preventDefault();
        if (activeTab) {
          toggleSplitView();
        }
      }
      else if (isShortcut(e, 'Enter', { cmd: true, shift: true })) {
        e.preventDefault();
        setFocusMode(prev => !prev);
      }
      else if (e.key === 'F2') {
        e.preventDefault();
        toggleBookmark(cursorPosition.line);
      }
      // Format JSON (Shift+Alt+F)
      else if (e.key === 'f' && e.shiftKey && e.altKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (activeTab && (activeTab.language === 'json' || activeTab.name.endsWith('.json'))) {
          try {
            const parsed = JSON.parse(activeTab.content);
            const indent = settings.tabSize || 2;
            const formatted = JSON.stringify(parsed, null, indent) + '\n';
            updateTabContent(activeTab.id, formatted);
          } catch {
            // Invalid JSON - ignore
          }
        }
      }
      else if (e.key === 'Escape') {
        if (activePanel) setActivePanel(null);
        if (settingsOpen) setSettingsOpen(false);
        if (focusMode) setFocusMode(false);
        if (screenshotMode) setScreenshotMode(false);
      }
      else if (isShortcut(e, 'Tab', { cmd: true })) {
        e.preventDefault();
        if (tabs.length > 1) {
          const currentIndex = tabs.findIndex(t => t.id === activeTabId);
          const direction = e.shiftKey ? -1 : 1;
          const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
          setActiveTabId(tabs[nextIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, activeTabId, tabs, createNewTab, openFile, openFolder, saveFile, closeTab, togglePanel, toggleBookmark, cursorPosition, activePanel, settingsOpen, focusMode, screenshotMode, toggleSplitView, settings, updateTabContent, setSidebarOpen, setSettingsOpen, setFocusMode, setScreenshotMode, setAiOpen, setActivePanel, setActiveTabId, editorRef]);
}
