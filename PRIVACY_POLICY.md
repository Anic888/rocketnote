# Privacy Policy for RocketNote

**Effective Date: January 28, 2026**
**Last Updated: February 6, 2026**

---

## Our Commitment

RocketNote is built on a fundamental principle: **your data belongs to you**. We've designed our application from the ground up to respect your privacy and give you complete control over your information.

---

## Data Collection

### What We Collect

**Nothing.**

RocketNote does not collect, transmit, or store any user data on external servers. Specifically:

- [None] No personal information
- [None] No usage analytics or telemetry
- [None] No crash reports
- [None] No cookies or tracking
- [None] No device identifiers or IP logging
- [None] No user accounts required

---

## Data Storage

### Local Storage Only

All data created or modified by RocketNote is stored **exclusively on your device**:

| Data Type | Storage Location |
|-----------|-----------------|
| Your files | Where you save them |
| App settings | Local app preferences |
| API keys | macOS Keychain (encrypted) |
| Cloud OAuth tokens / client credentials | macOS Keychain (encrypted) |
| Snippets, sessions, stats | Local app data folder |
| Encrypted files | Where you save them |

We have **zero access** to any of your files or data.

---

## Encryption

When you encrypt a file using RocketNote:

1. Encryption happens **100% locally** on your device
2. We use **AES-256-GCM** authenticated encryption
3. Your password is processed using **Argon2id** key derivation
4. Your password and encryption keys **never leave your device**
5. **We cannot decrypt your files** — only you can

**Warning:** If you forget your encryption password, your data cannot be recovered. This is by design.

---

## Third-Party Services

### AI Assistant (Optional)

The AI Assistant feature allows you to interact with third-party AI language models. **This feature is completely optional and disabled by default.**

**Explicit consent is required:** The first time you open the AI Assistant, the app displays a detailed privacy disclosure and requires your explicit consent before any data is transmitted.

#### What data is sent

When you use the AI Assistant, the following data is transmitted to the selected AI provider:

- **Your messages**: Text you type in the AI chat input
- **Selected code**: Code you highlight and send for analysis
- **Language context**: The programming language of your current file
- **Chat history**: Previous messages in the current conversation (for context continuity)

**No other data is sent.** Your files, settings, API keys, file system structure, or any other application data are never transmitted.

#### Who receives your data

Data is sent **directly** from your device to the AI provider you select. RocketNote does not operate any intermediate servers.

| Provider | Company | API Endpoint | Privacy Policy |
|----------|---------|-------------|---------------|
| OpenAI | OpenAI, Inc. | api.openai.com | [openai.com/privacy](https://openai.com/privacy) |
| Anthropic | Anthropic, PBC | api.anthropic.com | [anthropic.com/privacy](https://www.anthropic.com/privacy) |
| DeepSeek | DeepSeek | api.deepseek.com | [deepseek.com/privacy](https://www.deepseek.com/privacy) |

**Available models:**

- **OpenAI**: GPT-5.4, GPT-5.4 Mini, O3 Reasoning, O4 Mini
- **Anthropic**: Claude Opus 4.6, Claude Sonnet 4.6, Claude Haiku 4.5
- **DeepSeek**: DeepSeek-V3.2, DeepSeek-R1

#### How your data is protected

- All communications use **HTTPS/TLS encryption** in transit
- **API keys** are stored in macOS Keychain (encrypted by the operating system)
- RocketNote **does not proxy, cache, log, or store** any AI communications
- You provide your own API key — RocketNote never sees or transmits it to anyone other than the selected provider
- Each provider's data handling is governed by their own privacy policy (linked above)

#### Your controls

- **Consent**: You must explicitly agree to the data disclosure before using AI features
- **Revoke consent**: Clear the app's local storage to reset consent
- **Delete API keys**: Remove stored keys at any time via macOS Keychain Access
- **Disable entirely**: Simply don't open the AI Assistant — no data is ever sent

### Cloud Storage (Optional)

If you choose to use Cloud Storage integration (Google Drive, Dropbox, or OneDrive):

- Authentication is handled via OAuth directly with the provider
- OAuth tokens and configured client credentials are stored locally in macOS Keychain
- Files you upload are sent directly to your chosen cloud provider
- **Encrypted files remain encrypted in the cloud**

**Cloud storage is completely optional and disabled by default.**

### Git Integration

Git operations are performed using the standard `git` command-line tool installed on your system. We do not intercept or log your Git credentials.

---

## Children's Privacy

RocketNote does not collect any information from anyone, including children under the age of 13. Since we collect no data, there is no risk of children's data being processed.

---

## Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be reflected by updating the "Last Updated" date. Since we collect no data, changes will primarily be clarifications.

---

## Your Rights

Because we don't collect your data:

- [Yes] You have complete control over your data
- [Yes] Delete all app data by uninstalling the app
- [Yes] Your files are in standard formats -- no lock-in

---

## Contact

**Email**: anic.inemayt@gmail.com
**Website**: https://github.com/Anic888/rocketnote
**Issues**: https://github.com/Anic888/rocketnote/issues

---

## Summary

| Question | Answer |
|----------|--------|
| Do you collect my data? | **No** |
| Do you track me? | **No** |
| Can you see my files? | **No** |
| Can you decrypt my files? | **No** |
| Do you sell or share data? | **No data exists to sell or share** |

**TL;DR: We don't collect anything. Your data is yours. Period.**
