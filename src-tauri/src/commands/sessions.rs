use std::fs;
use chrono::Utc;
use crate::models::{Session, SessionFile};
use crate::helpers::get_data_dir;

#[tauri::command]
pub fn save_session(name: String, files: Vec<SessionFile>) -> Result<(), String> {
    let sessions_dir = get_data_dir()?.join("sessions");
    fs::create_dir_all(&sessions_dir).map_err(|e| e.to_string())?;

    let session = Session {
        name: name.clone(),
        files,
        created_at: Utc::now().to_rfc3339(),
    };

    let session_path = sessions_dir.join(format!("{}.json", name));
    let json = serde_json::to_string_pretty(&session).map_err(|e| e.to_string())?;
    fs::write(session_path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_session(name: String) -> Result<Session, String> {
    let session_path = get_data_dir()?.join("sessions").join(format!("{}.json", name));
    let json = fs::read_to_string(session_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_sessions() -> Result<Vec<String>, String> {
    let sessions_dir = get_data_dir()?.join("sessions");

    if !sessions_dir.exists() {
        return Ok(vec![]);
    }

    let sessions: Vec<String> = fs::read_dir(sessions_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let name = entry.file_name().to_string_lossy().to_string();
            if name.ends_with(".json") {
                Some(name.trim_end_matches(".json").to_string())
            } else {
                None
            }
        })
        .collect();

    Ok(sessions)
}

#[tauri::command]
pub fn delete_session(name: String) -> Result<(), String> {
    let session_path = get_data_dir()?.join("sessions").join(format!("{}.json", name));
    fs::remove_file(session_path).map_err(|e| e.to_string())
}
