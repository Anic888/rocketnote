use std::fs;
use crate::models::Bookmark;
use crate::helpers::get_data_dir;

#[tauri::command]
pub fn save_bookmarks(bookmarks: Vec<Bookmark>) -> Result<(), String> {
    let data_dir = get_data_dir()?;
    fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

    let bookmarks_path = data_dir.join("bookmarks.json");
    let json = serde_json::to_string_pretty(&bookmarks).map_err(|e| e.to_string())?;
    fs::write(bookmarks_path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_bookmarks() -> Result<Vec<Bookmark>, String> {
    let bookmarks_path = get_data_dir()?.join("bookmarks.json");

    if !bookmarks_path.exists() {
        return Ok(vec![]);
    }

    let json = fs::read_to_string(bookmarks_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&json).map_err(|e| e.to_string())
}
