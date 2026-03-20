use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Encryption constants
pub(crate) const ENCRYPTION_FORMAT_VERSION: u8 = 1;
pub(crate) const ARGON2_MEMORY_KIB: u32 = 64 * 1024;
pub(crate) const ARGON2_ITERATIONS: u32 = 3;
pub(crate) const ARGON2_LANES: u32 = 1;

pub(crate) fn default_encryption_version() -> u8 {
    ENCRYPTION_FORMAT_VERSION
}

pub(crate) fn default_kdf_metadata() -> String {
    format!("argon2id:m={}KiB,t={},p={}", ARGON2_MEMORY_KIB, ARGON2_ITERATIONS, ARGON2_LANES)
}

// File System
#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub extension: Option<String>,
    pub size: Option<u64>,
    pub modified: Option<String>,
}

// OAuth
#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct OAuthCallbackResult {
    pub code: String,
    pub state: String,
    pub redirect_uri: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct OAuthTokenResponse {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: Option<u64>,
    pub token_type: Option<String>,
    pub scope: Option<String>,
}

// Git
#[derive(Debug, Serialize)]
pub(crate) struct GitStatus {
    pub is_repo: bool,
    pub branch: Option<String>,
    pub files: Vec<GitFileStatus>,
    pub ahead: i32,
    pub behind: i32,
}

#[derive(Debug, Serialize)]
pub(crate) struct GitFileStatus {
    pub path: String,
    pub status: String,
    pub staged: bool,
}

#[derive(Debug, Serialize)]
pub(crate) struct GitCommit {
    pub id: String,
    pub short_id: String,
    pub message: String,
    pub author: String,
    pub email: String,
    pub date: String,
}

// Utilities
#[derive(Serialize)]
pub(crate) struct RegexMatch {
    pub text: String,
    pub start: usize,
    pub end: usize,
}

// Sessions
#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct Session {
    pub name: String,
    pub files: Vec<SessionFile>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub(crate) struct SessionFile {
    pub path: String,
    pub cursor_line: i32,
    pub cursor_column: i32,
}

// Snippets
#[derive(Debug, Serialize, Deserialize, Clone)]
pub(crate) struct Snippet {
    pub id: String,
    pub name: String,
    pub prefix: String,
    pub body: String,
    pub language: String,
    pub description: Option<String>,
}

// Statistics
#[derive(Debug, Serialize, Deserialize, Default)]
pub(crate) struct CodingStats {
    pub total_lines_written: i64,
    pub total_characters: i64,
    pub total_time_seconds: i64,
    pub files_created: i64,
    pub files_saved: i64,
    pub daily_stats: HashMap<String, DailyStats>,
}

#[derive(Debug, Serialize, Deserialize, Default, Clone)]
pub(crate) struct DailyStats {
    pub lines: i64,
    pub characters: i64,
    pub time_seconds: i64,
}

// Bookmarks
#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct Bookmark {
    pub file_path: String,
    pub line: i32,
    pub label: Option<String>,
}

// Macros
#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct Macro {
    pub id: String,
    pub name: String,
    pub actions: Vec<MacroAction>,
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct MacroAction {
    pub action_type: String,
    pub data: String,
}

// Encryption
#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct EncryptedData {
    #[serde(default = "default_encryption_version")]
    pub version: u8,
    #[serde(default = "default_kdf_metadata")]
    pub kdf: String,
    pub salt: String,
    pub nonce: String,
    pub ciphertext: String,
}

// Search
#[derive(Debug, Serialize, Deserialize, Clone)]
pub(crate) struct SearchMatch {
    pub path: String,
    pub line_number: usize,
    pub line_content: String,
    pub match_start: usize,
    pub match_end: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct SearchResult {
    pub matches: Vec<SearchMatch>,
    pub total_files_searched: usize,
    pub total_matches: usize,
    pub duration_ms: u64,
}

// Cloud
#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct CloudFile {
    pub id: String,
    pub name: String,
    pub size: u64,
    pub modified: String,
    #[serde(rename = "isEncrypted")]
    pub is_encrypted: bool,
}
