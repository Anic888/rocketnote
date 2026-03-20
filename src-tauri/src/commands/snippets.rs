use std::fs;
use crate::models::Snippet;
use crate::helpers::get_data_dir;

#[tauri::command]
pub fn save_snippet(snippet: Snippet) -> Result<(), String> {
    let snippets_dir = get_data_dir()?.join("snippets");
    fs::create_dir_all(&snippets_dir).map_err(|e| e.to_string())?;

    let snippet_path = snippets_dir.join(format!("{}.json", snippet.id));
    let json = serde_json::to_string_pretty(&snippet).map_err(|e| e.to_string())?;
    fs::write(snippet_path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_snippets() -> Result<Vec<Snippet>, String> {
    let snippets_dir = get_data_dir()?.join("snippets");

    if !snippets_dir.exists() {
        return Ok(vec![]);
    }

    let snippets: Vec<Snippet> = fs::read_dir(snippets_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let content = fs::read_to_string(entry.path()).ok()?;
            serde_json::from_str(&content).ok()
        })
        .collect();

    Ok(snippets)
}

#[tauri::command]
pub fn delete_snippet(id: String) -> Result<(), String> {
    let snippet_path = get_data_dir()?.join("snippets").join(format!("{}.json", id));
    fs::remove_file(snippet_path).map_err(|e| e.to_string())
}
