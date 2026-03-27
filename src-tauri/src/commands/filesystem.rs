use std::fs;
use std::path::{Path, PathBuf};
use chrono::{DateTime, Utc};
use crate::models::FileInfo;

/// Validate and canonicalize a path, ensuring no traversal outside home directory
fn validate_path(path: &str) -> Result<PathBuf, String> {
    let p = PathBuf::from(path);
    let canonical = if p.exists() {
        p.canonicalize().map_err(|e| format!("Invalid path: {}", e))?
    } else {
        // For paths that don't exist yet (write/create), canonicalize the parent
        let parent = p.parent().ok_or("Invalid path: no parent directory")?;
        if parent.exists() {
            let canonical_parent = parent.canonicalize().map_err(|e| format!("Invalid path: {}", e))?;
            canonical_parent.join(p.file_name().ok_or("Invalid path: no filename")?)
        } else {
            return Err("Invalid path: parent directory does not exist".to_string());
        }
    };

    // Ensure path is within the user's home directory
    if let Some(home) = dirs::home_dir() {
        if !canonical.starts_with(&home) {
            return Err("Access denied: path is outside home directory".to_string());
        }
    }

    // Reject paths containing ".." components
    for component in Path::new(path).components() {
        if let std::path::Component::ParentDir = component {
            return Err("Access denied: path traversal not allowed".to_string());
        }
    }

    Ok(canonical)
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    let safe_path = validate_path(&path)?;
    fs::read_to_string(&safe_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    let safe_path = validate_path(&path)?;
    fs::read(&safe_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    let safe_path = validate_path(&path)?;
    fs::write(&safe_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_directory(path: String) -> Result<Vec<FileInfo>, String> {
    let safe_path = validate_path(&path)?;
    let entries = fs::read_dir(&safe_path).map_err(|e| e.to_string())?;

    let mut files: Vec<FileInfo> = entries
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let path = entry.path();
            let metadata = entry.metadata().ok()?;
            let name = entry.file_name().to_string_lossy().to_string();

            if name.starts_with('.') {
                return None;
            }

            let is_dir = path.is_dir();
            let extension = if is_dir {
                None
            } else {
                path.extension().map(|e| e.to_string_lossy().to_string())
            };

            let size = if is_dir { None } else { Some(metadata.len()) };
            let modified = metadata.modified().ok().map(|t| {
                let datetime: DateTime<Utc> = t.into();
                datetime.format("%Y-%m-%d %H:%M").to_string()
            });

            Some(FileInfo {
                name,
                path: path.to_string_lossy().to_string(),
                is_dir,
                extension,
                size,
                modified,
            })
        })
        .collect();

    files.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(files)
}

#[tauri::command]
pub fn file_exists(path: String) -> bool {
    PathBuf::from(&path).exists()
}

#[tauri::command]
pub fn get_file_name(path: String) -> String {
    PathBuf::from(&path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default()
}

#[tauri::command]
pub fn create_directory(path: String) -> Result<(), String> {
    let safe_path = validate_path(&path)?;
    fs::create_dir_all(&safe_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_file(path: String) -> Result<(), String> {
    let safe_path = validate_path(&path)?;
    if safe_path.is_dir() {
        fs::remove_dir_all(&safe_path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(&safe_path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    let safe_old = validate_path(&old_path)?;
    let safe_new = validate_path(&new_path)?;
    fs::rename(&safe_old, &safe_new).map_err(|e| e.to_string())
}
