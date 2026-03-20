use std::io::{Read, Write};
use crate::models::{OAuthCallbackResult, OAuthTokenResponse, CloudFile};

#[tauri::command]
pub async fn open_oauth_window(url: String, expected_state: String) -> Result<OAuthCallbackResult, String> {
    use std::net::TcpListener;
    use std::time::Duration;

    let ports = [8765, 8766, 8767, 8768, 8769];
    let mut listener = None;
    let mut bound_port = 0;

    for port in &ports {
        match TcpListener::bind(format!("127.0.0.1:{}", port)) {
            Ok(l) => {
                bound_port = *port;
                listener = Some(l);
                break;
            }
            Err(_) => continue,
        }
    }

    let listener = listener.ok_or("Could not bind to any available port for OAuth callback")?;
    listener.set_nonblocking(false).map_err(|e| e.to_string())?;

    let redirect_uri = format!("http://localhost:{}/callback", bound_port);
    let oauth_url = if bound_port != 8765 {
        url.replace("http://localhost:8765/callback", &redirect_uri)
    } else {
        url
    };

    open::that(&oauth_url).map_err(|e| e.to_string())?;

    let (tx, rx) = std::sync::mpsc::channel();
    let handle = std::thread::spawn(move || {
        match listener.accept() {
            Ok((mut stream, _)) => {
                let mut buffer = [0; 4096];
                let read_result = stream.read(&mut buffer);
                let request = match read_result {
                    Ok(size) => String::from_utf8_lossy(&buffer[..size]).to_string(),
                    Err(err) => {
                        tx.send(Err(err.to_string())).ok();
                        return;
                    }
                };

                let first_line = request.lines().next().unwrap_or_default();
                let path = first_line.split_whitespace().nth(1).unwrap_or_default().to_string();

                let mut code = None;
                let mut state = None;
                let mut oauth_error = None;
                if let Some(query) = path.split('?').nth(1) {
                    for pair in query.split('&') {
                        let mut parts = pair.splitn(2, '=');
                        let key = parts.next().unwrap_or_default();
                        let value = parts.next().unwrap_or_default();
                        let decoded = urlencoding::decode(value).unwrap_or_else(|_| value.into()).to_string();
                        match key {
                            "code" => code = Some(decoded),
                            "state" => state = Some(decoded),
                            "error" => oauth_error = Some(decoded),
                            _ => {}
                        }
                    }
                }

                let response_body = if oauth_error.is_some() {
                    "<html><body><h1>OAuth failed</h1><p>You can close this window and return to RocketNote.</p></body></html>"
                } else {
                    "<html><body><h1>&#10004; Connected!</h1><p>You can close this window and return to RocketNote.</p><script>window.close()</script></body></html>"
                };
                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\n\r\n{}",
                    response_body.len(),
                    response_body
                );
                let _ = stream.write_all(response.as_bytes());

                let result = match oauth_error {
                    Some(err) => Err(format!("OAuth provider returned error: {}", err)),
                    None => Ok((code, state)),
                };
                tx.send(result).ok();
            }
            Err(e) => {
                tx.send(Err(e.to_string())).ok();
            }
        }
    });

    let result = rx.recv_timeout(Duration::from_secs(120))
        .map_err(|_| "OAuth timed out after 120 seconds. Please try again.")?;

    let _ = handle.join();

    let (code, returned_state) = result?;
    let code = code.ok_or("No authorization code received")?;
    let returned_state = returned_state.ok_or("OAuth state missing from callback")?;

    if returned_state != expected_state {
        return Err("OAuth state mismatch. Please retry the connection flow.".to_string());
    }

    Ok(OAuthCallbackResult {
        code,
        state: returned_state,
        redirect_uri,
    })
}

#[tauri::command]
pub async fn exchange_oauth_token(
    provider: String,
    code: String,
    client_id: String,
    client_secret: String,
    redirect_uri: String,
) -> Result<OAuthTokenResponse, String> {
    let client = reqwest::Client::new();

    let (token_url, params) = match provider.as_str() {
        "google" => (
            "https://oauth2.googleapis.com/token",
            vec![
                ("code", code.as_str()),
                ("client_id", client_id.as_str()),
                ("client_secret", client_secret.as_str()),
                ("redirect_uri", redirect_uri.as_str()),
                ("grant_type", "authorization_code"),
            ],
        ),
        "dropbox" => (
            "https://api.dropboxapi.com/oauth2/token",
            vec![
                ("code", code.as_str()),
                ("client_id", client_id.as_str()),
                ("client_secret", client_secret.as_str()),
                ("redirect_uri", redirect_uri.as_str()),
                ("grant_type", "authorization_code"),
            ],
        ),
        "onedrive" => (
            "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            vec![
                ("code", code.as_str()),
                ("client_id", client_id.as_str()),
                ("client_secret", client_secret.as_str()),
                ("redirect_uri", redirect_uri.as_str()),
                ("grant_type", "authorization_code"),
                ("scope", "Files.ReadWrite offline_access"),
            ],
        ),
        _ => return Err("Unknown provider".to_string()),
    };

    let response = client
        .post(token_url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token exchange request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Token exchange failed ({}): {}", status, body));
    }

    let data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    let access_token = data["access_token"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| format!("No access_token in response: {}", data))?;

    Ok(OAuthTokenResponse {
        access_token,
        refresh_token: data["refresh_token"].as_str().map(|s| s.to_string()),
        expires_in: data["expires_in"].as_u64(),
        token_type: data["token_type"].as_str().map(|s| s.to_string()),
        scope: data["scope"].as_str().map(|s| s.to_string()),
    })
}

#[tauri::command]
pub async fn refresh_oauth_token(
    provider: String,
    refresh_token: String,
    client_id: String,
    client_secret: String,
) -> Result<OAuthTokenResponse, String> {
    let client = reqwest::Client::new();

    let (token_url, params) = match provider.as_str() {
        "google" => (
            "https://oauth2.googleapis.com/token",
            vec![
                ("refresh_token", refresh_token.as_str()),
                ("client_id", client_id.as_str()),
                ("client_secret", client_secret.as_str()),
                ("grant_type", "refresh_token"),
            ],
        ),
        "dropbox" => (
            "https://api.dropboxapi.com/oauth2/token",
            vec![
                ("refresh_token", refresh_token.as_str()),
                ("client_id", client_id.as_str()),
                ("client_secret", client_secret.as_str()),
                ("grant_type", "refresh_token"),
            ],
        ),
        "onedrive" => (
            "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            vec![
                ("refresh_token", refresh_token.as_str()),
                ("client_id", client_id.as_str()),
                ("client_secret", client_secret.as_str()),
                ("grant_type", "refresh_token"),
                ("scope", "Files.ReadWrite offline_access"),
            ],
        ),
        _ => return Err("Unknown provider".to_string()),
    };

    let response = client
        .post(token_url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token refresh request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Token refresh failed ({}): {}", status, body));
    }

    let data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse token refresh response: {}", e))?;

    let access_token = data["access_token"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| format!("No access_token in refresh response: {}", data))?;

    Ok(OAuthTokenResponse {
        access_token,
        refresh_token: data["refresh_token"].as_str().map(|s| s.to_string()).or(Some(refresh_token)),
        expires_in: data["expires_in"].as_u64(),
        token_type: data["token_type"].as_str().map(|s| s.to_string()),
        scope: data["scope"].as_str().map(|s| s.to_string()),
    })
}

#[tauri::command]
pub async fn cloud_list_files(provider: String, token: String, path: String) -> Result<Vec<CloudFile>, String> {
    let client = reqwest::Client::new();

    let files = match provider.as_str() {
        "google" => {
            let query = if path == "/" {
                "'root' in parents".to_string()
            } else {
                format!("'{}' in parents", path)
            };

            let response = client
                .get("https://www.googleapis.com/drive/v3/files")
                .header("Authorization", format!("Bearer {}", token))
                .query(&[
                    ("q", query.as_str()),
                    ("fields", "files(id,name,size,modifiedTime)"),
                ])
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                return Err(format!("Google Drive API error ({}): {}", status, body));
            }

            let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

            data["files"]
                .as_array()
                .unwrap_or(&vec![])
                .iter()
                .map(|f| CloudFile {
                    id: f["id"].as_str().unwrap_or("").to_string(),
                    name: f["name"].as_str().unwrap_or("").to_string(),
                    size: f["size"].as_str().and_then(|s| s.parse().ok()).unwrap_or(0),
                    modified: f["modifiedTime"].as_str().unwrap_or("").to_string(),
                    is_encrypted: f["name"].as_str().unwrap_or("").ends_with(".encrypted"),
                })
                .collect()
        }
        "dropbox" => {
            let body = serde_json::json!({
                "path": if path == "/" { "".to_string() } else { path },
                "recursive": false,
            });

            let response = client
                .post("https://api.dropboxapi.com/2/files/list_folder")
                .header("Authorization", format!("Bearer {}", token))
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                return Err(format!("Dropbox API error ({}): {}", status, body));
            }

            let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

            data["entries"]
                .as_array()
                .unwrap_or(&vec![])
                .iter()
                .filter(|f| f[".tag"].as_str() == Some("file"))
                .map(|f| CloudFile {
                    id: f["id"].as_str().unwrap_or("").to_string(),
                    name: f["name"].as_str().unwrap_or("").to_string(),
                    size: f["size"].as_u64().unwrap_or(0),
                    modified: f["server_modified"].as_str().unwrap_or("").to_string(),
                    is_encrypted: f["name"].as_str().unwrap_or("").ends_with(".encrypted"),
                })
                .collect()
        }
        "onedrive" => {
            let url = if path == "/" {
                "https://graph.microsoft.com/v1.0/me/drive/root/children".to_string()
            } else {
                format!("https://graph.microsoft.com/v1.0/me/drive/items/{}/children", path)
            };

            let response = client
                .get(&url)
                .header("Authorization", format!("Bearer {}", token))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                return Err(format!("OneDrive API error ({}): {}", status, body));
            }

            let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

            data["value"]
                .as_array()
                .unwrap_or(&vec![])
                .iter()
                .filter(|f| f["file"].is_object())
                .map(|f| CloudFile {
                    id: f["id"].as_str().unwrap_or("").to_string(),
                    name: f["name"].as_str().unwrap_or("").to_string(),
                    size: f["size"].as_u64().unwrap_or(0),
                    modified: f["lastModifiedDateTime"].as_str().unwrap_or("").to_string(),
                    is_encrypted: f["name"].as_str().unwrap_or("").ends_with(".encrypted"),
                })
                .collect()
        }
        _ => return Err("Unknown provider".to_string()),
    };

    Ok(files)
}

#[tauri::command]
pub async fn cloud_upload_file(
    provider: String,
    token: String,
    path: String,
    file_name: String,
    content: String
) -> Result<(), String> {
    let client = reqwest::Client::new();

    match provider.as_str() {
        "google" => {
            let metadata = serde_json::json!({
                "name": file_name,
                "parents": if path == "/" { vec!["root".to_string()] } else { vec![path] }
            });

            let boundary = "notepadmac_boundary";
            let body = format!(
                "--{}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{}\r\n--{}\r\nContent-Type: text/plain\r\n\r\n{}\r\n--{}--",
                boundary,
                metadata.to_string(),
                boundary,
                content,
                boundary
            );

            let response = client
                .post("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart")
                .header("Authorization", format!("Bearer {}", token))
                .header("Content-Type", format!("multipart/related; boundary={}", boundary))
                .body(body)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                return Err(format!("Google Drive upload failed ({}): {}", status, body));
            }
        }
        "dropbox" => {
            let path_full = if path == "/" {
                format!("/{}", file_name)
            } else {
                format!("{}/{}", path, file_name)
            };

            let response = client
                .post("https://content.dropboxapi.com/2/files/upload")
                .header("Authorization", format!("Bearer {}", token))
                .header("Dropbox-API-Arg", serde_json::json!({
                    "path": path_full,
                    "mode": "overwrite"
                }).to_string())
                .header("Content-Type", "application/octet-stream")
                .body(content)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                return Err(format!("Dropbox upload failed ({}): {}", status, body));
            }
        }
        "onedrive" => {
            let url = if path == "/" {
                format!("https://graph.microsoft.com/v1.0/me/drive/root:/{}:/content", file_name)
            } else {
                format!("https://graph.microsoft.com/v1.0/me/drive/items/{}:/{}:/content", path, file_name)
            };

            let response = client
                .put(&url)
                .header("Authorization", format!("Bearer {}", token))
                .header("Content-Type", "text/plain")
                .body(content)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                return Err(format!("OneDrive upload failed ({}): {}", status, body));
            }
        }
        _ => return Err("Unknown provider".to_string()),
    };

    Ok(())
}

#[tauri::command]
pub async fn cloud_download_file(provider: String, token: String, file_id: String) -> Result<String, String> {
    let client = reqwest::Client::new();

    let content = match provider.as_str() {
        "google" => {
            let url = format!("https://www.googleapis.com/drive/v3/files/{}?alt=media", file_id);

            let response = client
                .get(&url)
                .header("Authorization", format!("Bearer {}", token))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                return Err(format!("Google Drive download failed ({}): {}", status, body));
            }

            response.text().await.map_err(|e| e.to_string())?
        }
        "dropbox" => {
            let response = client
                .post("https://content.dropboxapi.com/2/files/download")
                .header("Authorization", format!("Bearer {}", token))
                .header("Dropbox-API-Arg", serde_json::json!({
                    "path": file_id
                }).to_string())
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                return Err(format!("Dropbox download failed ({}): {}", status, body));
            }

            response.text().await.map_err(|e| e.to_string())?
        }
        "onedrive" => {
            let url = format!("https://graph.microsoft.com/v1.0/me/drive/items/{}/content", file_id);

            let response = client
                .get(&url)
                .header("Authorization", format!("Bearer {}", token))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                return Err(format!("OneDrive download failed ({}): {}", status, body));
            }

            response.text().await.map_err(|e| e.to_string())?
        }
        _ => return Err("Unknown provider".to_string()),
    };

    Ok(content)
}
