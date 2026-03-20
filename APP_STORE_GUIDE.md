# 🍎 App Store Submission Guide

## RocketNote v2.0.0

---

## 📋 Pre-Submission Checklist

- [ ] Production build created (`cargo tauri build`)
- [ ] `icon.icns` generated (`./fix-icons.sh`)
- [ ] App icon 1024x1024 PNG (no transparency)
- [ ] Screenshots (minimum 3, 2560×1600)
- [ ] Privacy Policy hosted online
- [ ] Apple Developer account active
- [ ] Code signing identity configured
- [ ] Entitlements.plist reviewed

---

## 🔧 Build Commands

```bash
# Install dependencies
npm install

# Generate icon.icns (first time only)
chmod +x fix-icons.sh && ./fix-icons.sh

# Install Tauri CLI v1
cargo install tauri-cli --version "^1"

# Development (testing)
cargo tauri dev

# Production build
cargo tauri build
```

**Output:**
```
src-tauri/target/release/bundle/macos/RocketNote.app
src-tauri/target/release/bundle/dmg/RocketNote_2.0.0_aarch64.dmg
```

---

## 📝 App Store Connect Information

### Basic Info

```yaml
App Name: RocketNote
Subtitle: Fast. Private. Local. Code Editor.
Bundle ID: com.rocketnote.app
SKU: rocketnote-2026
Primary Language: English (U.S.)
Category: Developer Tools
Secondary Category: Productivity
Content Rights: Does not contain third-party content
Age Rating: 4+
Price: Free
```

### Description (4000 chars max)

```
RocketNote — A powerful, privacy-first code editor for macOS.

🚀 FAST
• Instant startup with native Rust performance
• Lightning-fast global search with parallel processing
• Lightweight editor optimized for speed

🔒 PRIVATE
• Military-grade AES-256-GCM encryption
• Zero data collection — we can't see your files
• API keys stored in macOS Keychain
• No accounts, no tracking

☁️ CLOUD STORAGE
• Google Drive, Dropbox, OneDrive integration
• Upload encrypted files for secure cloud backup

🤖 AI ASSISTANT
• OpenAI: GPT-5.2 Thinking, GPT-5.2 Instant, GPT-5.2 Pro
• Anthropic: Claude Opus 4.6, Sonnet 4.5, Haiku 4.5
• DeepSeek: V3.2, V3.2 Reasoning
• Explain, improve, fix bugs, refactor code
• Bring your own API key

🔀 GIT INTEGRATION
• View changes and diffs
• Stage, commit, push, pull
• Branch management
• Connect to GitHub, GitLab, Bitbucket

⚡ GLOBAL SEARCH
• Search across all files instantly
• Regex support, case sensitivity
• Respects .gitignore

🔧 DEVELOPER TOOLS (12 Tools)
• JSON formatter & minifier
• Base64 encoder/decoder
• URL encoder/decoder
• Case converter (7 formats)
• Hash generator (MD5, SHA-256)
• UUID v4, Lorem Ipsum, JWT decoder
• Timestamp & color converter
• Regex tester, text diff

⬛ TERMINAL
• Built-in PTY bash/zsh terminal
• Runs in project directory

📊 MORE
• Coding statistics with 7-day chart
• Code screenshots
• Pomodoro timer
• Code snippets with placeholders
• Session save/restore
• Format JSON on save
• Line bookmarks

⌨️ SHORTCUTS
⌘N New • ⌘O Open • ⌘S Save
⌘F Find • ⌘⇧F Global Search
⌘K AI • ⌘` Terminal • ⌘⇧G Git
⌘B Sidebar • ⇧⌥F Format JSON • ⌘, Settings

Built with Tauri, React, and Rust.
Fast. Private. Local. Deterministic.
```

### Keywords (100 chars max)

```
code editor,developer,programming,IDE,terminal,git,encryption,AI,text editor,syntax highlighting
```

### What's New (v2.0.0)

```
Version 2.0.0 — Major Release

NEW FEATURES:
• AI Assistant with GPT-5.2, Claude Opus 4.6, DeepSeek-V3.2
• Cloud Storage: Google Drive, Dropbox, OneDrive
• AES-256-GCM file encryption
• Git integration with remote support
• 12 Developer Tools
• Coding statistics
• Format JSON on Save (⇧⌥F)

IMPROVEMENTS:
• Secure API key storage via macOS Keychain
• Error boundaries for crash resilience
• Optimized minimap rendering
• Proper Save/Discard/Cancel dialog on close
• Command injection protection
• HTTP status validation for all cloud APIs
```

### URLs

```yaml
Support URL: https://github.com/Anic888/rocketnote/issues
Marketing URL: https://github.com/Anic888/rocketnote
Privacy Policy URL: https://github.com/Anic888/rocketnote/blob/main/PRIVACY_POLICY.md
```

---

## 📸 Required Screenshots

**Recommended size: 2560 × 1600** (works for all Mac display requirements)

Suggested screenshots:
1. **Main Editor** — Code with syntax highlighting and sidebar
2. **AI Assistant** — AI panel with provider selection
3. **Encryption** — Encryption panel
4. **Git Integration** — Git panel showing changes & branches
5. **Global Search** — Search results across files
6. **Developer Tools** — Tools panel
7. **Terminal** — Built-in terminal

---

## 🔐 Code Signing

```bash
# Sign the app
codesign --deep --force --verify --verbose \
  --sign "Apple Distribution: YOUR_NAME (TEAM_ID)" \
  "src-tauri/target/release/bundle/macos/RocketNote.app"

# Verify
codesign --verify --deep --strict "RocketNote.app"

# Create pkg for App Store
productbuild --sign "3rd Party Mac Developer Installer: YOUR_NAME (TEAM_ID)" \
  --component "RocketNote.app" /Applications \
  "RocketNote.pkg"
```

---

## 📤 Upload

### Option 1: Transporter (Recommended)
1. Download [Transporter](https://apps.apple.com/app/transporter/id1450874784)
2. Sign in → drag `.pkg` → Deliver

### Option 2: Command Line
```bash
xcrun altool --upload-app --type macos \
  --file "RocketNote.pkg" \
  --apiKey YOUR_API_KEY --apiIssuer YOUR_ISSUER_ID
```

---

## ⚠️ Sandbox Considerations

The App Store requires App Sandbox. Some features use system APIs that may need attention:

| Feature | Sandbox Impact | Solution |
|---------|---------------|----------|
| Terminal (PTY) | Requires process execution | May need temporary exception or removal for App Store |
| Git commands | Uses `Command::new("git")` | Same as above |
| Keychain | `security` CLI tool | Works within sandbox |
| Cloud OAuth | Localhost listener | Works with network.client entitlement |

**Alternative**: distribute via `.dmg` on your website (no sandbox requirement) and submit a lite version to App Store without Terminal/Git.

---

## ⏱️ Review Timeline

| Stage | Duration |
|-------|----------|
| Initial review | 24-48 hours |
| Additional review | 3-5 days |
| Rejection response | 24-48 hours |

### Common Rejection Reasons

1. **Missing privacy policy** — must be an accessible URL
2. **Crashes on launch** — test on clean Mac
3. **Sandbox violations** — Terminal/Git features
4. **Incomplete metadata** — fill all required fields
5. **Screenshots don't match** — must show actual app

---

**Good luck with the submission! 🚀**
