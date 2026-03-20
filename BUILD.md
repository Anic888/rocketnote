# Notepad Mac v2.0 — Build & Run Guide

## Prerequisites

### 1. Install Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
rustc --version  # should be 1.70+
```

### 2. Install Node.js (v18+)
```bash
# via Homebrew
brew install node

# or via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 18
nvm use 18
```

### 3. Install Tauri CLI
```bash
cargo install tauri-cli --version "^1"
```

### 4. Install Xcode Command Line Tools (macOS)
```bash
xcode-select --install
```

---

## Build & Run

### Development Mode (hot-reload)
```bash
cd notepad-mac-fixed

# Install JS dependencies
npm install

# Run in development mode
cargo tauri dev
```

### Production Build (.app bundle)
```bash
cd notepad-mac-fixed

# Install JS dependencies
npm install

# Build optimized production app
cargo tauri build
```

The built app will be in:
```
src-tauri/target/release/bundle/macos/Notepad Mac.app
src-tauri/target/release/bundle/dmg/Notepad Mac_2.0.0_aarch64.dmg
```

---

## Build for App Store

### 1. Set up signing identity
Edit `src-tauri/tauri.conf.json`:
```json
"macOS": {
  "signingIdentity": "Apple Distribution: YOUR NAME (TEAM_ID)",
  "providerShortName": "YOUR_TEAM_SHORT_NAME",
  "entitlements": "Entitlements.plist"
}
```

### 2. Create Entitlements.plist
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.app-sandbox</key>
  <true/>
  <key>com.apple.security.network.client</key>
  <true/>
  <key>com.apple.security.files.user-selected.read-write</key>
  <true/>
  <key>com.apple.security.files.bookmarks.app-scope</key>
  <true/>
</dict>
</plist>
```

### 3. Build & Sign
```bash
cargo tauri build

# Sign with your identity
codesign --deep --force --verify --verbose --sign "Apple Distribution: YOUR NAME (TEAM_ID)" \
  "src-tauri/target/release/bundle/macos/Notepad Mac.app"

# Create pkg for App Store
productbuild --sign "3rd Party Mac Developer Installer: YOUR NAME (TEAM_ID)" \
  --component "src-tauri/target/release/bundle/macos/Notepad Mac.app" /Applications \
  "NotepadMac.pkg"

# Upload to App Store Connect
xcrun altool --upload-app --type macos --file "NotepadMac.pkg" \
  --apiKey YOUR_API_KEY --apiIssuer YOUR_ISSUER_ID
```

---

## Troubleshooting

### `error: failed to run custom build command for ...`
```bash
# Clean and rebuild
cd src-tauri
cargo clean
cd ..
cargo tauri build
```

### `npm install` fails
```bash
rm -rf node_modules package-lock.json
npm install
```

### Rust compilation errors
```bash
# Update Rust
rustup update stable

# Make sure all required system dependencies are present
brew install pkg-config
```

### App not launching after build
```bash
# Check logs
/Applications/Utilities/Console.app
# Filter for "Notepad Mac"

# Or run from terminal to see output
open "src-tauri/target/release/bundle/macos/Notepad Mac.app"
```

---

## Project Structure

```
notepad-mac-fixed/
├── src/                          # Frontend (React/TypeScript)
│   ├── App.tsx                   # Main app component (1059 lines)
│   ├── types.ts                  # TypeScript interfaces
│   ├── utils.ts                  # Utility functions
│   ├── main.tsx                  # Entry point
│   ├── styles/                   # CSS files
│   └── components/               # UI components
│       ├── Editor.tsx            # Code editor with undo/redo
│       ├── Terminal.tsx          # Built-in terminal (PTY)
│       ├── GitPanel.tsx          # Git integration
│       ├── AIPanel.tsx           # AI assistant (OpenAI/Claude/DeepSeek)
│       ├── EncryptionPanel.tsx   # AES-256-GCM encryption
│       ├── CloudStoragePanel.tsx # Google Drive/Dropbox/OneDrive
│       ├── ErrorBoundary.tsx     # Error boundary (NEW)
│       └── ...                   # 16 more components
├── src-tauri/                    # Backend (Rust/Tauri)
│   ├── src/main.rs               # All Rust commands (1937 lines)
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
├── package.json                  # Node.js dependencies
├── index.html                    # HTML entry point
├── BUILD.md                      # This file
└── PATCH_NOTES.md                # All fixes documented
```

## Key Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘N | New File |
| ⌘O | Open File |
| ⌘⇧O | Open Folder |
| ⌘S | Save |
| ⌘⇧S | Save As |
| ⌘W | Close Tab |
| ⌘F | Find |
| ⌘⇧F | Global Search |
| ⌘Z | Undo |
| ⌘⇧Z | Redo |
| ⌘B | Toggle Sidebar |
| ⌘` | Terminal |
| ⌘⇧G | Git Panel |
| ⌘K | AI Assistant |
| ⌘\\ | Split View |
| ⌘⇧↵ | Focus Mode |
| ⇧⌥F | **Format JSON (NEW)** |
| F2 | Toggle Bookmark |
| ⌘, | Settings |
