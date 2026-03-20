use std::fs;
use chrono::Utc;
use crate::models::{CodingStats, DailyStats};
use crate::helpers::get_data_dir;

#[tauri::command]
pub fn get_coding_stats() -> Result<CodingStats, String> {
    let stats_path = get_data_dir()?.join("stats.json");

    if !stats_path.exists() {
        return Ok(CodingStats::default());
    }

    let json = fs::read_to_string(stats_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_coding_stats(lines: i64, characters: i64, time_seconds: i64) -> Result<(), String> {
    let data_dir = get_data_dir()?;
    fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

    let stats_path = data_dir.join("stats.json");
    let mut stats: CodingStats = if stats_path.exists() {
        let json = fs::read_to_string(&stats_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&json).unwrap_or_default()
    } else {
        CodingStats::default()
    };

    stats.total_lines_written += lines;
    stats.total_characters += characters;
    stats.total_time_seconds += time_seconds;

    let today = Utc::now().format("%Y-%m-%d").to_string();
    let daily = stats.daily_stats.entry(today).or_insert(DailyStats::default());
    daily.lines += lines;
    daily.characters += characters;
    daily.time_seconds += time_seconds;

    let json = serde_json::to_string_pretty(&stats).map_err(|e| e.to_string())?;
    fs::write(stats_path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reset_coding_stats() -> Result<(), String> {
    let data_dir = get_data_dir()?;
    let stats_path = data_dir.join("stats.json");

    let stats = CodingStats::default();
    let json = serde_json::to_string_pretty(&stats).map_err(|e| e.to_string())?;
    fs::write(stats_path, json).map_err(|e| e.to_string())
}
