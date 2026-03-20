use chrono::{Utc, TimeZone, DateTime};
use crate::models::RegexMatch;

#[tauri::command]
pub fn format_json(input: String) -> Result<String, String> {
    let value: serde_json::Value = serde_json::from_str(&input)
        .map_err(|e| format!("JSON Parse Error: {}", e))?;
    serde_json::to_string_pretty(&value)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn minify_json(input: String) -> Result<String, String> {
    let value: serde_json::Value = serde_json::from_str(&input)
        .map_err(|e| format!("JSON Parse Error: {}", e))?;
    serde_json::to_string(&value)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn base64_encode(input: String) -> String {
    use base64::{Engine as _, engine::general_purpose};
    general_purpose::STANDARD.encode(input.as_bytes())
}

#[tauri::command]
pub fn base64_decode(input: String) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose};
    let bytes = general_purpose::STANDARD.decode(&input)
        .map_err(|e| e.to_string())?;
    String::from_utf8(bytes).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn hash_md5(input: String) -> String {
    format!("{:x}", md5::compute(input.as_bytes()))
}

#[tauri::command]
pub fn hash_sha256(input: String) -> String {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    format!("{:x}", hasher.finalize())
}

#[tauri::command]
pub fn generate_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

#[tauri::command]
pub fn timestamp_to_date(timestamp: i64) -> String {
    match Utc.timestamp_opt(timestamp, 0).single() {
        Some(d) => d.format("%Y-%m-%d %H:%M:%S UTC").to_string(),
        None => "Invalid timestamp".to_string(),
    }
}

#[tauri::command]
pub fn date_to_timestamp(date: String) -> Result<i64, String> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(&date) {
        return Ok(dt.timestamp());
    }
    if let Ok(dt) = chrono::NaiveDate::parse_from_str(&date, "%Y-%m-%d") {
        let datetime = dt.and_hms_opt(0, 0, 0).unwrap();
        return Ok(datetime.and_utc().timestamp());
    }
    Err("Could not parse date".to_string())
}

#[tauri::command]
pub fn regex_test(pattern: String, text: String, flags: String) -> Result<Vec<RegexMatch>, String> {
    let case_insensitive = flags.contains('i');
    let multiline = flags.contains('m');

    let re = regex::RegexBuilder::new(&pattern)
        .case_insensitive(case_insensitive)
        .multi_line(multiline)
        .build()
        .map_err(|e| e.to_string())?;

    let matches: Vec<RegexMatch> = re.find_iter(&text)
        .map(|m| RegexMatch {
            text: m.as_str().to_string(),
            start: m.start(),
            end: m.end(),
        })
        .collect();

    Ok(matches)
}
