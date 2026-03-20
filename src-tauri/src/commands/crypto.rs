use std::fs;
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use argon2::{Argon2, Algorithm, Params, Version};
use rand::RngCore;
use crate::models::{
    EncryptedData, ENCRYPTION_FORMAT_VERSION, ARGON2_MEMORY_KIB, ARGON2_ITERATIONS, ARGON2_LANES,
};

fn derive_key_from_password(password: &str, salt: &[u8]) -> Result<[u8; 32], String> {
    let params = Params::new(ARGON2_MEMORY_KIB, ARGON2_ITERATIONS, ARGON2_LANES, Some(32))
        .map_err(|e| format!("Invalid Argon2 parameters: {}", e))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let mut key = [0u8; 32];
    argon2
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|e| format!("Key derivation failed: {}", e))?;
    Ok(key)
}

#[tauri::command]
pub fn encrypt_text(plaintext: String, password: String) -> Result<String, String> {
    let mut salt = [0u8; 16];
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut salt);
    OsRng.fill_bytes(&mut nonce_bytes);

    let key = derive_key_from_password(&password, &salt)?;

    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| e.to_string())?;

    let result = EncryptedData {
        version: ENCRYPTION_FORMAT_VERSION,
        kdf: format!("argon2id:m={}KiB,t={},p={}", ARGON2_MEMORY_KIB, ARGON2_ITERATIONS, ARGON2_LANES),
        salt: base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &salt),
        nonce: base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &nonce_bytes),
        ciphertext: base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &ciphertext),
    };

    serde_json::to_string(&result).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn decrypt_text(encrypted_json: String, password: String) -> Result<String, String> {
    let data: EncryptedData = serde_json::from_str(&encrypted_json)
        .map_err(|e| format!("Invalid encrypted data: {}", e))?;

    let salt = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &data.salt)
        .map_err(|e| e.to_string())?;
    let nonce_bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &data.nonce)
        .map_err(|e| e.to_string())?;
    let ciphertext = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &data.ciphertext)
        .map_err(|e| e.to_string())?;

    let key = derive_key_from_password(&password, &salt)?;

    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    let plaintext = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| "Decryption failed - wrong password or corrupted data")?;

    String::from_utf8(plaintext).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn encrypt_file(path: String, password: String) -> Result<String, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let encrypted = encrypt_text(content, password)?;

    let encrypted_path = format!("{}.encrypted", path);
    fs::write(&encrypted_path, &encrypted).map_err(|e| e.to_string())?;

    Ok(encrypted_path)
}

#[tauri::command]
pub fn decrypt_file(path: String, password: String) -> Result<String, String> {
    let encrypted = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    decrypt_text(encrypted, password)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encrypt_decrypt_roundtrip() {
        let plaintext = "Hello, World! This is a secret message.";
        let password = "test-password-123";

        let encrypted = encrypt_text(plaintext.to_string(), password.to_string()).unwrap();
        let decrypted = decrypt_text(encrypted, password.to_string()).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn wrong_password_fails() {
        let plaintext = "Secret data";
        let password = "correct-password";
        let wrong_password = "wrong-password";

        let encrypted = encrypt_text(plaintext.to_string(), password.to_string()).unwrap();
        let result = decrypt_text(encrypted, wrong_password.to_string());

        assert!(result.is_err());
    }

    #[test]
    fn key_derivation_produces_32_bytes() {
        let password = "test";
        let salt = [0u8; 16];

        let key = derive_key_from_password(password, &salt).unwrap();
        assert_eq!(key.len(), 32);
    }

    #[test]
    fn different_salts_different_keys() {
        let password = "same-password";
        let salt1 = [1u8; 16];
        let salt2 = [2u8; 16];

        let key1 = derive_key_from_password(password, &salt1).unwrap();
        let key2 = derive_key_from_password(password, &salt2).unwrap();

        assert_ne!(key1, key2);
    }

    #[test]
    fn empty_plaintext_roundtrip() {
        let plaintext = "";
        let password = "password";

        let encrypted = encrypt_text(plaintext.to_string(), password.to_string()).unwrap();
        let decrypted = decrypt_text(encrypted, password.to_string()).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn encrypt_file_roundtrip() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        let content = "File content to encrypt";

        fs::write(&file_path, content).unwrap();

        let encrypted_path = encrypt_file(
            file_path.to_string_lossy().to_string(),
            "pass".to_string(),
        ).unwrap();

        let decrypted = decrypt_file(encrypted_path, "pass".to_string()).unwrap();
        assert_eq!(decrypted, content);
    }
}
