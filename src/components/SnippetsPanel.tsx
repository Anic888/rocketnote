import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/tauri';
import { Snippet } from '../types';
import { Scissors, Pencil, ClipboardList, Trash2, Plus, Lightbulb, Save, Search } from '../icons';
import './SnippetsPanel.css';

interface SnippetsPanelProps {
  currentLanguage: string;
  onInsert: (body: string) => void;
  onClose: () => void;
}

function SnippetsPanel({ currentLanguage, onInsert, onClose }: SnippetsPanelProps) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Partial<Snippet>>({});
  const [filter, setFilter] = useState('');

  const loadSnippets = async () => {
    try {
      const list = await invoke<Snippet[]>('list_snippets');
      setSnippets(list);
    } catch (error) {
      console.error('Error loading snippets:', error);
    }
  };

  useEffect(() => {
    loadSnippets();
  }, []);

  const handleSave = async () => {
    if (!editingSnippet.name || !editingSnippet.body) return;
    
    const snippet: Snippet = {
      id: editingSnippet.id || `snippet-${Date.now()}`,
      name: editingSnippet.name,
      prefix: editingSnippet.prefix || '',
      body: editingSnippet.body,
      language: editingSnippet.language || 'plaintext',
      description: editingSnippet.description,
    };
    
    try {
      await invoke('save_snippet', { snippet });
      setIsEditing(false);
      setEditingSnippet({});
      loadSnippets();
    } catch (error) {
      alert(`Error saving snippet: ${error}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this snippet?')) return;
    
    try {
      await invoke('delete_snippet', { id });
      loadSnippets();
    } catch (error) {
      alert(`Error deleting snippet: ${error}`);
    }
  };

  const startEdit = (snippet?: Snippet) => {
    setEditingSnippet(snippet || { language: currentLanguage });
    setIsEditing(true);
  };

  const handleInsert = (body: string) => {
    onInsert(body);
    onClose();
  };

  const filteredSnippets = snippets.filter(s => {
    const matchesFilter = !filter || 
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      s.prefix.toLowerCase().includes(filter.toLowerCase());
    return matchesFilter;
  });

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal snippets-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><Scissors size={16} /> Code Snippets</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          {isEditing ? (
            <div className="snippet-editor">
              <h3>{editingSnippet.id ? <><Pencil size={14} /> Edit Snippet</> : <><Plus size={14} /> New Snippet</>}</h3>
              
              <div className="form-row">
                <label>Name</label>
                <input
                  type="text"
                  value={editingSnippet.name || ''}
                  onChange={(e) => setEditingSnippet(s => ({ ...s, name: e.target.value }))}
                  placeholder="My Snippet"
                />
              </div>
              
              <div className="form-row-group">
                <div className="form-row">
                  <label>Prefix (trigger)</label>
                  <input
                    type="text"
                    value={editingSnippet.prefix || ''}
                    onChange={(e) => setEditingSnippet(s => ({ ...s, prefix: e.target.value }))}
                    placeholder="log"
                  />
                </div>
                
                <div className="form-row">
                  <label>Language</label>
                  <select
                    value={editingSnippet.language || 'plaintext'}
                    onChange={(e) => setEditingSnippet(s => ({ ...s, language: e.target.value }))}
                  >
                    <option value="plaintext">All Languages</option>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="rust">Rust</option>
                    <option value="go">Go</option>
                    <option value="java">Java</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="sql">SQL</option>
                    <option value="json">JSON</option>
                    <option value="markdown">Markdown</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <label>Description (optional)</label>
                <input
                  type="text"
                  value={editingSnippet.description || ''}
                  onChange={(e) => setEditingSnippet(s => ({ ...s, description: e.target.value }))}
                  placeholder="What does this snippet do?"
                />
              </div>
              
              <div className="form-row">
                <label>Code Body</label>
                <textarea
                  value={editingSnippet.body || ''}
                  onChange={(e) => setEditingSnippet(s => ({ ...s, body: e.target.value }))}
                  placeholder="console.log('$1');"
                  rows={8}
                />
                <span className="hint"><Lightbulb size={14} /> Use $1, $2 for tab stops, $0 for final cursor position</span>
              </div>
              
              <div className="form-actions">
                <button onClick={() => setIsEditing(false)}>Cancel</button>
                <button onClick={handleSave} className="primary" disabled={!editingSnippet.name || !editingSnippet.body}>
                  <Save size={14} /> Save Snippet
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="snippets-toolbar">
                <div className="search-box">
                  <span className="search-icon"><Search size={14} /></span>
                  <input
                    type="text"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Search snippets..."
                  />
                </div>
                <button onClick={() => startEdit()} className="add-btn">
                  <Plus size={14} /> New Snippet
                </button>
              </div>

              <div className="snippets-list">
                {filteredSnippets.length === 0 ? (
                  <div className="no-snippets">
                    <span className="empty-icon"><Scissors size={16} /></span>
                    <p>No snippets yet</p>
                    <button onClick={() => startEdit()}>Create your first snippet</button>
                  </div>
                ) : (
                  filteredSnippets.map(snippet => (
                    <div key={snippet.id} className="snippet-item">
                      <div className="snippet-info" onClick={() => handleInsert(snippet.body)}>
                        <div className="snippet-header">
                          <span className="snippet-name">{snippet.name}</span>
                          {snippet.prefix && (
                            <span className="snippet-prefix">{snippet.prefix}</span>
                          )}
                        </div>
                        {snippet.description && (
                          <span className="snippet-desc">{snippet.description}</span>
                        )}
                        <div className="snippet-meta">
                          <span className="snippet-lang">{snippet.language}</span>
                          <span className="snippet-lines">{snippet.body.split('\n').length} lines</span>
                        </div>
                      </div>
                      <div className="snippet-actions">
                        <button onClick={() => handleInsert(snippet.body)} title="Insert"><ClipboardList size={14} /></button>
                        <button onClick={() => startEdit(snippet)} title="Edit"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(snippet.id)} title="Delete" className="delete"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="snippets-footer">
                <span>{snippets.length} snippet{snippets.length !== 1 ? 's' : ''}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default SnippetsPanel;
