import { useState, useCallback, useEffect } from 'react';
import { Tab, PanelType, PomodoroState } from './types';
import { detectLanguage } from './utils';
import { useSettings } from './hooks/useSettings';
import { useFileManager } from './hooks/useFileManager';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useMenuEvents } from './hooks/useMenuEvents';
import ContextMenu from './components/ContextMenu';
import TabBar from './components/TabBar';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import SearchPanel from './components/SearchPanel';
import StatusBar from './components/StatusBar';
import SettingsModal from './components/SettingsModal';
import Terminal from './components/Terminal';
import GitPanel from './components/GitPanel';
import ToolsPanel from './components/ToolsPanel';
import SessionsPanel from './components/SessionsPanel';
import SnippetsPanel from './components/SnippetsPanel';
import StatsPanel from './components/StatsPanel';
import SupportPanel from './components/SupportPanel';
import AboutModal from './components/AboutModal';
import ShortcutsModal from './components/ShortcutsModal';
import MarkdownPreview from './components/MarkdownPreview';
import PomodoroTimer from './components/PomodoroTimer';
import CodeScreenshot from './components/CodeScreenshot';
import AIPanel from './components/AIPanel';
import CloudStoragePanel from './components/CloudStoragePanel';
import GlobalSearchPanel from './components/GlobalSearchPanel';
import EncryptionPanel from './components/EncryptionPanel';
import ErrorBoundary from './components/ErrorBoundary';
import {
  FilePlus, FolderOpen, Folder, Save, Undo2, Redo2,
  Search, SearchCode, Lock, Cloud, Camera, Columns2,
  Maximize, PanelLeft, Terminal as TerminalIcon, GitBranch,
  Bot, Wrench, ClipboardList, Scissors, BarChart3,
  Settings as SettingsIcon, Moon, Sun, Heart, BookOpen,
  Rocket,
} from './icons';
import { getFileIcon } from './icons';
import './styles/App.css';

function App() {
  // Settings hook
  const { settings, settingsRef, updateSettings } = useSettings();

  // File manager hook
  const {
    tabs, setTabs,
    activeTabId, setActiveTabId,
    activeTab,
    splitTab,
    currentFolder,
    bookmarks,
    splitView, setSplitView,
    setSplitTabId,
    splitMode, setSplitMode,
    editorRef,
    createNewTab,
    openFile,
    saveFile,
    closeTab,
    updateTabContent,
    openFolder,
    toggleSplitView,
    toggleBookmark,
  } = useFileManager({ settingsRef, settings });

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(250);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [screenshotMode, setScreenshotMode] = useState(false);
  const [encryptionOpen, setEncryptionOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [aboutInitialContent, setAboutInitialContent] = useState<'none' | 'privacy' | 'license' | 'documentation'>('none');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [snippetsOpen, setSnippetsOpen] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false);
  const [searchWholeWord, setSearchWholeWord] = useState(false);
  const [searchUseRegex, setSearchUseRegex] = useState(false);

  const [pomodoro, setPomodoro] = useState<PomodoroState>({
    isRunning: false,
    isBreak: false,
    timeRemaining: 25 * 60,
    sessionsCompleted: 0,
    workDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLongBreak: 4,
  });

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Block default context menu and show custom one
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Allow default in terminal area
      const target = e.target as HTMLElement;
      if (target.closest('.terminal-xterm') || target.closest('.xterm')) return;
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // Toggle panel
  const togglePanel = useCallback((panel: PanelType) => {
    setActivePanel(prev => prev === panel ? null : panel);
  }, []);

  // Keyboard shortcuts hook
  useKeyboardShortcuts({
    activeTab, activeTabId, tabs, settings,
    activePanel, settingsOpen, focusMode, screenshotMode, cursorPosition,
    createNewTab, openFile, openFolder, saveFile, closeTab,
    togglePanel, toggleSplitView, toggleBookmark, updateTabContent,
    setActiveTabId, setSidebarOpen, setSettingsOpen, setFocusMode,
    setScreenshotMode, setAiOpen, setActivePanel, editorRef,
  });

  // Menu events hook
  useMenuEvents({
    activeTab, activeTabId, tabs, settings,
    createNewTab, openFile, openFolder, saveFile, closeTab,
    togglePanel, updateSettings,
    setTabs, setActiveTabId, setSplitView, setSplitTabId, setSplitMode,
    setSidebarOpen, setFocusMode, setSettingsOpen, setEncryptionOpen,
    setScreenshotMode, setAiOpen, setSnippetsOpen, setCloudOpen,
    setSupportOpen, setAboutOpen, setAboutInitialContent, setShortcutsOpen,
  });

  const isMarkdown = activeTab?.language === 'markdown';

  return (
    <div className={`app ${focusMode ? 'focus-mode' : ''}`}>
      {/* Toolbar */}
      {!focusMode && (
        <div className="toolbar">
          <div className="toolbar-group">
            <button onClick={() => createNewTab()} title="New File (⌘N)" aria-label="New File"><FilePlus size={18} strokeWidth={1.75} /></button>
            <button onClick={() => openFile()} title="Open File (⌘O)" aria-label="Open File"><FolderOpen size={18} strokeWidth={1.75} /></button>
            <button onClick={openFolder} title="Open Folder (⌘⇧O)" aria-label="Open Folder"><Folder size={18} strokeWidth={1.75} /></button>
            <button onClick={() => activeTab && saveFile(activeTab)} disabled={!activeTab} title="Save (⌘S)" aria-label="Save"><Save size={18} strokeWidth={1.75} /></button>
            <div className="toolbar-divider" />
            <button onClick={() => editorRef.current?.undo()} disabled={!activeTab} title="Undo (⌘Z)" aria-label="Undo"><Undo2 size={18} strokeWidth={1.75} /></button>
            <button onClick={() => editorRef.current?.redo()} disabled={!activeTab} title="Redo (⌘⇧Z)" aria-label="Redo"><Redo2 size={18} strokeWidth={1.75} /></button>
            <div className="toolbar-divider" />
            <button onClick={() => togglePanel('search')} className={activePanel === 'search' ? 'active' : ''} title="Search (⌘F)" aria-label="Search"><Search size={18} strokeWidth={1.75} /></button>
            <button onClick={() => togglePanel('global-search')} className={activePanel === 'global-search' ? 'active' : ''} title="Global Search (⌘⇧F)" aria-label="Global Search"><SearchCode size={18} strokeWidth={1.75} /></button>
            <button onClick={() => setEncryptionOpen(true)} className={encryptionOpen ? 'active' : ''} title="Encryption" aria-label="Encryption"><Lock size={18} strokeWidth={1.75} /></button>
            <button onClick={() => setCloudOpen(true)} className={cloudOpen ? 'active' : ''} title="Cloud Storage" aria-label="Cloud Storage"><Cloud size={18} strokeWidth={1.75} /></button>
            <button onClick={() => setScreenshotMode(true)} disabled={!activeTab} title="Code Screenshot" aria-label="Code Screenshot"><Camera size={18} strokeWidth={1.75} /></button>
          </div>

          <div className="toolbar-group">
            <button onClick={toggleSplitView} className={splitView ? 'active' : ''} title="Split View (⌘\\)" aria-label="Split View"><Columns2 size={18} strokeWidth={1.75} /></button>
            <button onClick={() => setFocusMode(true)} title="Focus Mode (⌘⇧↵)" aria-label="Focus Mode"><Maximize size={18} strokeWidth={1.75} /></button>
            <div className="toolbar-divider" />
            <PomodoroTimer pomodoro={pomodoro} setPomodoro={setPomodoro} />
            <div className="toolbar-divider" />
            <button onClick={() => setSidebarOpen(prev => !prev)} className={sidebarOpen ? 'active' : ''} title="Toggle Sidebar (⌘B)" aria-label="Toggle Sidebar"><PanelLeft size={18} strokeWidth={1.75} /></button>
            <button onClick={() => togglePanel('terminal')} className={activePanel === 'terminal' ? 'active' : ''} title="Terminal (⌘`)" aria-label="Terminal"><TerminalIcon size={18} strokeWidth={1.75} /></button>
            <button onClick={() => togglePanel('git')} className={activePanel === 'git' ? 'active' : ''} title="Git (⌘⇧G)" aria-label="Git"><GitBranch size={18} strokeWidth={1.75} /></button>
            <button onClick={() => setAiOpen(true)} className={aiOpen ? 'active' : ''} title="AI Assistant (⌘K)" aria-label="AI Assistant"><Bot size={18} strokeWidth={1.75} /></button>
            <button onClick={() => togglePanel('tools')} className={activePanel === 'tools' ? 'active' : ''} title="Tools" aria-label="Tools"><Wrench size={18} strokeWidth={1.75} /></button>
            <div className="toolbar-divider" />
            <button onClick={() => togglePanel('sessions')} className={activePanel === 'sessions' ? 'active' : ''} title="Sessions" aria-label="Sessions"><ClipboardList size={18} strokeWidth={1.75} /></button>
            <button onClick={() => setSnippetsOpen(true)} className={snippetsOpen ? 'active' : ''} title="Snippets" aria-label="Snippets"><Scissors size={18} strokeWidth={1.75} /></button>
            <button onClick={() => togglePanel('stats')} className={activePanel === 'stats' ? 'active' : ''} title="Statistics" aria-label="Statistics"><BarChart3 size={18} strokeWidth={1.75} /></button>
            <div className="toolbar-divider" />
            <button onClick={() => setSettingsOpen(true)} title="Settings (⌘,)" aria-label="Settings"><SettingsIcon size={18} strokeWidth={1.75} /></button>
            <button onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })} title="Toggle Theme" aria-label="Toggle Theme">
              {settings.theme === 'dark' ? <Moon size={18} strokeWidth={1.75} /> : <Sun size={18} strokeWidth={1.75} />}
            </button>
            <button onClick={() => setSupportOpen(true)} className={supportOpen ? 'active' : ''} title="Support" aria-label="Support"><Heart size={18} strokeWidth={1.75} /></button>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      {!focusMode && (
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabSelect={setActiveTabId}
          onTabClose={closeTab}
          onNewTab={() => createNewTab()}
        />
      )}

      {/* Main Content */}
      <div className="main-content">
        {sidebarOpen && !focusMode && (
          <Sidebar
            width={sidebarWidth}
            onWidthChange={setSidebarWidth}
            currentFolder={currentFolder}
            onFileOpen={openFile}
            onFolderOpen={openFolder}
            bookmarks={bookmarks}
            onBookmarkClick={(b) => {
              openFile(b.file_path);
              // TODO: Go to line
            }}
          />
        )}

        <div className="editor-area">
          {/* Search Panel */}
          {activePanel === 'search' && (
            <SearchPanel
              onClose={() => {
                setActivePanel(null);
                setSearchQuery('');
              }}
              onSearch={(query, caseSensitive, wholeWord, useRegex) => {
                setSearchQuery(query);
                setSearchCaseSensitive(caseSensitive);
                setSearchWholeWord(wholeWord);
                setSearchUseRegex(useRegex);
              }}
              activeTab={activeTab}
              onReplace={(oldText, newText) => {
                if (activeTab) {
                  const newContent = activeTab.content.replace(oldText, newText);
                  updateTabContent(activeTab.id, newContent);
                }
              }}
              onReplaceAll={(oldText, newText, flags) => {
                if (activeTab) {
                  const regex = new RegExp(oldText, flags);
                  const newContent = activeTab.content.replace(regex, newText);
                  updateTabContent(activeTab.id, newContent);
                }
              }}
              onNavigate={(direction, query, caseSensitive, wholeWord, useRegex) => {
                editorRef.current?.navigateSearch(direction, query, caseSensitive, wholeWord, useRegex);
              }}
            />
          )}

          {/* Editor(s) */}
          <div className={`editors-container ${splitView ? 'split' : ''}`}>
            {activeTab ? (
              <>
                <div className="editor-pane">
                  <Editor
                    ref={editorRef}
                    tab={activeTab}
                    settings={settings}
                    onChange={(content) => updateTabContent(activeTab.id, content)}
                    onCursorChange={setCursorPosition}
                    searchQuery={searchQuery}
                    searchCaseSensitive={searchCaseSensitive}
                    searchWholeWord={searchWholeWord}
                    searchUseRegex={searchUseRegex}
                  />
                </div>

                {splitView && (
                  <div className="editor-pane split-pane">
                    {(splitMode === 'preview' || splitTab) && (
                      <div className="split-header">
                        <span className="split-header-name">
                          {splitMode === 'preview' ? <><BookOpen size={14} strokeWidth={1.75} /> Preview</> : splitTab?.name}
                        </span>
                        <button
                          className="split-change-btn"
                          onClick={() => {
                            setSplitMode(null);
                            setSplitTabId(null);
                          }}
                          title="Change view"
                        >
                          ↔
                        </button>
                      </div>
                    )}
                    {splitMode === 'preview' && isMarkdown ? (
                      <MarkdownPreview content={activeTab.content} />
                    ) : splitTab ? (
                      <Editor
                        tab={splitTab}
                        settings={settings}
                        onChange={(content) => updateTabContent(splitTab.id, content)}
                        onCursorChange={() => {}}
                      />
                    ) : (
                      <div className="empty-split">
                        <div className="empty-split-content">
                          <h3><FilePlus size={16} strokeWidth={1.75} /> Split View</h3>

                          {isMarkdown && (
                            <button
                              className="split-file-item split-preview-btn"
                              onClick={() => setSplitMode('preview')}
                            >
                              <span className="split-file-icon"><BookOpen size={14} strokeWidth={1.75} /></span>
                              <span className="split-file-name">Markdown Preview</span>
                            </button>
                          )}

                          {tabs.filter(t => t.id !== activeTabId).length > 0 && (
                            <>
                              <p className="split-section-label">Open files:</p>
                              <div className="split-file-list">
                                {tabs.filter(t => t.id !== activeTabId).map(tab => (
                                  <button
                                    key={tab.id}
                                    className="split-file-item"
                                    onClick={() => {
                                      setSplitTabId(tab.id);
                                      setSplitMode('file');
                                    }}
                                  >
                                    <span className="split-file-icon">
                                      {(() => { const Icon = getFileIcon(tab.name, false); return <Icon size={14} strokeWidth={1.75} />; })()}
                                    </span>
                                    <span className="split-file-name">{tab.name}</span>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}

                          <button className="split-open-btn" onClick={() => openFile()}>
                            <FolderOpen size={14} strokeWidth={1.75} /> Open Another File
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-state-content">
                  <h2><Rocket size={20} strokeWidth={1.75} /> RocketNote</h2>
                  <p>Fast. Private. Local. Deterministic.</p>
                  <div className="empty-state-actions">
                    <button onClick={() => createNewTab()} className="primary-btn">
                      <FilePlus size={16} strokeWidth={1.75} /> New File
                    </button>
                    <button onClick={() => openFile()}>
                      <FolderOpen size={16} strokeWidth={1.75} /> Open File
                    </button>
                    <button onClick={openFolder}>
                      <Folder size={16} strokeWidth={1.75} /> Open Folder
                    </button>
                  </div>
                  <div className="shortcuts-hint">
                    <span>⌘N New</span>
                    <span>⌘O Open</span>
                    <span>⌘` Terminal</span>
                    <span>⌘K AI</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Panel */}
          {activePanel && ['terminal', 'git', 'tools', 'sessions', 'stats', 'global-search'].includes(activePanel) && (
            <div className="bottom-panel" style={{ height: bottomPanelHeight }}>
              <div className="panel-resize-handle" onMouseDown={(e) => {
                e.preventDefault();
                const startY = e.clientY;
                const startHeight = bottomPanelHeight;

                const handleMouseMove = (e: MouseEvent) => {
                  const delta = startY - e.clientY;
                  setBottomPanelHeight(Math.max(100, Math.min(500, startHeight + delta)));
                };

                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }} />

              <div className="panel-header">
                <span className="panel-title">
                  {activePanel === 'terminal' && <><TerminalIcon size={14} strokeWidth={1.75} /> Terminal</>}
                  {activePanel === 'git' && <><GitBranch size={14} strokeWidth={1.75} /> Git</>}
                  {activePanel === 'tools' && <><Wrench size={14} strokeWidth={1.75} /> Developer Tools</>}
                  {activePanel === 'sessions' && <><ClipboardList size={14} strokeWidth={1.75} /> Sessions</>}
                  {activePanel === 'stats' && <><BarChart3 size={14} strokeWidth={1.75} /> Coding Statistics</>}
                  {activePanel === 'global-search' && <><SearchCode size={14} strokeWidth={1.75} /> Global Search</>}
                </span>
                <button className="panel-close" onClick={() => setActivePanel(null)}>×</button>
              </div>

              <div className="panel-content">
                {activePanel === 'terminal' && <ErrorBoundary name="Terminal"><Terminal cwd={currentFolder} /></ErrorBoundary>}
                {activePanel === 'git' && <ErrorBoundary name="Git"><GitPanel folder={currentFolder} /></ErrorBoundary>}
                {activePanel === 'tools' && <ErrorBoundary name="Tools"><ToolsPanel /></ErrorBoundary>}
                {activePanel === 'sessions' && (
                  <SessionsPanel
                    tabs={tabs}
                    onLoadSession={(files) => {
                      files.forEach(f => openFile(f.path));
                    }}
                  />
                )}
                {activePanel === 'stats' && <StatsPanel />}
                {activePanel === 'global-search' && (
                  <GlobalSearchPanel
                    currentFolder={currentFolder}
                    onOpenFile={(path, _line) => {
                      openFile(path);
                      // TODO: Jump to line after file opens
                    }}
                    onClose={() => setActivePanel(null)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      {!focusMode && (
        <StatusBar
          tab={activeTab}
          cursorPosition={cursorPosition}
          settings={settings}
          onLanguageChange={(language) => {
            if (activeTab) {
              setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, language } : t));
            }
          }}
          gitBranch={null}
        />
      )}

      {/* Modals */}
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {screenshotMode && activeTab && (
        <CodeScreenshot
          code={activeTab.content}
          language={activeTab.language}
          theme={settings.theme}
          onClose={() => setScreenshotMode(false)}
        />
      )}

      {encryptionOpen && (
        <ErrorBoundary name="Encryption">
        <EncryptionPanel
          activeFilePath={activeTab?.path || null}
          activeFileContent={activeTab?.content || ''}
          onContentDecrypted={(content) => {
            if (activeTab) {
              updateTabContent(activeTab.id, content);
            }
          }}
          onClose={() => setEncryptionOpen(false)}
        />
        </ErrorBoundary>
      )}

      {supportOpen && (
        <SupportPanel onClose={() => setSupportOpen(false)} />
      )}

      {aboutOpen && (
        <AboutModal
          onClose={() => setAboutOpen(false)}
          initialContent={aboutInitialContent}
        />
      )}

      {shortcutsOpen && (
        <ShortcutsModal onClose={() => setShortcutsOpen(false)} />
      )}

      {aiOpen && (
        <ErrorBoundary name="AI Assistant">
        <AIPanel
          selectedCode={editorRef.current?.getSelectedText?.() || ''}
          currentLanguage={activeTab?.language || 'plaintext'}
          onInsertCode={(code) => {
            if (activeTab) {
              updateTabContent(activeTab.id, activeTab.content + '\n' + code);
            }
          }}
          onClose={() => setAiOpen(false)}
        />
        </ErrorBoundary>
      )}

      {snippetsOpen && (
        <SnippetsPanel
          currentLanguage={activeTab?.language || 'plaintext'}
          onInsert={(body) => {
            if (activeTab) {
              updateTabContent(activeTab.id, activeTab.content + body);
            }
          }}
          onClose={() => setSnippetsOpen(false)}
        />
      )}

      {cloudOpen && (
        <ErrorBoundary name="Cloud Storage">
        <CloudStoragePanel
          currentFilePath={activeTab?.path || null}
          currentFileContent={activeTab?.content || ''}
          onFileLoaded={(content, name) => {
            const newTab: Tab = {
              id: `cloud-${Date.now()}`,
              name,
              path: null,
              content,
              originalContent: content,
              language: detectLanguage(name),
              isModified: false,
              status: 'clean',
              lastSaved: Date.now(),
            };
            setTabs(prev => [...prev, newTab]);
            setActiveTabId(newTab.id);
          }}
          onClose={() => setCloudOpen(false)}
        />
        </ErrorBoundary>
      )}

      {/* Focus mode exit hint */}
      {focusMode && (
        <div className="focus-mode-hint">Press ESC or ⌘⇧↵ to exit focus mode</div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            { label: 'New File', shortcut: '⌘N', action: () => createNewTab() },
            { label: 'Open File...', shortcut: '⌘O', action: () => openFile() },
            { label: 'Open Folder...', shortcut: '⌘⇧O', action: () => openFolder() },
            { divider: true },
            { label: 'Save', shortcut: '⌘S', action: () => activeTab && saveFile(activeTab), disabled: !activeTab },
            { label: 'Save As...', shortcut: '⌘⇧S', action: () => activeTab && saveFile(activeTab, true), disabled: !activeTab },
            { divider: true },
            { label: 'Undo', shortcut: '⌘Z', action: () => editorRef.current?.undo(), disabled: !activeTab },
            { label: 'Redo', shortcut: '⌘⇧Z', action: () => editorRef.current?.redo(), disabled: !activeTab },
            { divider: true },
            { label: 'Find...', shortcut: '⌘F', action: () => togglePanel('search') },
            { label: 'Search in Files...', shortcut: '⌘⇧F', action: () => togglePanel('global-search') },
            { divider: true },
            { label: 'Toggle Terminal', shortcut: '⌘`', action: () => togglePanel('terminal') },
            { label: 'Git Panel', shortcut: '⌘⇧G', action: () => togglePanel('git') },
            { label: 'AI Assistant', shortcut: '⌘K', action: () => setAiOpen(true) },
            { divider: true },
            { label: 'Settings...', shortcut: '⌘,', action: () => setSettingsOpen(true) },
            { label: 'Toggle Theme', action: () => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' }) },
          ]}
        />
      )}
    </div>
  );
}

export default App;
