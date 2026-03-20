import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/tauri';
import { Lock, Unlock, Key, AlertTriangle, Shield, Eye, EyeOff, File, Check, Loader2, X, FileText, Copy } from '../icons';
import './EncryptionPanel.css';

interface EncryptionPanelProps {
  activeFilePath: string | null;
  activeFileContent: string;
  onContentDecrypted: (content: string) => void;
  onClose: () => void;
}

type Mode = 'encrypt' | 'decrypt';

function EncryptionPanel({ activeFilePath, activeFileContent, onContentDecrypted, onClose }: EncryptionPanelProps) {
  const [mode, setMode] = useState<Mode>('encrypt');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasConfirmedWarning, setHasConfirmedWarning] = useState(false);

  const handleEncrypt = useCallback(async () => {
    if (!password) {
      setError('Password is required');
      return;
    }
    
    if (mode === 'encrypt' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Show warning for encryption
    if (mode === 'encrypt' && !hasConfirmedWarning) {
      setHasConfirmedWarning(true);
      return; // Will show warning UI
    }
    
    setIsProcessing(true);
    setError(null);
    setResult(null);
    
    try {
      if (mode === 'encrypt') {
        const encrypted = await invoke<string>('encrypt_text', {
          plaintext: activeFileContent,
          password,
        });
        setResult(encrypted);
      } else {
        const decrypted = await invoke<string>('decrypt_text', {
          encryptedJson: activeFileContent,
          password,
        });
        setResult(decrypted);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsProcessing(false);
    }
  }, [mode, password, confirmPassword, activeFileContent, hasConfirmedWarning]);

  const handleApplyResult = () => {
    if (result) {
      onContentDecrypted(result);
      onClose();
    }
  };

  const handleCopyResult = async () => {
    if (result) {
      await navigator.clipboard.writeText(result);
    }
  };

  const resetWarning = () => {
    setHasConfirmedWarning(false);
  };

  const getPasswordStrength = (pwd: string): { level: number; text: string; color: string } => {
    if (!pwd) return { level: 0, text: '', color: '' };
    
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    
    if (score <= 2) return { level: score, text: 'Weak', color: '#f44336' };
    if (score <= 3) return { level: score, text: 'Medium', color: '#ff9800' };
    return { level: score, text: 'Strong', color: '#4caf50' };
  };

  const strength = getPasswordStrength(password);
  const isEncryptedContent = activeFileContent.trim().startsWith('{"salt":');

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal encryption-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><Lock size={16} /> Local Encryption</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          {/* TRUST BADGES - Always visible */}
          <div className="trust-badges">
            <div className="trust-badge">
              <span className="badge-icon"><Lock size={14} /></span>
              <span className="badge-text">100% Local</span>
              <span className="badge-desc">Nothing leaves your device</span>
            </div>
            <div className="trust-badge">
              <span className="badge-icon"><Key size={14} /></span>
              <span className="badge-text">Your Key Only</span>
              <span className="badge-desc">We never see your password</span>
            </div>
            <div className="trust-badge warning">
              <span className="badge-icon"><AlertTriangle size={14} /></span>
              <span className="badge-text">No Recovery</span>
              <span className="badge-desc">Lost password = lost data</span>
            </div>
          </div>

          <div className="mode-selector">
            <button
              className={`mode-btn ${mode === 'encrypt' ? 'active' : ''}`}
              onClick={() => { setMode('encrypt'); resetWarning(); }}
            >
              <Lock size={14} /> Encrypt
            </button>
            <button
              className={`mode-btn ${mode === 'decrypt' ? 'active' : ''}`}
              onClick={() => { setMode('decrypt'); resetWarning(); }}
            >
              <Unlock size={16} /> Decrypt
            </button>
          </div>

          {/* File status indicator */}
          <div className={`file-status ${isEncryptedContent ? 'encrypted' : 'plaintext'}`}>
            {isEncryptedContent ? (
              <>
                <span className="status-icon"><Lock size={14} /></span>
                <span>This file is <strong>ENCRYPTED</strong></span>
              </>
            ) : (
              <>
                <span className="status-icon"><File size={14} /></span>
                <span>This file is <strong>PLAINTEXT</strong></span>
              </>
            )}
          </div>
          
          {isEncryptedContent && mode === 'encrypt' && (
            <div className="info-message warning">
              <AlertTriangle size={14} /> This file is already encrypted. Encrypting again will double-encrypt it.
            </div>
          )}
          
          {!isEncryptedContent && mode === 'decrypt' && (
            <div className="info-message warning">
              <AlertTriangle size={14} /> This file doesn't appear to be encrypted.
            </div>
          )}
          
          <div className="password-section">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="password-input"
              />
              <button
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                type="button"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            
            {mode === 'encrypt' && password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{
                      width: `${(strength.level / 5) * 100}%`,
                      background: strength.color,
                    }}
                  />
                </div>
                <span style={{ color: strength.color }}>{strength.text}</span>
              </div>
            )}
          </div>
          
          {mode === 'encrypt' && (
            <div className="password-section">
              <label>Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password..."
                className="password-input"
              />
              {password && confirmPassword && password !== confirmPassword && (
                <span className="password-mismatch">Passwords don't match</span>
              )}
            </div>
          )}

          {/* WARNING CONFIRMATION for encryption */}
          {mode === 'encrypt' && hasConfirmedWarning && !result && (
            <div className="critical-warning">
              <div className="warning-header">
                <span className="warning-icon"><AlertTriangle size={14} /></span>
                <span>CRITICAL: Read Before Proceeding</span>
              </div>
              <ul className="warning-list">
                <li><Key size={14} /> <strong>Only you</strong> know this password</li>
                <li><X size={14} /> <strong>We cannot recover</strong> your password</li>
                <li><AlertTriangle size={14} /> <strong>If you forget it</strong>, your data is <strong>permanently lost</strong></li>
                <li><FileText size={14} /> <strong>Write it down</strong> and store it safely</li>
              </ul>
              <div className="warning-actions">
                <button className="cancel-btn" onClick={resetWarning}>
                  ← Go Back
                </button>
                <button 
                  className="proceed-btn"
                  onClick={handleEncrypt}
                  disabled={isProcessing}
                >
                  {isProcessing ? <><Loader2 size={14} className="spin" /> Encrypting...</> : <><Lock size={14} /> I Understand, Encrypt</>}
                </button>
              </div>
            </div>
          )}
          
          {/* Normal action button (before warning confirmation) */}
          {!(mode === 'encrypt' && hasConfirmedWarning) && !result && (
            <button
              className="action-btn"
              onClick={handleEncrypt}
              disabled={isProcessing || !password || (mode === 'encrypt' && password !== confirmPassword)}
            >
              {isProcessing ? <><Loader2 size={14} className="spin" /> Processing...</> : mode === 'encrypt' ? <><Lock size={14} /> Encrypt File</> : <><Unlock size={16} /> Decrypt File</>}
            </button>
          )}

          {/* Crypto info */}
          <div className="encryption-info">
            <div className="info-header"><Shield size={16} /> Security Details</div>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Algorithm</span>
                <span className="info-value">AES-256-GCM</span>
              </div>
              <div className="info-item">
                <span className="info-label">Key Derivation</span>
                <span className="info-value">Argon2id</span>
              </div>
              <div className="info-item">
                <span className="info-label">Data Location</span>
                <span className="info-value">Local Only</span>
              </div>
              <div className="info-item">
                <span className="info-label">Network</span>
                <span className="info-value">None (Offline)</span>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="error-message">
              <X size={14} /> {error}
            </div>
          )}
          
          {result && (
            <div className="result-section">
              <div className="result-header">
                <span><Check size={14} /> {mode === 'encrypt' ? 'Encrypted' : 'Decrypted'} Successfully!</span>
                <div className="result-actions">
                  <button onClick={handleCopyResult} title="Copy to clipboard">
                    <Copy size={14} /> Copy
                  </button>
                  <button onClick={handleApplyResult} className="apply-btn">
                    <Check size={12} strokeWidth={1.75} /> Apply to File
                  </button>
                </div>
              </div>
              <pre className="result-preview">
                {result.substring(0, 300)}
                {result.length > 300 && '...'}
              </pre>
            </div>
          )}
          
          {activeFilePath && (
            <div className="file-info">
              <span className="file-label">Current file:</span>
              <span className="file-path">{activeFilePath.split('/').pop()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default EncryptionPanel;
