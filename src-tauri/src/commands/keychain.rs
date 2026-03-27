use std::process::Command;

/// Validate secret name contains only safe characters
fn validate_name(name: &str) -> Result<(), String> {
    if name.is_empty() || name.len() > 128 {
        return Err("Invalid secret name: must be 1-128 characters".to_string());
    }
    if !name.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '.' || c == '_') {
        return Err("Invalid secret name: only alphanumeric, hyphens, dots, and underscores allowed".to_string());
    }
    Ok(())
}

fn keychain_service(name: &str) -> String {
    format!("com.rocketnote.app.{}", name)
}

fn store_secret_value(name: &str, value: &str) -> Result<(), String> {
    validate_name(name)?;
    let service = keychain_service(name);
    let account = "secret";

    let _ = Command::new("security")
        .args(["delete-generic-password", "-s", &service, "-a", account])
        .output();

    let output = Command::new("security")
        .args(["add-generic-password", "-s", &service, "-a", account, "-w", value, "-U"])
        .output()
        .map_err(|e| format!("Failed to store secret in Keychain: {}", e))?;

    if !output.status.success() {
        return Err(format!("Keychain error: {}", String::from_utf8_lossy(&output.stderr)));
    }

    Ok(())
}

fn get_secret_value(name: &str) -> Result<String, String> {
    validate_name(name)?;
    let service = keychain_service(name);
    let account = "secret";

    let output = Command::new("security")
        .args(["find-generic-password", "-s", &service, "-a", account, "-w"])
        .output()
        .map_err(|e| format!("Failed to read secret from Keychain: {}", e))?;

    if !output.status.success() {
        return Err("Secret not found in Keychain".to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn delete_secret_value(name: &str) -> Result<(), String> {
    validate_name(name)?;
    let service = keychain_service(name);
    let account = "secret";

    let output = Command::new("security")
        .args(["delete-generic-password", "-s", &service, "-a", account])
        .output()
        .map_err(|e| format!("Failed to delete secret from Keychain: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        if stderr.to_lowercase().contains("could not be found") {
            return Ok(());
        }
        return Err(format!("Keychain error: {}", stderr));
    }

    Ok(())
}

#[tauri::command]
pub fn store_secret(name: String, value: String) -> Result<(), String> {
    store_secret_value(&name, &value)
}

#[tauri::command]
pub fn get_secret(name: String) -> Result<String, String> {
    get_secret_value(&name)
}

#[tauri::command]
pub fn delete_secret(name: String) -> Result<(), String> {
    delete_secret_value(&name)
}

#[tauri::command]
pub fn store_api_key(provider: String, key: String) -> Result<(), String> {
    store_secret_value(&format!("{}-api-key", provider), &key)
}

#[tauri::command]
pub fn get_api_key(provider: String) -> Result<String, String> {
    get_secret_value(&format!("{}-api-key", provider))
}
