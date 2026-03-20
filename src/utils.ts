// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Detect language from file path
export function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    // Web
    'js': 'javascript',
    'mjs': 'javascript',
    'cjs': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'scss',
    'less': 'less',
    'vue': 'vue',
    'svelte': 'svelte',
    
    // Data
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'csv': 'csv',
    
    // Programming
    'py': 'python',
    'pyw': 'python',
    'rb': 'ruby',
    'rs': 'rust',
    'go': 'go',
    'java': 'java',
    'kt': 'kotlin',
    'kts': 'kotlin',
    'scala': 'scala',
    'c': 'c',
    'h': 'c',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'hpp': 'cpp',
    'cs': 'csharp',
    'swift': 'swift',
    'php': 'php',
    'pl': 'perl',
    'lua': 'lua',
    'r': 'r',
    'dart': 'dart',
    'ex': 'elixir',
    'exs': 'elixir',
    'erl': 'erlang',
    'hrl': 'erlang',
    'hs': 'haskell',
    'elm': 'elm',
    'clj': 'clojure',
    'cljs': 'clojure',
    'f': 'fortran',
    'f90': 'fortran',
    'jl': 'julia',
    'nim': 'nim',
    'zig': 'zig',
    'v': 'v',
    
    // Shell & Config
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'fish': 'shell',
    'ps1': 'powershell',
    'bat': 'bat',
    'cmd': 'bat',
    
    // Documents
    'md': 'markdown',
    'markdown': 'markdown',
    'rst': 'restructuredtext',
    'tex': 'latex',
    'txt': 'plaintext',
    
    // Database
    'sql': 'sql',
    'pgsql': 'pgsql',
    'mysql': 'mysql',
    
    // Other
    'dockerfile': 'dockerfile',
    'makefile': 'makefile',
    'graphql': 'graphql',
    'gql': 'graphql',
    'proto': 'protobuf',
    'sol': 'solidity',
    'asm': 'asm',
    's': 'asm',
    'ini': 'ini',
    'conf': 'ini',
    'cfg': 'ini',
    'env': 'ini',
    'gitignore': 'ini',
    'editorconfig': 'ini',
  };
  
  // Check filename for special cases
  const filename = path.split('/').pop()?.toLowerCase() || '';
  
  if (filename === 'dockerfile') return 'dockerfile';
  if (filename === 'makefile' || filename === 'gnumakefile') return 'makefile';
  if (filename.startsWith('.env')) return 'ini';
  if (filename === 'cargo.toml' || filename === 'pyproject.toml') return 'toml';
  
  return languageMap[ext || ''] || 'plaintext';
}

// Re-export from icons.ts for backward compatibility
export { getFileIcon } from './icons';

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Check if keyboard shortcut matches
export function isShortcut(
  event: KeyboardEvent,
  key: string,
  options: { cmd?: boolean; shift?: boolean; alt?: boolean } = {}
): boolean {
  const { cmd = false, shift = false, alt = false } = options;
  
  const isMac = navigator.platform.toLowerCase().includes('mac');
  const cmdKey = isMac ? event.metaKey : event.ctrlKey;
  
  return (
    event.key.toLowerCase() === key.toLowerCase() &&
    cmdKey === cmd &&
    event.shiftKey === shift &&
    event.altKey === alt
  );
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Format time duration
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
