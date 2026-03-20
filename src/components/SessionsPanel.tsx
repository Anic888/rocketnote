import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Tab, Session, SessionFile } from '../types';
import { Save, ClipboardList, FolderOpen, Trash2 } from '../icons';
import './SessionsPanel.css';

interface SessionsPanelProps {
  tabs: Tab[];
  onLoadSession: (files: SessionFile[]) => void;
}

function SessionsPanel({ tabs, onLoadSession }: SessionsPanelProps) {
  const [sessions, setSessions] = useState<string[]>([]);
  const [newSessionName, setNewSessionName] = useState('');
  const [loading, setLoading] = useState(false);

  const loadSessions = async () => {
    try {
      const list = await invoke<string[]>('list_sessions');
      setSessions(list);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleSaveSession = async () => {
    if (!newSessionName.trim()) return;
    
    setLoading(true);
    try {
      const files: SessionFile[] = tabs
        .filter(t => t.path)
        .map(t => ({
          path: t.path!,
          cursor_line: t.cursorLine || 1,
          cursor_column: t.cursorColumn || 1,
        }));
      
      await invoke('save_session', { name: newSessionName, files });
      setNewSessionName('');
      loadSessions();
    } catch (error) {
      alert(`Error saving session: ${error}`);
    }
    setLoading(false);
  };

  const handleLoadSession = async (name: string) => {
    setLoading(true);
    try {
      const session = await invoke<Session>('load_session', { name });
      onLoadSession(session.files);
    } catch (error) {
      alert(`Error loading session: ${error}`);
    }
    setLoading(false);
  };

  const handleDeleteSession = async (name: string) => {
    if (!confirm(`Delete session "${name}"?`)) return;
    
    try {
      await invoke('delete_session', { name });
      loadSessions();
    } catch (error) {
      alert(`Error deleting session: ${error}`);
    }
  };

  return (
    <div className="sessions-panel">
      <div className="sessions-save">
        <h4>Save Current Session</h4>
        <div className="save-form">
          <input
            type="text"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            placeholder="Session name..."
            onKeyDown={(e) => e.key === 'Enter' && handleSaveSession()}
          />
          <button onClick={handleSaveSession} disabled={loading || !newSessionName.trim()}>
            <Save size={14} /> Save
          </button>
        </div>
        <p className="save-hint">
          {tabs.filter(t => t.path).length} files will be saved
        </p>
      </div>

      <div className="sessions-list">
        <h4>Saved Sessions ({sessions.length})</h4>
        {sessions.length === 0 ? (
          <p className="no-sessions">No saved sessions yet</p>
        ) : (
          sessions.map(name => (
            <div key={name} className="session-item">
              <span className="session-name" onClick={() => handleLoadSession(name)}>
                <ClipboardList size={14} /> {name}
              </span>
              <div className="session-actions">
                <button onClick={() => handleLoadSession(name)} title="Load">
                  <FolderOpen size={14} />
                </button>
                <button onClick={() => handleDeleteSession(name)} title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SessionsPanel;
