import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Search, Loader2, X, Zap, File, Target, FolderOpen } from '../icons';
import './GlobalSearchPanel.css';

interface SearchMatch {
  path: string;
  line_number: number;
  line_content: string;
  match_start: number;
  match_end: number;
}

interface SearchResult {
  matches: SearchMatch[];
  total_files_searched: number;
  total_matches: number;
  duration_ms: number;
}

interface GlobalSearchPanelProps {
  currentFolder: string | null;
  onOpenFile: (path: string, line?: number) => void;
  onClose: () => void;
}

function GlobalSearchPanel({ currentFolder, onOpenFile, onClose }: GlobalSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [filePattern, setFilePattern] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || !currentFolder) return;
    
    setIsSearching(true);
    setError(null);
    abortRef.current = false;
    
    try {
      const result = await invoke<SearchResult>('global_search', {
        directory: currentFolder,
        query: query.trim(),
        caseSensitive,
        useRegex,
        filePattern: filePattern.trim() || null,
        maxResults: 500,
      });
      
      if (!abortRef.current) {
        setResults(result);
      }
    } catch (err) {
      if (!abortRef.current) {
        setError(String(err));
      }
    } finally {
      if (!abortRef.current) {
        setIsSearching(false);
      }
    }
  }, [query, currentFolder, caseSensitive, useRegex, filePattern]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const highlightMatch = (line: string, start: number, end: number) => {
    const before = line.substring(0, start);
    const match = line.substring(start, end);
    const after = line.substring(end);
    
    return (
      <>
        <span>{before}</span>
        <mark className="search-highlight">{match}</mark>
        <span>{after}</span>
      </>
    );
  };

  const getRelativePath = (fullPath: string) => {
    if (currentFolder && fullPath.startsWith(currentFolder)) {
      return fullPath.substring(currentFolder.length + 1);
    }
    return fullPath;
  };

  // Group results by file
  const groupedResults = results?.matches.reduce((acc, match) => {
    if (!acc[match.path]) {
      acc[match.path] = [];
    }
    acc[match.path].push(match);
    return acc;
  }, {} as Record<string, SearchMatch[]>);

  return (
    <div className="global-search-panel">
      <div className="search-header">
        <h3><Search size={16} /> Global Search</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="search-input-section">
        <div className="search-input-row">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search in files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="search-input"
          />
          <button 
            className="search-btn"
            onClick={handleSearch}
            disabled={isSearching || !currentFolder}
          >
            {isSearching ? <Loader2 size={14} className="spin" /> : <Search size={16} />}
          </button>
        </div>
        
        <div className="search-options">
          <label className="option">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
            />
            <span>Aa</span>
            <span className="option-label">Case sensitive</span>
          </label>
          
          <label className="option">
            <input
              type="checkbox"
              checked={useRegex}
              onChange={(e) => setUseRegex(e.target.checked)}
            />
            <span>.*</span>
            <span className="option-label">Regex</span>
          </label>
          
          <input
            type="text"
            placeholder="File filter (e.g. \.tsx?$)"
            value={filePattern}
            onChange={(e) => setFilePattern(e.target.value)}
            className="file-pattern-input"
          />
        </div>
      </div>
      
      {!currentFolder && (
        <div className="no-folder-message">
          <FolderOpen size={16} /> Open a folder first to enable global search
        </div>
      )}
      
      {error && (
        <div className="search-error">
          <X size={14} /> {error}
        </div>
      )}
      
      {results && (
        <div className="search-stats">
          <span className="stat">
            <Zap size={12} /> {results.duration_ms}ms
          </span>
          <span className="stat">
            <File size={12} /> {results.total_files_searched} files
          </span>
          <span className="stat">
            <Target size={12} /> {results.total_matches} matches
            {results.total_matches > results.matches.length && 
              ` (showing ${results.matches.length})`
            }
          </span>
        </div>
      )}
      
      <div className="search-results">
        {groupedResults && Object.entries(groupedResults).map(([path, matches]) => (
          <div key={path} className="result-file">
            <div 
              className="result-file-header"
              onClick={() => onOpenFile(path)}
            >
              <span className="file-icon"><File size={12} /></span>
              <span className="file-path">{getRelativePath(path)}</span>
              <span className="match-count">{matches.length}</span>
            </div>
            
            <div className="result-lines">
              {matches.slice(0, 10).map((match, idx) => (
                <div
                  key={idx}
                  className="result-line"
                  onClick={() => onOpenFile(path, match.line_number)}
                >
                  <span className="line-number">{match.line_number}</span>
                  <span className="line-content">
                    {highlightMatch(match.line_content, match.match_start, match.match_end)}
                  </span>
                </div>
              ))}
              {matches.length > 10 && (
                <div className="more-matches">
                  +{matches.length - 10} more matches
                </div>
              )}
            </div>
          </div>
        ))}
        
        {results && results.matches.length === 0 && (
          <div className="no-results">
            No matches found for "{query}"
          </div>
        )}
      </div>
    </div>
  );
}

export default GlobalSearchPanel;
