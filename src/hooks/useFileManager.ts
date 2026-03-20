import { useState, useEffect, useCallback, useRef, MutableRefObject } from 'react';
import { open, save, ask, confirm } from '@tauri-apps/api/dialog';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { Tab, EditorSettings, Bookmark } from '../types';
import { generateId, detectLanguage } from '../utils';

interface UseFileManagerParams {
  settingsRef: MutableRefObject<EditorSettings>;
  settings: EditorSettings;
}

export function useFileManager({ settingsRef, settings }: UseFileManagerParams) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  // Split view state
  const [splitView, setSplitView] = useState(false);
  const [splitTabId, setSplitTabId] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState<'preview' | 'file' | null>(null);

  // Stats tracking
  const [sessionStartTime] = useState(Date.now());
  const [linesWritten, setLinesWritten] = useState(0);
  const [charsWritten, setCharsWritten] = useState(0);

  const editorRef = useRef<{
    focus: () => void;
    search: (query: string) => void;
    getSelectedText: () => string;
    undo: () => void;
    redo: () => void;
    replace: (search: string, replacement: string, all?: boolean) => number;
    navigateSearch: (direction: 'next' | 'prev', query: string, caseSensitive: boolean, wholeWord: boolean, useRegex: boolean) => void;
  } | null>(null);
  const activeTabRef = useRef<Tab | null>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || null;
  const splitTab = splitTabId ? tabs.find(t => t.id === splitTabId) : null;

  // Keep ref in sync
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Load bookmarks
  useEffect(() => {
    invoke<Bookmark[]>('load_bookmarks').then(setBookmarks).catch(console.error);
  }, []);

  // Save stats on unmount & warn about unsaved changes
  useEffect(() => {
    const saveStats = async () => {
      const timeSpent = Math.floor((Date.now() - sessionStartTime) / 1000);
      await invoke('update_coding_stats', {
        lines: linesWritten,
        characters: charsWritten,
        timeSeconds: timeSpent,
      });
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      saveStats();
      const unsavedTabs = tabs.filter(t => t.isModified);
      if (unsavedTabs.length > 0) {
        e.preventDefault();
        e.returnValue = `You have ${unsavedTabs.length} unsaved file(s). Are you sure you want to close?`;
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      saveStats();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionStartTime, linesWritten, charsWritten, tabs]);

  // Create new tab
  const createNewTab = useCallback((path: string | null = null, content: string = '', name: string = 'Untitled') => {
    const id = generateId();
    const language = path ? detectLanguage(path) : 'plaintext';

    const newTab: Tab = {
      id,
      path,
      name: path ? path.split('/').pop() || name : name,
      content,
      originalContent: content,
      language,
      isModified: false,
      status: path ? 'clean' : 'dirty',
      lastSaved: path ? Date.now() : null,
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(id);
    return id;
  }, []);

  // Open file
  const openFile = useCallback(async (filePath?: string) => {
    try {
      let path = filePath;

      if (!path) {
        const selected = await open({ multiple: false });
        if (!selected || Array.isArray(selected)) return;
        path = selected;
      }

      const existingTab = tabs.find(t => t.path === path);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        return;
      }

      const content = await invoke<string>('read_file', { path });
      createNewTab(path, content);
    } catch (error) {
      console.error('Error opening file:', error);
    }
  }, [tabs, createNewTab]);

  // Save file
  const saveFile = useCallback(async (tab: Tab, saveAs: boolean = false) => {
    setTabs(prev => prev.map(t =>
      t.id === tab.id ? { ...t, status: 'saving' as const } : t
    ));

    try {
      let path = tab.path;

      if (!path || saveAs) {
        const selected = await save({ defaultPath: tab.name });
        if (!selected) {
          setTabs(prev => prev.map(t =>
            t.id === tab.id ? { ...t, status: t.isModified ? 'dirty' : 'clean' } : t
          ));
          return;
        }
        path = selected;
      }

      let contentToSave = tab.content;
      if (settingsRef.current.formatOnSave && path && (path.endsWith('.json') || path.endsWith('.jsonc'))) {
        try {
          const parsed = JSON.parse(tab.content);
          const indent = settingsRef.current.tabSize || 2;
          contentToSave = JSON.stringify(parsed, null, indent) + '\n';
        } catch {
          contentToSave = tab.content;
        }
      }

      await invoke('write_file', { path, content: contentToSave });

      setTabs(prev => prev.map(t => {
        if (t.id === tab.id) {
          return {
            ...t,
            path,
            name: path!.split('/').pop() || t.name,
            content: contentToSave,
            originalContent: contentToSave,
            isModified: false,
            language: detectLanguage(path!),
            status: 'saved' as const,
            lastSaved: Date.now(),
            error: undefined,
          };
        }
        return t;
      }));

      setTimeout(() => {
        setTabs(prev => prev.map(t =>
          t.id === tab.id && t.status === 'saved' ? { ...t, status: 'clean' } : t
        ));
      }, 2000);

    } catch (error) {
      console.error('Error saving file:', error);
      setTabs(prev => prev.map(t =>
        t.id === tab.id ? { ...t, status: 'error', error: String(error) } : t
      ));
    }
  }, [settingsRef]);

  // Close tab
  const closeTab = useCallback(async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.isModified) {
      const shouldSave = await ask(
        `Do you want to save changes to "${tab.name}"?\n\nClick "Yes" to save, "No" to discard changes.`,
        { title: 'Unsaved Changes', type: 'warning' }
      );

      if (shouldSave) {
        await saveFile(tab);
      } else {
        const shouldDiscard = await confirm(
          `Are you sure you want to discard unsaved changes to "${tab.name}"?`,
          { title: 'Discard Changes', type: 'warning' }
        );
        if (!shouldDiscard) return;
      }
    }

    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId && newTabs.length > 0) {
        const index = prev.findIndex(t => t.id === tabId);
        const newIndex = Math.min(index, newTabs.length - 1);
        setActiveTabId(newTabs[newIndex].id);
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
      }
      return newTabs;
    });

    if (splitTabId === tabId) {
      setSplitTabId(null);
      setSplitMode(null);
      setSplitView(false);
    }
  }, [tabs, activeTabId, splitTabId, saveFile]);

  // Toggle split view
  const toggleSplitView = useCallback(() => {
    setSplitView(prev => {
      if (prev) {
        setSplitMode(null);
        setSplitTabId(null);
      }
      return !prev;
    });
  }, []);

  // Update tab content
  const updateTabContent = useCallback((tabId: string, content: string) => {
    setTabs(prev => prev.map(t => {
      if (t.id === tabId) {
        let oldNewlines = 0;
        let newNewlines = 0;
        for (let i = 0; i < t.content.length; i++) {
          if (t.content[i] === '\n') oldNewlines++;
        }
        for (let i = 0; i < content.length; i++) {
          if (content[i] === '\n') newNewlines++;
        }
        const oldLines = oldNewlines + 1;
        const newLines = newNewlines + 1;

        if (newLines > oldLines) setLinesWritten(l => l + (newLines - oldLines));
        if (content.length > t.content.length) setCharsWritten(c => c + (content.length - t.content.length));

        const isModified = content !== t.originalContent;

        return {
          ...t,
          content,
          isModified,
          status: isModified ? 'dirty' : 'clean',
        };
      }
      return t;
    }));
  }, []);

  // Auto-save
  useEffect(() => {
    if (!settings.autoSave || !activeTab?.isModified || !activeTab?.path) return;

    const timeoutId = setTimeout(() => {
      const currentTab = activeTabRef.current;
      if (currentTab?.isModified && currentTab?.path) {
        saveFile(currentTab);
      }
    }, settings.autoSaveDelay);

    return () => clearTimeout(timeoutId);
  }, [activeTab?.content, activeTab?.isModified, activeTab?.path, settings.autoSave, settings.autoSaveDelay, saveFile]);

  // Open folder
  const openFolder = useCallback(async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected && !Array.isArray(selected)) {
      setCurrentFolder(selected);
    }
  }, []);

  // Toggle bookmark
  const toggleBookmark = useCallback((line: number) => {
    if (!activeTab?.path) return;

    setBookmarks(prev => {
      const existing = prev.findIndex(b => b.file_path === activeTab.path && b.line === line);
      let newBookmarks: Bookmark[];

      if (existing >= 0) {
        newBookmarks = prev.filter((_, i) => i !== existing);
      } else {
        newBookmarks = [...prev, { file_path: activeTab.path!, line, label: undefined }];
      }

      invoke('save_bookmarks', { bookmarks: newBookmarks }).catch(console.error);
      return newBookmarks;
    });
  }, [activeTab]);

  // File drop handler
  useEffect(() => {
    const unlistenDrop = listen('tauri://file-drop', async (event) => {
      const files = event.payload as string[];
      for (const file of files) {
        await openFile(file);
      }
    });

    return () => { unlistenDrop.then(fn => fn()); };
  }, [openFile]);

  // Create initial tab
  useEffect(() => {
    if (tabs.length === 0) createNewTab();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createNewTab]);

  return {
    // State
    tabs, setTabs,
    activeTabId, setActiveTabId,
    activeTab,
    splitTab,
    currentFolder, setCurrentFolder,
    bookmarks,
    splitView, setSplitView,
    splitTabId, setSplitTabId,
    splitMode, setSplitMode,
    // Refs
    editorRef,
    activeTabRef,
    // Actions
    createNewTab,
    openFile,
    saveFile,
    closeTab,
    updateTabContent,
    openFolder,
    toggleSplitView,
    toggleBookmark,
  };
}
