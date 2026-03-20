import { Tab } from '../types';
import { getFileIcon, Lock, Check } from '../icons';
import './TabBar.css';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onNewTab: () => void;
}

// Check if content appears to be encrypted
const isEncryptedContent = (content: string) => content.trim().startsWith('{"salt":');

function TabBar({ tabs, activeTabId, onTabSelect, onTabClose, onNewTab }: TabBarProps) {
  const handleMiddleClick = (e: React.MouseEvent, tabId: string) => {
    if (e.button === 1) { // Middle click
      e.preventDefault();
      onTabClose(tabId);
    }
  };

  const getStatusIcon = (tab: Tab) => {
    // Check for encrypted content first
    if (isEncryptedContent(tab.content)) {
      return <span className="status-dot encrypted" title="Encrypted file"><Lock size={12} strokeWidth={1.75} /></span>;
    }
    
    switch (tab.status) {
      case 'dirty': return <span className="status-dot dirty" title="Unsaved changes">●</span>;
      case 'saving': return <span className="status-dot saving" title="Saving...">◐</span>;
      case 'saved': return <span className="status-dot saved" title="Saved"><Check size={12} strokeWidth={1.75} /></span>;
      case 'error': return <span className="status-dot error" title={tab.error || 'Error'}>!</span>;
      default: return null;
    }
  };

  return (
    <div className="tab-bar">
      <div className="tabs-container">
        {tabs.map((tab) => {
          const isEncrypted = isEncryptedContent(tab.content);
          return (
            <div
              key={tab.id}
              className={`tab ${tab.id === activeTabId ? 'active' : ''} ${tab.status} ${isEncrypted ? 'encrypted' : ''}`}
              onClick={() => onTabSelect(tab.id)}
              onMouseDown={(e) => handleMiddleClick(e, tab.id)}
              title={`${tab.path || tab.name}${tab.isModified ? ' (unsaved)' : ''}${isEncrypted ? ' Encrypted' : ''}`}
            >
              <span className="tab-icon">{isEncrypted ? <Lock size={14} strokeWidth={1.75} /> : (() => { const Icon = getFileIcon(tab.name, false); return <Icon size={14} strokeWidth={1.75} />; })()}</span>
              <span className="tab-name">{tab.name}</span>
              {getStatusIcon(tab)}
              <button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                title="Close"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <button className="new-tab-btn" onClick={onNewTab} title="New Tab">
        +
      </button>
    </div>
  );
}

export default TabBar;
