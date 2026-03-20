import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/tauri';
import { AIMessage } from '../types';
import { Bot, Zap, Circle, Key, MessageSquare, User, Copy, Trash2, Settings, Lightbulb, BookOpen, Palette, Bug, FileText, RefreshCw, Shield } from '../icons';
import './AIPanel.css';

interface AIPanelProps {
  selectedCode: string;
  currentLanguage: string;
  onInsertCode: (code: string) => void;
  onClose: () => void;
}

type Provider = 'openai' | 'anthropic' | 'deepseek';

const MODELS = {
  openai: [
    { id: 'gpt-5.4', name: 'GPT-5.4' },
    { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' },
    { id: 'o3', name: 'O3 Reasoning' },
    { id: 'o4-mini', name: 'O4 Mini' },
  ],
  anthropic: [
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek-V3.2' },
    { id: 'deepseek-reasoner', name: 'DeepSeek-R1' },
  ],
};

// Helper to securely store/retrieve API keys via Tauri keychain
async function getStoredApiKey(provider: string): Promise<string> {
  try {
    return await invoke<string>('get_api_key', { provider });
  } catch {
    const legacyKey = localStorage.getItem(`ai-api-key-${provider}`) || localStorage.getItem('ai-api-key') || '';
    if (legacyKey) {
      await invoke('store_api_key', { provider, key: legacyKey });
      localStorage.removeItem('ai-api-key');
      localStorage.removeItem(`ai-api-key-${provider}`);
      return legacyKey;
    }
    return '';
  }
}

async function storeApiKey(provider: string, key: string): Promise<void> {
  await invoke('store_api_key', { provider, key });
  localStorage.removeItem('ai-api-key');
  localStorage.removeItem(`ai-api-key-${provider}`);
}

function AIPanel({ selectedCode, currentLanguage, onInsertCode, onClose }: AIPanelProps) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [aiConsent, setAiConsent] = useState<boolean>(() => {
    return localStorage.getItem('ai-privacy-consent') === 'true';
  });
  const [provider, setProvider] = useState<Provider>(() =>
    (localStorage.getItem('ai-provider') as Provider) || 'openai'
  );
  const [model, setModel] = useState(() => 
    localStorage.getItem('ai-model') || MODELS.openai[0].id
  );
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load API key from secure storage on mount & provider change
  useEffect(() => {
    getStoredApiKey(provider).then(setApiKey);
  }, [provider]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const models = MODELS[provider];
    if (!models.find(m => m.id === model)) {
      setModel(models[0].id);
    }
  }, [provider, model]);

  const saveSettings = async () => {
    try {
      await storeApiKey(provider, apiKey);
      localStorage.setItem('ai-provider', provider);
      localStorage.setItem('ai-model', model);
      setShowSettings(false);
    } catch (error) {
      alert(`Failed to store API key securely: ${error}`);
    }
  };

  const sendMessage = async (customPrompt?: string) => {
    const prompt = customPrompt || input;
    if (!prompt.trim() || !apiKey) return;

    const userMessage = prompt;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      let response: string;
      
      if (provider === 'openai') {
        response = await callOpenAI(userMessage);
      } else if (provider === 'deepseek') {
        response = await callDeepSeek(userMessage);
      } else {
        response = await callAnthropic(userMessage);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error}. Please check your API key and try again.` 
      }]);
    }

    setLoading(false);
  };

  const callOpenAI = async (prompt: string): Promise<string> => {
    const systemPrompt = `You are a helpful coding assistant. The user is working with ${currentLanguage} code. Be concise and helpful. When providing code, use markdown code blocks.`;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: prompt },
        ],
        max_completion_tokens: 4000,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
  };

  const callAnthropic = async (prompt: string): Promise<string> => {
    const systemPrompt = `You are a helpful coding assistant. The user is working with ${currentLanguage} code. Be concise and helpful. When providing code, use markdown code blocks.`;
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: prompt },
        ],
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.content[0].text;
  };

  const callDeepSeek = async (prompt: string): Promise<string> => {
    const systemPrompt = `You are a helpful coding assistant. The user is working with ${currentLanguage} code. Be concise and helpful. When providing code, use markdown code blocks.`;
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: prompt },
        ],
        max_tokens: 4000,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || data.error);
    return data.choices[0].message.content;
  };

  const quickActions = [
    { label: 'Explain', icon: 'lightbulb', prompt: `Explain this ${currentLanguage} code:\n\`\`\`\n${selectedCode}\n\`\`\`` },
    { label: 'Improve', icon: 'palette', prompt: `Suggest improvements for this ${currentLanguage} code:\n\`\`\`\n${selectedCode}\n\`\`\`` },
    { label: 'Fix bugs', icon: 'bug', prompt: `Find and fix bugs in this ${currentLanguage} code:\n\`\`\`\n${selectedCode}\n\`\`\`` },
    { label: 'Comment', icon: 'filetext', prompt: `Add comments to this ${currentLanguage} code:\n\`\`\`\n${selectedCode}\n\`\`\`` },
    { label: 'Refactor', icon: 'refresh', prompt: `Refactor this ${currentLanguage} code to be cleaner:\n\`\`\`\n${selectedCode}\n\`\`\`` },
  ];

  const getProviderInfo = () => {
    switch (provider) {
      case 'openai': return { name: 'OpenAI', url: 'https://platform.openai.com/api-keys', placeholder: 'sk-...' };
      case 'anthropic': return { name: 'Anthropic', url: 'https://console.anthropic.com/', placeholder: 'sk-ant-...' };
      case 'deepseek': return { name: 'DeepSeek', url: 'https://platform.deepseek.com/', placeholder: 'sk-...' };
    }
  };

  const providerInfo = getProviderInfo();
  const currentModel = MODELS[provider].find(m => m.id === model);

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal ai-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><Bot size={16} /> AI Assistant</h2>
          <div className="header-actions">
            <button onClick={() => setShowSettings(!showSettings)} className="icon-btn" title="Settings">
              <Settings size={14} />
            </button>
            <button onClick={() => setMessages([])} className="icon-btn" title="Clear chat">
              <Trash2 size={14} />
            </button>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="modal-content">
          {!aiConsent ? (
            <div className="ai-consent">
              <h3><Shield size={20} strokeWidth={1.75} /> AI Data Privacy</h3>
              <p>The AI Assistant sends data to third-party services. Before using this feature, please review what data is shared:</p>

              <div className="ai-consent-details">
                <div className="consent-item">
                  <strong>What data is sent:</strong>
                  <ul>
                    <li>Text or code you type in the AI chat</li>
                    <li>Code you select for AI analysis</li>
                    <li>Programming language context</li>
                    <li>Conversation history within the current chat session</li>
                  </ul>
                </div>

                <div className="consent-item">
                  <strong>Who receives your data:</strong>
                  <ul>
                    <li><strong>OpenAI, Inc.</strong> (api.openai.com) — if you select OpenAI</li>
                    <li><strong>Anthropic, PBC</strong> (api.anthropic.com) — if you select Anthropic</li>
                    <li><strong>DeepSeek</strong> (api.deepseek.com) — if you select DeepSeek</li>
                  </ul>
                </div>

                <div className="consent-item">
                  <strong>How your data is protected:</strong>
                  <ul>
                    <li>Data is sent directly from your device to the provider via HTTPS</li>
                    <li>RocketNote does not store, proxy, or log any AI communications</li>
                    <li>Your API key is stored in macOS Keychain (encrypted by macOS)</li>
                    <li>You provide your own API key — we never see it</li>
                  </ul>
                </div>

                <div className="consent-item">
                  <strong>Third-party privacy policies:</strong>
                  <ul>
                    <li>OpenAI: openai.com/privacy</li>
                    <li>Anthropic: anthropic.com/privacy</li>
                    <li>DeepSeek: deepseek.com/privacy</li>
                  </ul>
                </div>
              </div>

              <div className="ai-consent-actions">
                <button className="consent-btn decline" onClick={onClose}>
                  Decline
                </button>
                <button className="consent-btn accept" onClick={() => {
                  localStorage.setItem('ai-privacy-consent', 'true');
                  setAiConsent(true);
                }}>
                  I Understand &amp; Agree
                </button>
              </div>
            </div>
          ) : showSettings ? (
            <div className="ai-settings">
              <h3><Settings size={14} /> AI Settings</h3>
              
              <div className="setting-group">
                <label>Provider</label>
                <div className="provider-selector">
                  <button 
                    className={provider === 'openai' ? 'active' : ''} 
                    onClick={() => setProvider('openai')}
                  >
                    <Circle size={10} fill="#22c55e" stroke="#22c55e" /> OpenAI
                  </button>
                  <button
                    className={provider === 'anthropic' ? 'active' : ''}
                    onClick={() => setProvider('anthropic')}
                  >
                    <Circle size={10} fill="#a855f7" stroke="#a855f7" /> Anthropic
                  </button>
                  <button
                    className={provider === 'deepseek' ? 'active' : ''}
                    onClick={() => setProvider('deepseek')}
                  >
                    <Circle size={10} fill="#3b82f6" stroke="#3b82f6" /> DeepSeek
                  </button>
                </div>
              </div>

              <div className="setting-group">
                <label>Model</label>
                <select value={model} onChange={(e) => setModel(e.target.value)}>
                  {MODELS[provider].map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="setting-group">
                <label>API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={providerInfo.placeholder}
                />
                <a href={providerInfo.url} target="_blank" rel="noopener" className="api-link">
                  Get {providerInfo.name} API key →
                </a>
              </div>

              <div className="setting-actions">
                <button onClick={() => setShowSettings(false)}>Cancel</button>
                <button onClick={saveSettings} className="primary">Save Settings</button>
              </div>
            </div>
          ) : !apiKey ? (
            <div className="ai-empty">
              <span className="empty-icon"><Key size={16} /></span>
              <h4>API Key Required</h4>
              <p>Configure your API key to start chatting with AI</p>
              <button onClick={() => setShowSettings(true)} className="setup-btn">
                Setup API Key
              </button>
            </div>
          ) : (
            <>
              <div className="provider-badge">
                {provider === 'openai' && <Circle size={10} fill="#22c55e" stroke="#22c55e" />}
                {provider === 'anthropic' && <Circle size={10} fill="#a855f7" stroke="#a855f7" />}
                {provider === 'deepseek' && <Circle size={10} fill="#3b82f6" stroke="#3b82f6" />}
                <span>{currentModel?.name || model}</span>
              </div>

              {selectedCode && (
                <div className="quick-actions">
                  <span className="quick-label">Selected code:</span>
                  <div className="quick-buttons">
                    {quickActions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(action.prompt)}
                        disabled={loading}
                      >
                        {action.icon === 'lightbulb' && <Lightbulb size={14} />}
                        {action.icon === 'palette' && <Palette size={14} />}
                        {action.icon === 'bug' && <Bug size={14} />}
                        {action.icon === 'filetext' && <FileText size={14} />}
                        {action.icon === 'refresh' && <RefreshCw size={14} />}
                        {' '}{action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="ai-messages">
                {messages.length === 0 ? (
                  <div className="ai-welcome">
                    <p><MessageSquare size={16} /> Hi! I'm your AI coding assistant.</p>
                    <p>Ask me anything about your code, or select some code and use the quick actions.</p>
                    <div className="welcome-suggestions">
                      <button onClick={() => setInput('How do I...')}><Lightbulb size={14} /> How do I...</button>
                      <button onClick={() => setInput('Explain ')}><BookOpen size={14} /> Explain...</button>
                      <button onClick={() => setInput('Write a function that ')}><Zap size={14} /> Write a function...</button>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`ai-message ${msg.role}`}>
                      <div className="message-avatar">
                        {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                      </div>
                      <div className="message-content">
                        {msg.content.split('```').map((part, j) => {
                          if (j % 2 === 1) {
                            const lines = part.split('\n');
                            const lang = lines[0] || currentLanguage;
                            const code = lines.slice(1).join('\n');
                            return (
                              <div key={j} className="code-block">
                                <div className="code-header">
                                  <span>{lang}</span>
                                  <button onClick={() => onInsertCode(code)}><Copy size={14} /> Insert</button>
                                </div>
                                <pre><code>{code}</code></pre>
                              </div>
                            );
                          }
                          return <span key={j}>{part}</span>;
                        })}
                      </div>
                    </div>
                  ))
                )}
                
                {loading && (
                  <div className="ai-message assistant">
                    <div className="message-avatar"><Bot size={16} /></div>
                    <div className="message-content loading">
                      <span className="dot"></span>
                      <span className="dot"></span>
                      <span className="dot"></span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              <div className="ai-input">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Ask anything about your code..."
                  disabled={loading}
                />
                <button onClick={() => sendMessage()} disabled={loading || !input.trim()}>
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default AIPanel;
