export type FileStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

export interface Tab {
  id: string;
  path: string | null;
  name: string;
  content: string;
  originalContent: string;
  language: string;
  isModified: boolean;
  status: FileStatus;
  lastSaved: number | null; // timestamp
  error?: string;
  cursorLine?: number;
  cursorColumn?: number;
}

export interface FileInfo {
  name: string;
  path: string;
  is_dir: boolean;
  extension: string | null;
  size?: number;
  modified?: string;
}

export interface SearchOptions {
  query: string;
  replaceText: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: 'on' | 'off' | 'wordWrapColumn';
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative';
  theme: 'dark' | 'light';
  themeStyle: 'dark-glass' | 'ultra-dark' | 'glassmorphism';
  colorMode: 'dark' | 'light' | 'system';
  accentColor: 'indigo' | 'blue' | 'emerald' | 'violet' | 'rose';
  autoSave: boolean;
  autoSaveDelay: number;
  fontFamily: string;
  bracketPairColorization: boolean;
  stickyScroll: boolean;
  formatOnSave: boolean;
}

export type Theme = 'dark' | 'light';

// Git types
export interface GitStatus {
  is_repo: boolean;
  branch: string | null;
  files: GitFileStatus[];
  ahead: number;
  behind: number;
}

export interface GitFileStatus {
  path: string;
  status: string;
  staged: boolean;
}

export interface GitCommit {
  id: string;
  short_id: string;
  message: string;
  author: string;
  email: string;
  date: string;
}

// Session types
export interface Session {
  name: string;
  files: SessionFile[];
  created_at: string;
}

export interface SessionFile {
  path: string;
  cursor_line: number;
  cursor_column: number;
}

// Snippet types
export interface Snippet {
  id: string;
  name: string;
  prefix: string;
  body: string;
  language: string;
  description?: string;
}

// Stats types
export interface CodingStats {
  total_lines_written: number;
  total_characters: number;
  total_time_seconds: number;
  files_created: number;
  files_saved: number;
  daily_stats: Record<string, DailyStats>;
}

export interface DailyStats {
  lines: number;
  characters: number;
  time_seconds: number;
}

// Bookmark types
export interface Bookmark {
  file_path: string;
  line: number;
  label?: string;
}

// Macro types
export interface Macro {
  id: string;
  name: string;
  actions: MacroAction[];
}

export interface MacroAction {
  action_type: string;
  data: string;
}

// Regex types
export interface RegexMatch {
  text: string;
  start: number;
  end: number;
}

// Pomodoro types
export interface PomodoroState {
  isRunning: boolean;
  isBreak: boolean;
  timeRemaining: number;
  sessionsCompleted: number;
  workDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
}

// Panel types
export type PanelType = 
  | 'terminal'
  | 'git'
  | 'search'
  | 'settings'
  | 'tools'
  | 'sessions'
  | 'snippets'
  | 'stats'
  | 'support'
  | 'markdown'
  | 'ai'
  | 'global-search'
  | 'encryption'
  | null;

export type SidebarPanelType = 
  | 'files'
  | 'git'
  | 'bookmarks'
  | 'outline';

// AI types
export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Tool result types
export interface ToolResult {
  success: boolean;
  data?: string;
  error?: string;
}
