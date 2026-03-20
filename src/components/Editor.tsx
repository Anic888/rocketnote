import { forwardRef, useImperativeHandle, useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Tab, EditorSettings } from '../types';
import './Editor.css';

interface EditorProps {
  tab: Tab;
  settings: EditorSettings;
  onChange: (content: string) => void;
  onCursorChange: (position: { line: number; column: number }) => void;
  searchQuery?: string;
  searchCaseSensitive?: boolean;
  searchWholeWord?: boolean;
  searchUseRegex?: boolean;
}

export interface EditorRef {
  focus: () => void;
  search: (query: string) => void;
  getSelectedText: () => string;
  undo: () => void;
  redo: () => void;
  replace: (search: string, replacement: string, all?: boolean) => number;
  navigateSearch: (direction: 'next' | 'prev', query: string, caseSensitive: boolean, wholeWord: boolean, useRegex: boolean) => void;
}

const Editor = forwardRef<EditorRef, EditorProps>(({ 
  tab, 
  settings, 
  onChange, 
  onCursorChange,
  searchQuery = '',
  searchCaseSensitive = false,
  searchWholeWord = false,
  searchUseRegex = false,
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const [lineCount, setLineCount] = useState(1);
  const [fontSize, setFontSize] = useState(settings.fontSize);
  const [minimapScroll, setMinimapScroll] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matchPositions, setMatchPositions] = useState<number[]>([]);
  
  // Undo/Redo stack
  const undoStackRef = useRef<{ content: string; cursorPos: number }[]>([]);
  const redoStackRef = useRef<{ content: string; cursorPos: number }[]>([]);
  const lastPushedContentRef = useRef<string>(tab.content);
  
  // Push to undo stack on significant changes (debounced)
  const pushUndoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushUndo = useCallback((content: string, cursorPos: number) => {
    if (pushUndoRef.current) clearTimeout(pushUndoRef.current);
    pushUndoRef.current = setTimeout(() => {
      if (content !== lastPushedContentRef.current) {
        undoStackRef.current.push({ content: lastPushedContentRef.current, cursorPos });
        // Limit stack size
        if (undoStackRef.current.length > 200) undoStackRef.current.shift();
        redoStackRef.current = []; // Clear redo on new change
        lastPushedContentRef.current = content;
      }
    }, 300);
  }, []);
  
  // Reset undo stack when switching tabs
  useEffect(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    lastPushedContentRef.current = tab.content;
  }, [tab.id]);

  // Sync fontSize with settings
  useEffect(() => {
    setFontSize(settings.fontSize);
  }, [settings.fontSize]);

  // Calculate line numbers
  useEffect(() => {
    const lines = tab.content.split('\n').length;
    setLineCount(lines);
  }, [tab.content]);

  // Calculate match positions for navigation
  useEffect(() => {
    if (!searchQuery) {
      setMatchPositions([]);
      setCurrentMatchIndex(0);
      return;
    }

    try {
      let pattern = searchQuery;
      if (!searchUseRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      if (searchWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      
      const flags = searchCaseSensitive ? 'g' : 'gi';
      const regex = new RegExp(pattern, flags);
      const positions: number[] = [];
      let match;
      
      while ((match = regex.exec(tab.content)) !== null) {
        positions.push(match.index);
      }
      
      setMatchPositions(positions);
      if (positions.length > 0 && currentMatchIndex === 0) {
        setCurrentMatchIndex(1);
      }
    } catch {
      setMatchPositions([]);
    }
  }, [searchQuery, tab.content, searchCaseSensitive, searchWholeWord, searchUseRegex]);

  // Sync scroll between line numbers, textarea and highlight
  const handleScroll = useCallback(() => {
    if (textareaRef.current) {
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
      }
      if (highlightRef.current) {
        highlightRef.current.scrollTop = textareaRef.current.scrollTop;
        highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
      
      const scrollPercent = textareaRef.current.scrollTop / 
        (textareaRef.current.scrollHeight - textareaRef.current.clientHeight);
      setMinimapScroll(isNaN(scrollPercent) ? 0 : scrollPercent);
    }
  }, []);

  // Handle content change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    pushUndo(newContent, e.target.selectionStart);
    onChange(newContent);
  }, [onChange, pushUndo]);

  // Handle cursor position
  const handleSelect = useCallback(() => {
    if (textareaRef.current) {
      const text = textareaRef.current.value;
      const selectionStart = textareaRef.current.selectionStart;
      
      const textBeforeCursor = text.substring(0, selectionStart);
      const lines = textBeforeCursor.split('\n');
      const line = lines.length;
      const column = lines[lines.length - 1].length + 1;
      
      onCursorChange({ line, column });
    }
  }, [onCursorChange]);

  // Handle Tab key
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = ' '.repeat(settings.tabSize);

      const newValue = tab.content.substring(0, start) + spaces + tab.content.substring(end);
      onChange(newValue);

      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + settings.tabSize;
      });
    }
  }, [tab.content, settings.tabSize, onChange]);

  // Handle zoom with Cmd/Ctrl + mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1;
      setFontSize(prev => Math.min(32, Math.max(10, prev + delta)));
    }
  }, []);

  // Click on minimap to scroll
  const handleMinimapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (textareaRef.current && minimapRef.current) {
      const rect = minimapRef.current.getBoundingClientRect();
      const clickPercent = (e.clientY - rect.top) / rect.height;
      const scrollTarget = clickPercent * (textareaRef.current.scrollHeight - textareaRef.current.clientHeight);
      textareaRef.current.scrollTop = scrollTarget;
    }
  }, []);

  // Navigate to match position
  const scrollToMatch = useCallback((index: number) => {
    if (!textareaRef.current || matchPositions.length === 0) return;
    
    const pos = matchPositions[index];
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(pos, pos + searchQuery.length);
    
    // Scroll to make selection visible
    const text = tab.content.substring(0, pos);
    const lines = text.split('\n');
    const lineHeight = fontSize * 1.5;
    const targetScroll = (lines.length - 5) * lineHeight;
    textareaRef.current.scrollTop = Math.max(0, targetScroll);
  }, [matchPositions, searchQuery, tab.content, fontSize]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    search: (query: string) => {
      if (textareaRef.current && query) {
        const text = textareaRef.current.value;
        const index = text.toLowerCase().indexOf(query.toLowerCase());
        if (index !== -1) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(index, index + query.length);
        }
      }
    },
    getSelectedText: () => {
      if (textareaRef.current) {
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        return textareaRef.current.value.substring(start, end);
      }
      return '';
    },
    undo: () => {
      // Flush any pending undo push
      if (pushUndoRef.current) {
        clearTimeout(pushUndoRef.current);
        pushUndoRef.current = null;
      }
      if (tab.content !== lastPushedContentRef.current) {
        undoStackRef.current.push({ content: lastPushedContentRef.current, cursorPos: textareaRef.current?.selectionStart || 0 });
        lastPushedContentRef.current = tab.content;
      }
      
      const entry = undoStackRef.current.pop();
      if (entry) {
        redoStackRef.current.push({ content: tab.content, cursorPos: textareaRef.current?.selectionStart || 0 });
        lastPushedContentRef.current = entry.content;
        onChange(entry.content);
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = entry.cursorPos;
          }
        });
      }
    },
    redo: () => {
      const entry = redoStackRef.current.pop();
      if (entry) {
        undoStackRef.current.push({ content: tab.content, cursorPos: textareaRef.current?.selectionStart || 0 });
        lastPushedContentRef.current = entry.content;
        onChange(entry.content);
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = entry.cursorPos;
          }
        });
      }
    },
    replace: (search: string, replacement: string, all: boolean = false) => {
      if (!textareaRef.current || !search) return 0;
      
      const text = textareaRef.current.value;
      let count = 0;
      
      if (all) {
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = text.match(regex);
        count = matches ? matches.length : 0;
        const newText = text.replace(regex, replacement);
        onChange(newText);
      } else {
        const index = text.toLowerCase().indexOf(search.toLowerCase());
        if (index !== -1) {
          const newText = text.substring(0, index) + replacement + text.substring(index + search.length);
          onChange(newText);
          count = 1;
          
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.setSelectionRange(index, index + replacement.length);
            }
          });
        }
      }
      
      return count;
    },
    navigateSearch: (direction: 'next' | 'prev') => {
      if (matchPositions.length === 0) return;
      
      let newIndex: number;
      if (direction === 'next') {
        newIndex = currentMatchIndex >= matchPositions.length ? 0 : currentMatchIndex;
      } else {
        newIndex = currentMatchIndex <= 1 ? matchPositions.length - 1 : currentMatchIndex - 2;
      }
      
      setCurrentMatchIndex(newIndex + 1);
      scrollToMatch(newIndex);
    },
  }));

  const lineNumbers = useMemo(() => 
    Array.from({ length: lineCount }, (_, i) => i + 1), 
    [lineCount]
  );

  const editorStyle = {
    fontSize: `${fontSize}px`,
    fontFamily: "'SF Mono', 'Monaco', 'Menlo', 'Courier New', monospace",
    lineHeight: '1.5',
  };

  // Generate highlighted content
  const getHighlightedContent = useCallback(() => {
    if (!searchQuery) return tab.content;
    
    try {
      let pattern = searchQuery;
      if (!searchUseRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      if (searchWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      
      const flags = searchCaseSensitive ? 'g' : 'gi';
      const regex = new RegExp(`(${pattern})`, flags);
      
      return tab.content.split(regex).map((part) => {
        regex.lastIndex = 0; // Reset BEFORE test to avoid skipping matches
        if (regex.test(part)) {
          return `<mark class="search-highlight">${part.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</mark>`;
        }
        return part.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }).join('');
    } catch {
      return tab.content;
    }
  }, [tab.content, searchQuery, searchCaseSensitive, searchWholeWord, searchUseRegex]);

  // Calculate minimap viewport height
  const minimapViewportHeight = textareaRef.current 
    ? Math.max(20, (textareaRef.current.clientHeight / textareaRef.current.scrollHeight) * 100)
    : 20;

  return (
    <div className={`editor-wrapper ${settings.theme}`} onWheel={handleWheel}>
      {settings.lineNumbers !== 'off' && (
        <div 
          ref={lineNumbersRef}
          className="line-numbers"
          style={editorStyle}
        >
          {lineNumbers.map(num => (
            <div key={num} className="line-number">{num}</div>
          ))}
        </div>
      )}
      <div className="editor-content">
        {searchQuery && (
          <div 
            ref={highlightRef}
            className="highlight-layer"
            style={editorStyle}
            dangerouslySetInnerHTML={{ __html: getHighlightedContent() }}
          />
        )}
        <textarea
          ref={textareaRef}
          className={`editor-textarea ${searchQuery ? 'with-highlights' : ''}`}
          value={tab.content}
          onChange={handleChange}
          onScroll={handleScroll}
          onSelect={handleSelect}
          onKeyDown={handleKeyDown}
          onClick={handleSelect}
          onKeyUp={handleSelect}
          style={editorStyle}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          wrap={settings.wordWrap === 'on' ? 'soft' : 'off'}
        />
      </div>
      {settings.minimap && (
        <div 
          ref={minimapRef}
          className="minimap"
          onClick={handleMinimapClick}
        >
          <div className="minimap-content">
            {(() => {
              const lines = tab.content.split('\n');
              const MAX_MINIMAP_LINES = 500;
              
              if (lines.length <= MAX_MINIMAP_LINES) {
                return lines.map((line, i) => (
                  <div key={i} className="minimap-line">
                    {line.substring(0, 80)}
                  </div>
                ));
              }
              
              // For large files: sample lines proportionally
              const step = lines.length / MAX_MINIMAP_LINES;
              return Array.from({ length: MAX_MINIMAP_LINES }, (_, i) => {
                const lineIdx = Math.floor(i * step);
                return (
                  <div key={lineIdx} className="minimap-line">
                    {lines[lineIdx]?.substring(0, 80) || ''}
                  </div>
                );
              });
            })()}
          </div>
          <div 
            className="minimap-viewport"
            style={{
              top: `${minimapScroll * (100 - minimapViewportHeight)}%`,
              height: `${minimapViewportHeight}%`,
            }}
          />
        </div>
      )}
    </div>
  );
});

Editor.displayName = 'Editor';

export default Editor;
