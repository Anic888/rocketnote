import { useState } from 'react';
import { Rocket, Lock, Bot, GitBranch, Terminal, Cloud, Wrench, BookOpen, File } from '../icons';
import './AboutModal.css';

type ContentType = 'none' | 'privacy' | 'license' | 'documentation';

interface AboutModalProps {
  onClose: () => void;
  initialContent?: ContentType;
}

function AboutModal({ onClose, initialContent = 'none' }: AboutModalProps) {
  const [showContent, setShowContent] = useState<ContentType>(initialContent);

  const privacyPolicy = `
# Privacy Policy

**RocketNote** is committed to protecting your privacy.

## Data Collection
We do NOT collect, store, or transmit your files or personal data to our servers. All editor content remains on your machine unless you explicitly use an external provider such as an AI API or cloud storage service.

## Local Processing
- All file operations are performed locally
- AI features use your own API keys
- No analytics or tracking
- No telemetry data

## Encryption
- AES-256-GCM encryption is processed entirely on your device
- Password-based keys are derived locally with Argon2id
- Your encryption password never leaves your machine

## Cloud Storage (Optional)
If you choose to use cloud storage integration:
- You authenticate directly with the provider (Google Drive, Dropbox, OneDrive)
- OAuth tokens and configured client credentials are stored locally in macOS Keychain
- Files are uploaded directly to your account
- Encrypted files remain encrypted before upload

## Third-Party Services
AI Assistant features require your own API keys from:
- OpenAI
- Anthropic
- DeepSeek

We do not proxy or retain your API keys or AI conversations. API keys are stored locally in macOS Keychain.

**Last updated:** February 2026
`;

  const license = `
# MIT License

Copyright (c) 2024-2026 RocketNote

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

  const documentation = `
# RocketNote Documentation

## Getting Started

RocketNote is a powerful, privacy-first code editor for macOS.

## Features

### File Management
- **New File**: Cmd+N
- **Open File**: Cmd+O
- **Open Folder**: Cmd+Shift+O
- **Save**: Cmd+S
- **Save As**: Cmd+Shift+S

### Editing
- **Find**: Cmd+F
- **Find & Replace**: Cmd+H
- **Search in Files**: Cmd+Shift+F

### View
- **Toggle Sidebar**: Cmd+B
- **Toggle Terminal**: Cmd+\`
- **Split Editor**: Cmd+Shift+E
- **Focus Mode**: Cmd+Shift+Enter

### Tools
- **Git Panel**: Cmd+Shift+G
- **AI Assistant**: Cmd+K
- **Settings**: Cmd+,

## AI Assistant

Configure your AI provider in Settings:
1. OpenAI (GPT-5.2 Thinking, Instant, Pro)
2. Anthropic (Claude Opus 4.6, Sonnet 4.5, Haiku 4.5)
3. DeepSeek (V3.2, V3.2 Reasoning)

## Encryption

Files can be encrypted using AES-256-GCM:
1. Open Encryption panel
2. Enter your password
3. Click Encrypt/Decrypt

## Cloud Storage

Connect your cloud accounts:
- Google Drive
- Dropbox
- OneDrive

## Git Integration

Built-in Git support:
- Stage/unstage files
- Commit changes
- Push/Pull
- Branch management
- View diffs
`;

  if (showContent !== 'none') {
    const content = showContent === 'privacy' ? privacyPolicy : 
                    showContent === 'license' ? license : documentation;
    const title = showContent === 'privacy' ? 'Privacy Policy' : 
                  showContent === 'license' ? 'License' : 'Documentation';
    
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="about-modal content-modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>×</button>
          <button className="modal-back" onClick={() => setShowContent('none')}>← Back</button>
          <div className="content-view">
            <h2>{title}</h2>
            <div className="content-text">
              {content.split('\n').map((line, i) => {
                if (line.startsWith('# ')) {
                  return <h1 key={i}>{line.replace('# ', '')}</h1>;
                } else if (line.startsWith('## ')) {
                  return <h2 key={i}>{line.replace('## ', '')}</h2>;
                } else if (line.startsWith('### ')) {
                  return <h3 key={i}>{line.replace('### ', '')}</h3>;
                } else if (line.startsWith('- ')) {
                  return <li key={i}>{line.replace('- ', '')}</li>;
                } else if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={i}><strong>{line.replace(/\*\*/g, '')}</strong></p>;
                } else if (line.trim() === '') {
                  return <br key={i} />;
                } else {
                  return <p key={i}>{line}</p>;
                }
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="about-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="about-content">
          <div className="about-logo"><Rocket size={24} strokeWidth={1.75} /></div>
          <h1>RocketNote</h1>
          <p className="version">Version 2.0.0</p>
          <p className="tagline">Fast. Private. Local. Deterministic.</p>
          
          <div className="about-description">
            <p>A powerful, privacy-first code editor for macOS built with Tauri, React, and Rust.</p>
          </div>
          
          <div className="about-features">
            <div className="feature-row">
              <span><Lock size={16} strokeWidth={1.75} /> AES-256-GCM Encryption</span>
              <span><Bot size={16} strokeWidth={1.75} /> AI Assistant</span>
            </div>
            <div className="feature-row">
              <span><GitBranch size={16} strokeWidth={1.75} /> Git Integration</span>
              <span><Terminal size={16} strokeWidth={1.75} /> Terminal</span>
            </div>
            <div className="feature-row">
              <span><Cloud size={16} strokeWidth={1.75} /> Cloud Storage</span>
              <span><Wrench size={16} strokeWidth={1.75} /> Developer Tools</span>
            </div>
          </div>
          
          <div className="about-links">
            <button onClick={() => setShowContent('documentation')}>
              <BookOpen size={16} strokeWidth={1.75} /> Documentation
            </button>
            <button onClick={() => setShowContent('privacy')}>
              <Lock size={16} strokeWidth={1.75} /> Privacy Policy
            </button>
            <button onClick={() => setShowContent('license')}>
              <File size={16} strokeWidth={1.75} /> License (MIT)
            </button>
          </div>
          
          <div className="about-tech">
            <span>Built with:</span>
            <div className="tech-badges">
              <span className="badge">Tauri</span>
              <span className="badge">React</span>
              <span className="badge">Rust</span>
              <span className="badge">TypeScript</span>
            </div>
          </div>
          
          <div className="about-copyright">
            © 2024-2026 RocketNote
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutModal;
