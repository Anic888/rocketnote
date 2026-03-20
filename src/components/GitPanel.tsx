import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { GitStatus, GitCommit } from '../types';
import { GitBranch, Globe, FolderOpen, Rocket, Download, Upload, RefreshCw, Lightbulb, Check } from '../icons';
import './GitPanel.css';

interface GitPanelProps {
  folder: string | null;
}

function GitPanel({ folder }: GitPanelProps) {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'changes' | 'history' | 'branches' | 'remote'>('changes');
  const [, setLoading] = useState(false);
  const [diff, setDiff] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [showNewBranch, setShowNewBranch] = useState(false);

  const refresh = useCallback(async () => {
    if (!folder) return;
    
    setLoading(true);
    try {
      const [statusResult, commitsResult, branchesResult] = await Promise.all([
        invoke<GitStatus>('git_status', { path: folder }),
        invoke<GitCommit[]>('git_log', { path: folder, count: 50 }),
        invoke<string[]>('git_branches', { path: folder }),
      ]);
      
      setStatus(statusResult);
      setCommits(commitsResult);
      setBranches(branchesResult);
      
      // Try to get remote URL
      try {
        const remote = await invoke<string>('git_get_remote', { path: folder });
        setRemoteUrl(remote);
      } catch {
        setRemoteUrl('');
      }
    } catch (error) {
      console.error('Git error:', error);
    }
    setLoading(false);
  }, [folder]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleStage = async (filePath: string) => {
    if (!folder) return;
    await invoke('git_stage', { path: folder, filePath });
    refresh();
  };

  const handleUnstage = async (filePath: string) => {
    if (!folder) return;
    await invoke('git_unstage', { path: folder, filePath });
    refresh();
  };

  const handleStageAll = async () => {
    if (!folder) return;
    await invoke('git_stage_all', { path: folder });
    refresh();
  };

  const handleCommit = async () => {
    if (!folder || !commitMessage.trim()) return;
    
    try {
      await invoke('git_commit', { path: folder, message: commitMessage });
      setCommitMessage('');
      refresh();
    } catch (error) {
      alert(`Commit failed: ${error}`);
    }
  };

  const handlePush = async () => {
    if (!folder) return;
    try {
      const result = await invoke<string>('git_push', { path: folder });
      alert(result || 'Push successful!');
      refresh();
    } catch (error) {
      alert(`Push failed: ${error}`);
    }
  };

  const handlePull = async () => {
    if (!folder) return;
    try {
      const result = await invoke<string>('git_pull', { path: folder });
      alert(result || 'Pull successful!');
      refresh();
    } catch (error) {
      alert(`Pull failed: ${error}`);
    }
  };

  const handleInit = async () => {
    if (!folder) return;
    try {
      await invoke('git_init', { path: folder });
      refresh();
    } catch (error) {
      alert(`Init failed: ${error}`);
    }
  };

  const viewDiff = async (filePath: string) => {
    if (!folder) return;
    setSelectedFile(filePath);
    const diffResult = await invoke<string>('git_diff', { path: folder, filePath });
    setDiff(diffResult);
  };

  const handleCheckout = async (branch: string) => {
    if (!folder) return;
    try {
      await invoke('git_checkout', { path: folder, branch });
      refresh();
    } catch (error) {
      alert(`Checkout failed: ${error}`);
    }
  };

  const handleAddRemote = async () => {
    if (!folder || !remoteUrl.trim()) return;
    try {
      await invoke('git_add_remote', { path: folder, url: remoteUrl });
      alert('Remote added successfully!');
      refresh();
    } catch (error) {
      alert(`Failed to add remote: ${error}`);
    }
  };

  const handleCreateBranch = async () => {
    if (!folder || !newBranchName.trim()) return;
    try {
      await invoke('git_create_branch', { path: folder, name: newBranchName });
      setNewBranchName('');
      setShowNewBranch(false);
      refresh();
    } catch (error) {
      alert(`Failed to create branch: ${error}`);
    }
  };

  const handleDiscard = async (filePath: string) => {
    if (!folder) return;
    if (!confirm(`Discard changes to ${filePath}?`)) return;
    try {
      await invoke('git_discard', { path: folder, filePath });
      refresh();
    } catch (error) {
      alert(`Discard failed: ${error}`);
    }
  };

  if (!folder) {
    return (
      <div className="git-panel empty">
        <span className="empty-icon"><GitBranch size={16} /></span>
        <p>Open a folder to use Git</p>
      </div>
    );
  }

  if (!status?.is_repo) {
    return (
      <div className="git-panel empty">
        <span className="empty-icon"><FolderOpen size={16} /></span>
        <p>This folder is not a Git repository</p>
        <button onClick={handleInit} className="init-btn"><Rocket size={14} /> Initialize Repository</button>
      </div>
    );
  }

  const stagedFiles = status.files.filter(f => f.staged);
  const unstagedFiles = status.files.filter(f => !f.staged);

  return (
    <div className="git-panel">
      <div className="git-header">
        <div className="git-branch">
          <span className="branch-icon"><GitBranch size={16} /></span>
          <span className="branch-name">{status.branch || 'main'}</span>
          {status.ahead > 0 && <span className="ahead">↑{status.ahead}</span>}
          {status.behind > 0 && <span className="behind">↓{status.behind}</span>}
        </div>
        
        <div className="git-actions">
          <button onClick={handlePull} title="Pull from remote"><Download size={14} /></button>
          <button onClick={handlePush} title="Push to remote"><Upload size={14} /></button>
          <button onClick={refresh} title="Refresh"><RefreshCw size={14} /></button>
        </div>
      </div>

      <div className="git-tabs">
        <button className={activeTab === 'changes' ? 'active' : ''} onClick={() => setActiveTab('changes')}>
          Changes ({status.files.length})
        </button>
        <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
          History
        </button>
        <button className={activeTab === 'branches' ? 'active' : ''} onClick={() => setActiveTab('branches')}>
          Branches
        </button>
        <button className={activeTab === 'remote' ? 'active' : ''} onClick={() => setActiveTab('remote')}>
          Remote
        </button>
      </div>

      <div className="git-content">
        {activeTab === 'changes' && (
          <>
            {/* Staged files */}
            {stagedFiles.length > 0 && (
              <div className="file-section">
                <h4>Staged Changes ({stagedFiles.length})</h4>
                {stagedFiles.map(file => (
                  <div key={file.path} className="file-item staged">
                    <span className={`status-badge ${file.status}`}>{file.status[0].toUpperCase()}</span>
                    <span className="file-name" onClick={() => viewDiff(file.path)}>{file.path}</span>
                    <button onClick={() => handleUnstage(file.path)} title="Unstage">−</button>
                  </div>
                ))}
              </div>
            )}

            {/* Unstaged files */}
            {unstagedFiles.length > 0 && (
              <div className="file-section">
                <div className="section-header">
                  <h4>Changes ({unstagedFiles.length})</h4>
                  <button onClick={handleStageAll} className="stage-all-btn" title="Stage all">
                    + All
                  </button>
                </div>
                {unstagedFiles.map(file => (
                  <div key={file.path} className="file-item">
                    <span className={`status-badge ${file.status}`}>{file.status[0].toUpperCase()}</span>
                    <span className="file-name" onClick={() => viewDiff(file.path)}>{file.path}</span>
                    <div className="file-actions">
                      <button onClick={() => handleDiscard(file.path)} title="Discard changes" className="discard">↩</button>
                      <button onClick={() => handleStage(file.path)} title="Stage">+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {status.files.length === 0 && (
              <div className="no-changes"><Check size={12} strokeWidth={1.75} /> Working tree clean</div>
            )}

            {/* Commit box */}
            <div className="commit-box">
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Commit message..."
                rows={3}
              />
              <button 
                onClick={handleCommit} 
                disabled={!commitMessage.trim() || stagedFiles.length === 0}
                className="commit-btn"
              >
                <Check size={12} strokeWidth={1.75} /> Commit ({stagedFiles.length})
              </button>
            </div>

            {/* Diff view */}
            {diff && selectedFile && (
              <div className="diff-view">
                <div className="diff-header">
                  <span>{selectedFile}</span>
                  <button onClick={() => { setDiff(null); setSelectedFile(null); }}>×</button>
                </div>
                <pre className="diff-content">{diff || 'No changes'}</pre>
              </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <div className="commit-list">
            {commits.length === 0 ? (
              <div className="no-commits">No commits yet</div>
            ) : (
              commits.map(commit => (
                <div key={commit.id} className="commit-item">
                  <div className="commit-header">
                    <span className="commit-hash">{commit.short_id}</span>
                    <span className="commit-date">{commit.date.split(' ')[0]}</span>
                  </div>
                  <div className="commit-message">{commit.message}</div>
                  <div className="commit-author">{commit.author}</div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'branches' && (
          <div className="branches-content">
            {showNewBranch ? (
              <div className="new-branch-form">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="New branch name..."
                />
                <div className="form-actions">
                  <button onClick={() => setShowNewBranch(false)}>Cancel</button>
                  <button onClick={handleCreateBranch} className="primary" disabled={!newBranchName.trim()}>
                    Create
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowNewBranch(true)} className="new-branch-btn">
                + New Branch
              </button>
            )}
            
            <div className="branch-list">
              {branches.map(branch => (
                <div 
                  key={branch} 
                  className={`branch-item ${branch === status.branch ? 'current' : ''}`}
                  onClick={() => branch !== status.branch && handleCheckout(branch)}
                >
                  {branch === status.branch ? '● ' : '○ '}
                  {branch}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'remote' && (
          <div className="remote-content">
            <div className="remote-info">
              <h4><Globe size={14} /> Remote Repository</h4>
              {remoteUrl ? (
                <div className="current-remote">
                  <span className="remote-label">origin</span>
                  <span className="remote-url">{remoteUrl}</span>
                  <a href={remoteUrl.replace('.git', '')} target="_blank" rel="noopener" className="open-link">
                    ↗
                  </a>
                </div>
              ) : (
                <div className="no-remote">
                  <p>No remote configured</p>
                </div>
              )}
            </div>
            
            <div className="add-remote">
              <h4>{remoteUrl ? 'Change' : 'Add'} Remote</h4>
              <input
                type="text"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="https://github.com/username/repo.git"
              />
              <button onClick={handleAddRemote} disabled={!remoteUrl.trim()}>
                {remoteUrl ? <><Check size={12} strokeWidth={1.75} /> Update Remote</> : '+ Add Remote'}
              </button>
            </div>
            
            <div className="remote-help">
              <h4><Lightbulb size={14} /> Quick Guide</h4>
              <ol>
                <li>Create a repository on GitHub</li>
                <li>Copy the repository URL</li>
                <li>Paste it above and click Add Remote</li>
                <li>Push your code with the <Upload size={14} /> button</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GitPanel;
