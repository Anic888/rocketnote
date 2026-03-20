import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/tauri';
import { Cloud, FolderOpen, Package, Check, Lock, Unlock, Loader2, File, Upload, Download, Home, Settings, Key, Shield, RefreshCw, AlertTriangle } from '../icons';
import './CloudStoragePanel.css';

interface CloudStoragePanelProps {
  onClose: () => void;
  currentFilePath: string | null;
  currentFileContent: string;
  onFileLoaded: (content: string, name: string) => void;
}

type Provider = 'google' | 'dropbox' | 'onedrive';

interface CloudFile {
  id: string;
  name: string;
  size: number;
  modified: string;
  isEncrypted: boolean;
}

interface ProviderConfig {
  name: string;
  icon: string;
  color: string;
  connected: boolean;
}

const PROVIDERS: Record<Provider, ProviderConfig> = {
  google: { name: 'Google Drive', icon: 'google', color: '#4285f4', connected: false },
  dropbox: { name: 'Dropbox', icon: 'dropbox', color: '#0061ff', connected: false },
  onedrive: { name: 'OneDrive', icon: 'onedrive', color: '#0078d4', connected: false },
};

type CredentialsState = Record<Provider, { clientId: string; clientSecret: string }>;

interface OAuthCallbackResult {
  code: string;
  state: string;
  redirect_uri: string;
}

interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string | null;
  expires_in?: number | null;
  token_type?: string | null;
  scope?: string | null;
}

interface StoredOAuthToken {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
  tokenType?: string | null;
  scope?: string | null;
}

const DEFAULT_CREDENTIALS: CredentialsState = {
  google: { clientId: '', clientSecret: '' },
  dropbox: { clientId: '', clientSecret: '' },
  onedrive: { clientId: '', clientSecret: '' },
};

const secretName = (name: string) => `secure-${name}`;

async function readSecureJson<T>(name: string): Promise<T | null> {
  try {
    const raw = await invoke<string>('get_secret', { name: secretName(name) });
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeSecureJson(name: string, value: unknown): Promise<void> {
  await invoke('store_secret', { name: secretName(name), value: JSON.stringify(value) });
}

async function deleteSecureValue(name: string): Promise<void> {
  try {
    await invoke('delete_secret', { name: secretName(name) });
  } catch {
    // ignore missing secrets
  }
}

const providerIconMap: Record<string, React.ReactNode> = {
  google: <FolderOpen size={14} />,
  dropbox: <Package size={14} />,
  onedrive: <Cloud size={14} />,
};

function CloudStoragePanel({ onClose, currentFilePath, currentFileContent, onFileLoaded }: CloudStoragePanelProps) {
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);
  const [providers, setProviders] = useState(PROVIDERS);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [showSettings, setShowSettings] = useState(false);
  
  // Password dialog state
  const [passwordDialog, setPasswordDialog] = useState<{
    show: boolean;
    mode: 'encrypt' | 'decrypt';
    file?: CloudFile;
    password: string;
    confirmPassword: string;
    error: string;
  }>({ show: false, mode: 'encrypt', password: '', confirmPassword: '', error: '' });
  
  const [credentials, setCredentials] = useState<CredentialsState>(DEFAULT_CREDENTIALS);

  useEffect(() => {
    initializeSecureState();
  }, []);

  const migrateLegacySecrets = async () => {
    const legacyCredentials = localStorage.getItem('cloud-credentials');
    if (legacyCredentials) {
      try {
        await writeSecureJson('cloud-credentials', JSON.parse(legacyCredentials));
        localStorage.removeItem('cloud-credentials');
      } catch (error) {
        console.warn('Failed to migrate cloud credentials:', error);
      }
    }

    for (const provider of Object.keys(PROVIDERS) as Provider[]) {
      const legacyToken = localStorage.getItem(`${provider}-token`);
      if (legacyToken) {
        await writeSecureJson(`${provider}-oauth-token`, { accessToken: legacyToken });
        localStorage.removeItem(`${provider}-token`);
      }
    }
  };

  const initializeSecureState = async () => {
    await migrateLegacySecrets();

    const storedCredentials = await readSecureJson<CredentialsState>('cloud-credentials');
    if (storedCredentials) {
      setCredentials({ ...DEFAULT_CREDENTIALS, ...storedCredentials });
    }

    await checkConnections();
  };

  const getStoredToken = async (provider: Provider): Promise<StoredOAuthToken | null> => {
    return readSecureJson<StoredOAuthToken>(`${provider}-oauth-token`);
  };

  const checkConnections = async () => {
    const statuses = await Promise.all(
      (Object.keys(PROVIDERS) as Provider[]).map(async (provider) => [provider, !!(await getStoredToken(provider))] as const)
    );

    setProviders(prev => ({
      ...prev,
      google: { ...prev.google, connected: statuses.find(([p]) => p === 'google')?.[1] ?? false },
      dropbox: { ...prev.dropbox, connected: statuses.find(([p]) => p === 'dropbox')?.[1] ?? false },
      onedrive: { ...prev.onedrive, connected: statuses.find(([p]) => p === 'onedrive')?.[1] ?? false },
    }));
  };

  const getValidAccessToken = async (provider: Provider): Promise<string> => {
    const token = await getStoredToken(provider);
    if (!token?.accessToken) {
      throw new Error(`No ${PROVIDERS[provider].name} token found. Please reconnect.`);
    }

    const expiresSoon = token.expiresAt && Date.now() >= token.expiresAt - 60_000;
    if (!expiresSoon) {
      return token.accessToken;
    }

    if (!token.refreshToken) {
      throw new Error(`${PROVIDERS[provider].name} token expired and no refresh token is available. Please reconnect.`);
    }

    const creds = credentials[provider];
    const refreshed = await invoke<OAuthTokenResponse>('refresh_oauth_token', {
      provider,
      refreshToken: token.refreshToken,
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
    });

    const updatedToken: StoredOAuthToken = {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      expiresAt: refreshed.expires_in ? Date.now() + refreshed.expires_in * 1000 : token.expiresAt ?? null,
      tokenType: refreshed.token_type ?? token.tokenType ?? null,
      scope: refreshed.scope ?? token.scope ?? null,
    };

    await writeSecureJson(`${provider}-oauth-token`, updatedToken);
    return updatedToken.accessToken;
  };

  const connectProvider = async (provider: Provider) => {
    const creds = credentials[provider];
    if (!creds.clientId) {
      alert(`Please configure ${PROVIDERS[provider].name} credentials in settings first.`);
      setShowSettings(true);
      return;
    }

    setLoading(true);
    
    try {
      const state = crypto.randomUUID();
      const authUrl = getAuthUrl(provider, creds.clientId, state);

      const callback = await invoke<OAuthCallbackResult>('open_oauth_window', {
        url: authUrl,
        expectedState: state,
      });

      const tokenResponse = await invoke<OAuthTokenResponse>('exchange_oauth_token', {
        provider,
        code: callback.code,
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        redirectUri: callback.redirect_uri,
      });

      const tokenPayload: StoredOAuthToken = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token ?? null,
        expiresAt: tokenResponse.expires_in ? Date.now() + tokenResponse.expires_in * 1000 : null,
        tokenType: tokenResponse.token_type ?? null,
        scope: tokenResponse.scope ?? null,
      };

      await writeSecureJson(`${provider}-oauth-token`, tokenPayload);
      setProviders(prev => ({
        ...prev,
        [provider]: { ...prev[provider], connected: true }
      }));
      setActiveProvider(provider);
      await loadFiles(provider);
    } catch (error) {
      console.error('OAuth error:', error);
      alert(`Failed to connect to ${PROVIDERS[provider].name}: ${error}`);
    }
    
    setLoading(false);
  };

  const getAuthUrl = (provider: Provider, clientId: string, state: string): string => {
    const redirectUri = 'http://localhost:8765/callback';
    
    switch (provider) {
      case 'google':
        return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/drive.file&access_type=offline&prompt=consent&state=${state}`;
      case 'dropbox':
        return `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&token_access_type=offline&state=${state}`;
      case 'onedrive':
        return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=Files.ReadWrite%20offline_access&state=${state}`;
      default:
        return '';
    }
  };

  const disconnectProvider = (provider: Provider) => {
    void deleteSecureValue(`${provider}-oauth-token`);
    setProviders(prev => ({
      ...prev,
      [provider]: { ...prev[provider], connected: false }
    }));
    if (activeProvider === provider) {
      setActiveProvider(null);
      setFiles([]);
    }
  };

  const loadFiles = async (provider: Provider, path: string = '/') => {
    setLoading(true);
    try {
      const token = await getValidAccessToken(provider);
      const fileList = await invoke<CloudFile[]>('cloud_list_files', {
        provider,
        token,
        path
      });
      
      setFiles(fileList);
      setCurrentPath(path);
    } catch (error) {
      console.error('Load files error:', error);
      alert(`Failed to load files: ${error}`);
    }
    
    setLoading(false);
  };

  const uploadFile = async (encrypt: boolean) => {
    if (!activeProvider || !currentFilePath) {
      alert('No file selected to upload');
      return;
    }

    if (encrypt) {
      // Show password dialog for encryption
      setPasswordDialog({ show: true, mode: 'encrypt', password: '', confirmPassword: '', error: '' });
      return;
    }

    // Upload without encryption
    await doUpload(currentFileContent, currentFilePath.split('/').pop() || 'untitled.txt');
  };

  const doUpload = async (content: string, fileName: string) => {
    if (!activeProvider) return;
    
    setUploading(true);
    
    try {
      const token = await getValidAccessToken(activeProvider);
      await invoke('cloud_upload_file', {
        provider: activeProvider,
        token,
        path: currentPath,
        fileName,
        content,
      });

      alert(`Uploaded ${fileName} to ${PROVIDERS[activeProvider].name}`);
      await loadFiles(activeProvider, currentPath);
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Failed to upload: ${error}`);
    }
    
    setUploading(false);
  };

  const handleEncryptUpload = async () => {
    const { password, confirmPassword } = passwordDialog;
    
    if (password.length < 12) {
      setPasswordDialog(prev => ({ ...prev, error: 'Password must be at least 12 characters' }));
      return;
    }
    if (password !== confirmPassword) {
      setPasswordDialog(prev => ({ ...prev, error: 'Passwords do not match' }));
      return;
    }

    setPasswordDialog(prev => ({ ...prev, show: false }));

    try {
      // Encrypt content using AES-256-GCM via Rust backend
      const encrypted = await invoke<string>('encrypt_text', {
        plaintext: currentFileContent,
        password,
      });

      let fileName = (currentFilePath?.split('/').pop() || 'untitled.txt');
      if (!fileName.endsWith('.encrypted')) {
        fileName += '.encrypted';
      }

      await doUpload(encrypted, fileName);
    } catch (error) {
      alert(`Encryption failed: ${error}`);
    }
  };

  const handleDecryptDownload = async () => {
    const { password, file } = passwordDialog;
    
    if (!file || !activeProvider) return;
    
    if (password.length < 1) {
      setPasswordDialog(prev => ({ ...prev, error: 'Enter your password' }));
      return;
    }

    setPasswordDialog(prev => ({ ...prev, show: false }));
    setLoading(true);

    try {
      const token = await getValidAccessToken(activeProvider);
      const encryptedContent = await invoke<string>('cloud_download_file', {
        provider: activeProvider,
        token,
        fileId: file.id,
      });

      // Decrypt content
      const decrypted = await invoke<string>('decrypt_text', {
        encryptedJson: encryptedContent,
        password,
      });

      // Remove .encrypted extension for display
      const displayName = file.name.replace(/\.encrypted$/, '');
      onFileLoaded(decrypted, displayName);
      onClose();
    } catch (error) {
      const errStr = String(error);
      if (errStr.includes('wrong password') || errStr.includes('Decryption failed')) {
        alert('Wrong password! Please try again.');
      } else {
        alert(`Failed to download: ${error}`);
      }
    }

    setLoading(false);
  };

  const downloadFile = async (file: CloudFile) => {
    if (!activeProvider) return;
    
    if (file.isEncrypted) {
      // Show password dialog for decryption
      setPasswordDialog({ show: true, mode: 'decrypt', file, password: '', confirmPassword: '', error: '' });
      return;
    }

    // Download plain file
    setLoading(true);
    
    try {
      const token = await getValidAccessToken(activeProvider);
      const content = await invoke<string>('cloud_download_file', {
        provider: activeProvider,
        token,
        fileId: file.id,
      });

      onFileLoaded(content, file.name);
      onClose();
    } catch (error) {
      console.error('Download error:', error);
      alert(`Failed to download: ${error}`);
    }
    
    setLoading(false);
  };

  const saveCredentials = async () => {
    try {
      await writeSecureJson('cloud-credentials', credentials);
      setShowSettings(false);
      alert('Credentials saved securely in macOS Keychain. You can now connect to cloud services.');
    } catch (error) {
      alert(`Failed to store credentials securely: ${error}`);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal cloud-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><Cloud size={16} /> Cloud Storage</h2>
          <div className="header-actions">
            <button onClick={() => setShowSettings(!showSettings)} className="icon-btn" title="Settings">
              <Settings size={14} />
            </button>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="modal-content">
          {showSettings ? (
            <div className="cloud-settings">
              <h3><Key size={16} /> API Credentials</h3>
              <p className="settings-note">
                To connect cloud services, you need to create apps in their developer consoles
                and add the credentials here.
              </p>
              
              <div className="credentials-list">
                {(Object.keys(PROVIDERS) as Provider[]).map(provider => (
                  <div key={provider} className="credential-section">
                    <h4>{providerIconMap[provider]} {PROVIDERS[provider].name}</h4>
                    <div className="credential-inputs">
                      <input
                        type="text"
                        placeholder="Client ID"
                        value={credentials[provider].clientId}
                        onChange={(e) => setCredentials((prev: typeof credentials) => ({
                          ...prev,
                          [provider]: { ...prev[provider], clientId: e.target.value }
                        }))}
                      />
                      <input
                        type="password"
                        placeholder="Client Secret"
                        value={credentials[provider].clientSecret}
                        onChange={(e) => setCredentials((prev: typeof credentials) => ({
                          ...prev,
                          [provider]: { ...prev[provider], clientSecret: e.target.value }
                        }))}
                      />
                    </div>
                    <a 
                      href={getDevConsoleUrl(provider)} 
                      target="_blank" 
                      rel="noopener"
                      className="console-link"
                    >
                      Open {PROVIDERS[provider].name} Developer Console →
                    </a>
                  </div>
                ))}
              </div>
              
              <div className="settings-actions">
                <button onClick={() => setShowSettings(false)}>Cancel</button>
                <button onClick={saveCredentials} className="primary">Save Credentials</button>
              </div>
            </div>
          ) : (
            <>
              {/* Provider Tabs */}
              <div className="provider-tabs">
                {(Object.keys(PROVIDERS) as Provider[]).map(provider => (
                  <div 
                    key={provider} 
                    className={`provider-tab ${activeProvider === provider ? 'active' : ''} ${providers[provider].connected ? 'connected' : ''}`}
                    style={{ '--provider-color': PROVIDERS[provider].color } as React.CSSProperties}
                  >
                    <div className="provider-info">
                      <span className="provider-icon">{providerIconMap[provider]}</span>
                      <span className="provider-name">{PROVIDERS[provider].name}</span>
                      {providers[provider].connected && <span className="connected-badge"><Check size={12} /></span>}
                    </div>
                    {providers[provider].connected ? (
                      <div className="provider-actions">
                        <button onClick={() => { setActiveProvider(provider); loadFiles(provider); }}>
                          Open
                        </button>
                        <button onClick={() => disconnectProvider(provider)} className="disconnect">
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => connectProvider(provider)} disabled={loading}>
                        Connect
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* File Browser */}
              {activeProvider && (
                <div className="file-browser">
                  <div className="browser-header">
                    <div className="path-nav">
                      <button onClick={() => loadFiles(activeProvider, '/')} disabled={currentPath === '/'}>
                        <Home size={14} />
                      </button>
                      <span className="current-path">{currentPath}</span>
                    </div>
                    <div className="upload-actions">
                      <button 
                        onClick={() => uploadFile(false)} 
                        disabled={uploading || !currentFilePath}
                        title="Upload current file"
                      >
                        <Upload size={14} /> Upload
                      </button>
                      <button 
                        onClick={() => uploadFile(true)} 
                        disabled={uploading || !currentFilePath}
                        className="encrypted"
                        title="Encrypt with password and upload"
                      >
                        <Lock size={14} /> Upload Encrypted
                      </button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="loading-state">
                      <span className="spinner"><Loader2 size={14} className="spin" /></span>
                      <p>Loading files...</p>
                    </div>
                  ) : files.length === 0 ? (
                    <div className="empty-state">
                      <span><FolderOpen size={16} /></span>
                      <p>No files in this folder</p>
                    </div>
                  ) : (
                    <div className="file-list">
                      {files.map(file => (
                        <div 
                          key={file.id} 
                          className={`file-item ${file.isEncrypted ? 'encrypted' : ''}`}
                          onClick={() => downloadFile(file)}
                        >
                          <span className="file-icon">
                            {file.isEncrypted ? <Lock size={14} /> : <File size={14} />}
                          </span>
                          <div className="file-info">
                            <span className="file-name">{file.name}</span>
                            <span className="file-meta">
                              {formatSize(file.size)} • {file.modified}
                            </span>
                          </div>
                          <button className="download-btn" title="Download">
                            <Download size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!activeProvider && (
                <div className="no-provider">
                  <span className="big-icon"><Cloud size={16} /></span>
                  <h3>Connect a Cloud Service</h3>
                  <p>Select a provider above to browse and sync your files</p>
                  <div className="features">
                    <div className="feature">
                      <span><Lock size={14} /></span>
                      <span>Upload encrypted files</span>
                    </div>
                    <div className="feature">
                      <span><Download size={14} /></span>
                      <span>Download and edit</span>
                    </div>
                    <div className="feature">
                      <span><RefreshCw size={14} /></span>
                      <span>Seamless sync</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Note */}
              <div className="security-note">
                <span><Shield size={14} /></span>
                <p>
                  <strong>Your files, your encryption.</strong> Cloud OAuth tokens and app credentials are stored in macOS Keychain, and files encrypted with RocketNote remain encrypted in the cloud.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Password Dialog */}
        {passwordDialog.show && (
          <div className="password-overlay" onClick={() => setPasswordDialog(prev => ({ ...prev, show: false }))}>
            <div className="password-dialog" onClick={(e) => e.stopPropagation()}>
              <h3>
                {passwordDialog.mode === 'encrypt' ? <><Lock size={14} /> Encrypt &amp; Upload</> : <><Unlock size={14} /> Decrypt &amp; Download</>}
              </h3>
              <p className="password-hint">
                {passwordDialog.mode === 'encrypt' 
                  ? 'Enter a password to encrypt your file before uploading. You will need this password to decrypt it later.'
                  : 'Enter the password used to encrypt this file.'}
              </p>
              
              <input
                type="password"
                placeholder="Password"
                value={passwordDialog.password}
                onChange={(e) => setPasswordDialog(prev => ({ ...prev, password: e.target.value, error: '' }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (passwordDialog.mode === 'decrypt') handleDecryptDownload();
                  }
                }}
                autoFocus
              />
              
              {passwordDialog.mode === 'encrypt' && (
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={passwordDialog.confirmPassword}
                  onChange={(e) => setPasswordDialog(prev => ({ ...prev, confirmPassword: e.target.value, error: '' }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEncryptUpload();
                  }}
                />
              )}

              {passwordDialog.error && (
                <div className="password-error"><AlertTriangle size={14} /> {passwordDialog.error}</div>
              )}

              <div className="password-actions">
                <button onClick={() => setPasswordDialog(prev => ({ ...prev, show: false }))}>
                  Cancel
                </button>
                <button 
                  className="primary"
                  onClick={passwordDialog.mode === 'encrypt' ? handleEncryptUpload : handleDecryptDownload}
                >
                  {passwordDialog.mode === 'encrypt' ? <><Lock size={14} /> Encrypt &amp; Upload</> : <><Unlock size={14} /> Decrypt &amp; Open</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

function getDevConsoleUrl(provider: Provider): string {
  switch (provider) {
    case 'google':
      return 'https://console.cloud.google.com/apis/credentials';
    case 'dropbox':
      return 'https://www.dropbox.com/developers/apps';
    case 'onedrive':
      return 'https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps';
    default:
      return '';
  }
}

export default CloudStoragePanel;
