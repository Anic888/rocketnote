import { useState, useEffect } from 'react';
import { Tab, EditorSettings, FileStatus } from '../types';
import { Moon, Sun, Lock, GitBranch, Save, Check } from '../icons';
import './StatusBar.css';

interface StatusBarProps {
  tab: Tab | null;
  cursorPosition: { line: number; column: number };
  settings: EditorSettings;
  onLanguageChange: (language: string) => void;
  gitBranch: string | null;
}

const LANGUAGES = [
  'plaintext', 'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'html', 'css', 'scss', 'json',
  'xml', 'yaml', 'markdown', 'sql', 'shell', 'powershell', 'dockerfile',
];

// Format relative time
function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return '';
  
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 5000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

// Get status indicator
function getStatusIndicator(status: FileStatus): { icon: string; text: string; className: string } {
  switch (status) {
    case 'clean':
      return { icon: 'check', text: 'Saved', className: 'status-clean' };
    case 'dirty':
      return { icon: '●', text: 'Unsaved', className: 'status-dirty' };
    case 'saving':
      return { icon: '↻', text: 'Saving...', className: 'status-saving' };
    case 'saved':
      return { icon: 'check', text: 'Saved!', className: 'status-saved' };
    case 'error':
      return { icon: '✗', text: 'Error', className: 'status-error' };
    default:
      return { icon: '', text: '', className: '' };
  }
}

function StatusBar({ tab, cursorPosition, settings, onLanguageChange, gitBranch }: StatusBarProps) {
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [, setTick] = useState(0);

  // Update relative time every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  const getEncoding = () => 'UTF-8';
  const getLineEnding = () => 'LF';

  const formatLanguage = (lang: string) => {
    const map: Record<string, string> = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      python: 'Python',
      java: 'Java',
      cpp: 'C++',
      csharp: 'C#',
      html: 'HTML',
      css: 'CSS',
      scss: 'SCSS',
      json: 'JSON',
      xml: 'XML',
      yaml: 'YAML',
      markdown: 'Markdown',
      sql: 'SQL',
      shell: 'Shell',
      powershell: 'PowerShell',
      dockerfile: 'Dockerfile',
      plaintext: 'Plain Text',
    };
    return map[lang] || lang.charAt(0).toUpperCase() + lang.slice(1);
  };

  if (!tab) {
    return (
      <div className="status-bar">
        <div className="status-left">
          <span className="status-item">Ready</span>
        </div>
        <div className="status-right">
          <span className="status-item">{settings.theme === 'dark' ? <><Moon size={12} strokeWidth={1.75} /> Dark</> : <><Sun size={12} strokeWidth={1.75} /> Light</>}</span>
        </div>
      </div>
    );
  }

  const lineCount = tab.content.split('\n').length;
  const charCount = tab.content.length;
  const statusInfo = getStatusIndicator(tab.status);
  const lastSavedText = formatRelativeTime(tab.lastSaved);
  const isEncrypted = tab.content.trim().startsWith('{"salt":');

  return (
    <div className="status-bar">
      <div className="status-left">
        {/* Encrypted indicator */}
        {isEncrypted && (
          <>
            <span className="status-item encrypted-indicator" title="This file is encrypted (AES-256)">
              <Lock size={12} strokeWidth={1.75} /> Encrypted
            </span>
            <span className="status-separator">|</span>
          </>
        )}
        
        {/* File status - TRUST INDICATOR */}
        <span className={`status-item status-indicator ${statusInfo.className}`} title={tab.error || statusInfo.text}>
          <span className="status-icon">{statusInfo.icon === 'check' ? <Check size={12} strokeWidth={1.75} /> : statusInfo.icon}</span>
          <span className="status-text">{statusInfo.text}</span>
          {lastSavedText && tab.status !== 'dirty' && (
            <span className="last-saved">({lastSavedText})</span>
          )}
        </span>
        
        <span className="status-separator">|</span>
        
        <span className="status-item">
          Ln {cursorPosition.line}, Col {cursorPosition.column}
        </span>
        <span className="status-separator">|</span>
        <span className="status-item">
          {lineCount} lines, {charCount.toLocaleString()} chars
        </span>
      </div>
      
      <div className="status-right">
        {gitBranch && (
          <>
            <span className="status-item git-branch"><GitBranch size={12} strokeWidth={1.75} /> {gitBranch}</span>
            <span className="status-separator">|</span>
          </>
        )}
        {settings.autoSave && (
          <>
            <span className="status-item auto-save-indicator" title="Auto-save enabled">
              <Save size={12} strokeWidth={1.75} /> Auto
            </span>
            <span className="status-separator">|</span>
          </>
        )}
        <span className="status-item">{getLineEnding()}</span>
        <span className="status-separator">|</span>
        <span className="status-item">{getEncoding()}</span>
        <span className="status-separator">|</span>
        <span className="status-item">Spaces: {settings.tabSize}</span>
        <span className="status-separator">|</span>
        <div className="language-selector">
          <button
            className="status-item clickable"
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
          >
            {formatLanguage(tab.language)}
          </button>
          {showLanguageMenu && (
            <div className="language-menu">
              {LANGUAGES.map(lang => (
                <button
                  key={lang}
                  className={`language-option ${tab.language === lang ? 'active' : ''}`}
                  onClick={() => {
                    onLanguageChange(lang);
                    setShowLanguageMenu(false);
                  }}
                >
                  {formatLanguage(lang)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StatusBar;
