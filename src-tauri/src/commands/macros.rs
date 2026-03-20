use std::fs;
use crate::models::Macro;
use crate::helpers::get_data_dir;

#[tauri::command]
pub fn save_macro(mac: Macro) -> Result<(), String> {
    let macros_dir = get_data_dir()?.join("macros");
    fs::create_dir_all(&macros_dir).map_err(|e| e.to_string())?;

    let macro_path = macros_dir.join(format!("{}.json", mac.id));
    let json = serde_json::to_string_pretty(&mac).map_err(|e| e.to_string())?;
    fs::write(macro_path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_macros() -> Result<Vec<Macro>, String> {
    let macros_dir = get_data_dir()?.join("macros");

    if !macros_dir.exists() {
        return Ok(vec![]);
    }

    let macros: Vec<Macro> = fs::read_dir(macros_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let content = fs::read_to_string(entry.path()).ok()?;
            serde_json::from_str(&content).ok()
        })
        .collect();

    Ok(macros)
}

#[tauri::command]
pub fn delete_macro(id: String) -> Result<(), String> {
    let macro_path = get_data_dir()?.join("macros").join(format!("{}.json", id));
    fs::remove_file(macro_path).map_err(|e| e.to_string())
}
