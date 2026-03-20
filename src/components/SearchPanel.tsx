import { useState, useEffect, useRef, useCallback } from 'react';
import { Tab } from '../types';
import { ChevronUp, ChevronDown, ChevronRight } from '../icons';
import './SearchPanel.css';

interface SearchPanelProps {
  onClose: () => void;
  onSearch: (query: string, caseSensitive: boolean, wholeWord: boolean, useRegex: boolean) => void;
  activeTab: Tab | null;
  onReplace: (oldText: string, newText: string) => void;
  onReplaceAll: (oldText: string, newText: string, flags: string) => void;
  onNavigate: (direction: 'next' | 'prev', query: string, caseSensitive: boolean, wholeWord: boolean, useRegex: boolean) => void;
}

function SearchPanel({ onClose, onSearch, activeTab, onReplace, onReplaceAll, onNavigate }: SearchPanelProps) {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Calculate matches and trigger search
  useEffect(() => {
    if (!activeTab || !searchText) {
      setMatchCount(0);
      setCurrentMatch(0);
      onSearch('', caseSensitive, wholeWord, useRegex);
      return;
    }

    try {
      let pattern = searchText;
      
      if (!useRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      
      if (wholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(pattern, flags);
      const matches = activeTab.content.match(regex);
      
      const count = matches?.length || 0;
      setMatchCount(count);
      setCurrentMatch(count > 0 ? 1 : 0);
      
      // Trigger search highlight
      onSearch(searchText, caseSensitive, wholeWord, useRegex);
    } catch {
      setMatchCount(0);
      setCurrentMatch(0);
    }
  }, [searchText, activeTab?.content, caseSensitive, wholeWord, useRegex, onSearch]);

  const handleNext = useCallback(() => {
    if (matchCount === 0) return;
    const next = currentMatch >= matchCount ? 1 : currentMatch + 1;
    setCurrentMatch(next);
    onNavigate('next', searchText, caseSensitive, wholeWord, useRegex);
  }, [matchCount, currentMatch, searchText, caseSensitive, wholeWord, useRegex, onNavigate]);

  const handlePrev = useCallback(() => {
    if (matchCount === 0) return;
    const prev = currentMatch <= 1 ? matchCount : currentMatch - 1;
    setCurrentMatch(prev);
    onNavigate('prev', searchText, caseSensitive, wholeWord, useRegex);
  }, [matchCount, currentMatch, searchText, caseSensitive, wholeWord, useRegex, onNavigate]);

  const handleReplace = () => {
    if (!searchText || !activeTab) return;
    
    let pattern = searchText;
    if (!useRegex) {
      pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    if (wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }
    
    const flags = caseSensitive ? '' : 'i';
    const regex = new RegExp(pattern, flags);
    const newContent = activeTab.content.replace(regex, replaceText);
    
    if (newContent !== activeTab.content) {
      onReplace(activeTab.content, newContent);
    }
  };

  const handleReplaceAll = () => {
    if (!searchText || !activeTab) return;
    
    let pattern = searchText;
    if (!useRegex) {
      pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    if (wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }
    
    const flags = caseSensitive ? 'g' : 'gi';
    onReplaceAll(pattern, replaceText, flags);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    } else if (e.key === 'F3') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  return (
    <div className="search-panel" onKeyDown={handleKeyDown}>
      <div className="search-row">
        <button
          className="toggle-replace"
          onClick={() => setShowReplace(!showReplace)}
          title={showReplace ? 'Hide Replace' : 'Show Replace'}
        >
          {showReplace ? <ChevronDown size={14} strokeWidth={1.75} /> : <ChevronRight size={14} strokeWidth={1.75} />}
        </button>
        
        <div className="search-input-wrapper">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Find"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="search-input"
          />
          <span className="match-count">
            {searchText ? `${currentMatch} of ${matchCount}` : 'No results'}
          </span>
        </div>
        
        <div className="search-nav">
          <button
            className="nav-btn"
            onClick={handlePrev}
            disabled={matchCount === 0}
            title="Previous Match (Shift+Enter)"
          >
            <ChevronUp size={14} strokeWidth={1.75} />
          </button>
          <button
            className="nav-btn"
            onClick={handleNext}
            disabled={matchCount === 0}
            title="Next Match (Enter)"
          >
            <ChevronDown size={14} strokeWidth={1.75} />
          </button>
        </div>
        
        <div className="search-options">
          <button
            className={`option-btn ${caseSensitive ? 'active' : ''}`}
            onClick={() => setCaseSensitive(!caseSensitive)}
            title="Match Case (Aa) - чувствительность к регистру"
          >
            Aa
          </button>
          <button
            className={`option-btn ${wholeWord ? 'active' : ''}`}
            onClick={() => setWholeWord(!wholeWord)}
            title="Match Whole Word (Ab) - искать целое слово"
          >
            Ab
          </button>
          <button
            className={`option-btn ${useRegex ? 'active' : ''}`}
            onClick={() => setUseRegex(!useRegex)}
            title="Use Regular Expression (.*)"
          >
            .*
          </button>
        </div>
        
        <button className="close-btn" onClick={onClose} title="Close (Esc)">
          ×
        </button>
      </div>
      
      {showReplace && (
        <div className="replace-row">
          <div className="spacer" />
          <input
            type="text"
            placeholder="Replace"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            className="replace-input"
          />
          <div className="replace-actions">
            <button
              onClick={handleReplace}
              disabled={!searchText || matchCount === 0}
              title="Replace"
            >
              Replace
            </button>
            <button
              onClick={handleReplaceAll}
              disabled={!searchText || matchCount === 0}
              title="Replace All"
            >
              All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchPanel;
