<p align="center">
  <img src="app-icon.png" width="128" alt="RocketNote" />
</p>

<h1 align="center">RocketNote</h1>

<p align="center">
  <strong>Fast. Private. Local.</strong><br/>
  A privacy-first code editor for macOS built with Tauri, React, and Rust.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-6366f1" alt="Version" />
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey" alt="Platform" />
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License" />
  <img src="https://img.shields.io/github/stars/Anic888/rocketnote?style=social" alt="Stars" />
</p>

---

## Why RocketNote?

Most code editors either collect your data or require an internet connection. RocketNote is different:

- **Zero data collection** — no analytics, no telemetry, no accounts
- **Military-grade encryption** — AES-256-GCM with Argon2id key derivation
- **100% local** — your files never leave your device unless you choose to sync
- **Native performance** — built with Rust and Tauri, not Electron

---

## Key Features

### Military-Grade Encryption
- **AES-256-GCM** encryption algorithm
- **Argon2id** key derivation (memory-hard, GPU-resistant)
- Zero-knowledge architecture — even we can't recover your files
- Encrypt any file with a single shortcut

### Cloud Storage (Encrypted Sync)
- **Google Drive** — full OAuth integration
- **Dropbox** — upload/download sync
- **OneDrive** — Microsoft cloud support
- Upload **encrypted** files for secure cloud backup — your cloud provider sees only ciphertext

### AI Assistant (⌘K)

| Provider | Models |
|----------|--------|
| **OpenAI** | GPT-5.4, GPT-5.4 Mini, O3, O4 Mini |
| **Anthropic** | Claude Opus 4.6, Sonnet 4.6, Haiku 4.5 |
| **DeepSeek** | DeepSeek-V3.2, DeepSeek-R1 |

Explain, improve, fix bugs, refactor code — all with your own API key stored in macOS Keychain.

### Code Editor
- Syntax highlighting for 30+ languages
- Minimap with virtualized rendering
- Bracket matching, word wrap, line numbers (absolute & relative)
- Split view and focus mode
- Undo/redo with full history stack

### Git Integration (⌘⇧G)
- Stage, commit, push, pull
- Branch management (create, switch, delete)
- Diff viewer with line-by-line changes
- Connect to GitHub, GitLab, Bitbucket

### Global Search (⌘⇧F)
- Lightning-fast parallel search powered by Rayon
- Regex support with case sensitivity and whole-word toggle
- Respects `.gitignore` patterns

### Developer Tools (12 Built-in)

| Tool | Tool |
|------|------|
| JSON Format/Minify | Base64 Encode/Decode |
| URL Encode/Decode | Case Converter (7 formats) |
| Hash (MD5, SHA-256) | UUID v4 Generator |
| Lorem Ipsum | JWT Decoder |
| Timestamp Converter | Color Converter (HEX/RGB/HSL) |
| Regex Tester | Text Diff |

### Integrated Terminal (⌘`)
- Full PTY-based bash/zsh terminal
- Runs in current project directory
- ANSI color support

### And More...
- **Coding Statistics** — lines, characters, time tracking with 7-day chart
- **Code Screenshots** — beautiful syntax-highlighted images
- **Pomodoro Timer** — built-in 25/5 productivity timer
- **Code Snippets** — save & reuse with tab-stop placeholders
- **Sessions** — save/restore workspace state
- **Bookmarks** — mark lines with F2
- **Format JSON on Save** — auto-formats `.json` files

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New File | ⌘N |
| Open File | ⌘O |
| Open Folder | ⌘⇧O |
| Save | ⌘S |
| Find | ⌘F |
| Global Search | ⌘⇧F |
| AI Assistant | ⌘K |
| Terminal | ⌘` |
| Git Panel | ⌘⇧G |
| Toggle Sidebar | ⌘B |
| Split View | ⌘\ |
| Focus Mode | ⌘⇧↵ |
| Format JSON | ⇧⌥F |
| Bookmark | F2 |
| Settings | ⌘, |

---

## Installation

### Download

Download the latest `.dmg` from [Releases](https://github.com/Anic888/rocketnote/releases).

### Build from Source

**Prerequisites:** macOS 10.13+, [Node.js](https://nodejs.org/) 18+, [Rust](https://rustup.rs/), Tauri CLI v1

```bash
git clone https://github.com/Anic888/rocketnote.git
cd rocketnote
npm install
cargo install tauri-cli --version "^1"

cargo tauri dev      # development
cargo tauri build    # production .app
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript |
| Backend | Rust, Tauri 1.5 |
| Terminal | portable-pty |
| Encryption | AES-256-GCM, Argon2id |
| Search | Rayon (parallel), ignore (gitignore) |
| Themes | Dark Glass, Ultra Dark, Glassmorphism + Light mode |

---

## Privacy

**We collect nothing.** No analytics, no telemetry, no accounts, no tracking.

- API keys stored in **macOS Keychain** — never in plain text
- AI requests go directly to providers (OpenAI, Anthropic, DeepSeek) — we are not a proxy
- Full privacy policy: [PRIVACY_POLICY.md](PRIVACY_POLICY.md)

---

## Contributing

Contributions are welcome! Please open an [issue](https://github.com/Anic888/rocketnote/issues) or submit a pull request.

---

## License

This project is licensed under the **GNU General Public License v3.0** — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>RocketNote</strong> — <em>Fast. Private. Local.</em>
</p>
