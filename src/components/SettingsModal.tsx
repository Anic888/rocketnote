import { createPortal } from 'react-dom';
import { Settings as SettingsIcon } from '../icons';
import { EditorSettings } from '../types';
import './SettingsModal.css';

interface SettingsModalProps {
  settings: EditorSettings;
  onUpdate: (settings: Partial<EditorSettings>) => void;
  onClose: () => void;
}

function SettingsModal({ settings, onUpdate, onClose }: SettingsModalProps) {
  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><SettingsIcon size={20} strokeWidth={1.75} /> Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="settings-group">
            <h3>Appearance</h3>

            <div className="settings-row">
              <label>Theme Style</label>
              <div className="theme-style-cards">
                {(['dark-glass', 'ultra-dark', 'glassmorphism'] as const).map(style => (
                  <button
                    key={style}
                    className={`theme-card ${settings.themeStyle === style ? 'active' : ''}`}
                    onClick={() => onUpdate({ themeStyle: style })}
                  >
                    <span className="theme-card-label">
                      {style === 'dark-glass' ? 'Dark Glass' : style === 'ultra-dark' ? 'Ultra Dark' : 'Glass'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <label>Color Mode</label>
              <select
                value={settings.colorMode}
                onChange={(e) => onUpdate({ colorMode: e.target.value as 'dark' | 'light' | 'system' })}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </div>

            <div className="settings-row">
              <label>Accent Color</label>
              <div className="accent-color-options">
                {([
                  { id: 'indigo', color: '#6366f1' },
                  { id: 'blue', color: '#3b82f6' },
                  { id: 'emerald', color: '#10b981' },
                  { id: 'violet', color: '#8b5cf6' },
                  { id: 'rose', color: '#f43f5e' },
                ] as const).map(accent => (
                  <button
                    key={accent.id}
                    className={`accent-btn ${settings.accentColor === accent.id ? 'active' : ''}`}
                    style={{ backgroundColor: accent.color }}
                    onClick={() => onUpdate({ accentColor: accent.id })}
                    title={accent.id.charAt(0).toUpperCase() + accent.id.slice(1)}
                  />
                ))}
              </div>
            </div>

            <div className="settings-row">
              <label>Font Size</label>
              <input
                type="number"
                min="8"
                max="32"
                value={settings.fontSize}
                onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 14 })}
              />
            </div>

            <div className="settings-row">
              <label>Show Minimap</label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings.minimap}
                  onChange={(e) => onUpdate({ minimap: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="settings-row">
              <label>Line Numbers</label>
              <select
                value={settings.lineNumbers}
                onChange={(e) => onUpdate({ lineNumbers: e.target.value as 'on' | 'off' | 'relative' })}
              >
                <option value="on">On</option>
                <option value="off">Off</option>
                <option value="relative">Relative</option>
              </select>
            </div>
          </div>
          
          <div className="settings-group">
            <h3>Editor</h3>
            
            <div className="settings-row">
              <label>Tab Size</label>
              <select
                value={settings.tabSize}
                onChange={(e) => onUpdate({ tabSize: parseInt(e.target.value) })}
              >
                <option value="2">2 spaces</option>
                <option value="4">4 spaces</option>
                <option value="8">8 spaces</option>
              </select>
            </div>
            
            <div className="settings-row">
              <label>Word Wrap</label>
              <select
                value={settings.wordWrap}
                onChange={(e) => onUpdate({ wordWrap: e.target.value as 'on' | 'off' | 'wordWrapColumn' })}
              >
                <option value="off">Off</option>
                <option value="on">On</option>
                <option value="wordWrapColumn">At Column</option>
              </select>
            </div>
          </div>
          
          <div className="settings-group">
            <h3>Saving</h3>
            
            <div className="settings-row">
              <label>Auto Save</label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) => onUpdate({ autoSave: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            {settings.autoSave && (
              <div className="settings-row">
                <label>Auto Save Delay</label>
                <select
                  value={settings.autoSaveDelay}
                  onChange={(e) => onUpdate({ autoSaveDelay: parseInt(e.target.value) })}
                >
                  <option value="1000">1 second</option>
                  <option value="3000">3 seconds</option>
                  <option value="5000">5 seconds</option>
                  <option value="10000">10 seconds</option>
                </select>
              </div>
            )}
            
            <div className="settings-row">
              <label>Format JSON on Save</label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings.formatOnSave}
                  onChange={(e) => onUpdate({ formatOnSave: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
          
          <div className="settings-shortcuts">
            <h3>Keyboard Shortcuts</h3>
            <div className="shortcuts-grid">
              <div className="shortcut"><span className="shortcut-keys">⌘N</span><span>New File</span></div>
              <div className="shortcut"><span className="shortcut-keys">⌘O</span><span>Open File</span></div>
              <div className="shortcut"><span className="shortcut-keys">⌘S</span><span>Save</span></div>
              <div className="shortcut"><span className="shortcut-keys">⌘⇧S</span><span>Save As</span></div>
              <div className="shortcut"><span className="shortcut-keys">⌘W</span><span>Close Tab</span></div>
              <div className="shortcut"><span className="shortcut-keys">⌘F</span><span>Find</span></div>
              <div className="shortcut"><span className="shortcut-keys">⌘Z</span><span>Undo</span></div>
              <div className="shortcut"><span className="shortcut-keys">⌘⇧Z</span><span>Redo</span></div>
              <div className="shortcut"><span className="shortcut-keys">⌘B</span><span>Toggle Sidebar</span></div>
              <div className="shortcut"><span className="shortcut-keys">⌘`</span><span>Terminal</span></div>
              <div className="shortcut"><span className="shortcut-keys">⌘⇧G</span><span>Git Panel</span></div>
              <div className="shortcut"><span className="shortcut-keys">⌘K</span><span>AI Assistant</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default SettingsModal;
