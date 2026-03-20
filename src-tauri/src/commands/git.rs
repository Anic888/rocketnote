use std::process::Command;
use crate::models::{GitStatus, GitFileStatus, GitCommit};

#[tauri::command]
pub fn git_status(path: String) -> Result<GitStatus, String> {
    let output = Command::new("git")
        .args(["status", "--porcelain", "-b"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Ok(GitStatus {
            is_repo: false,
            branch: None,
            files: vec![],
            ahead: 0,
            behind: 0,
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.lines().collect();

    let mut branch = None;
    let mut ahead = 0;
    let mut behind = 0;
    let mut files = vec![];

    for line in lines {
        if line.starts_with("##") {
            let branch_info = line.trim_start_matches("## ");
            if let Some(b) = branch_info.split("...").next() {
                branch = Some(b.to_string());
            }
            if branch_info.contains("ahead") {
                if let Some(n) = branch_info.split("ahead ").nth(1) {
                    ahead = n.split(']').next().unwrap_or("0").split(',').next().unwrap_or("0").parse().unwrap_or(0);
                }
            }
            if branch_info.contains("behind") {
                if let Some(n) = branch_info.split("behind ").nth(1) {
                    behind = n.split(']').next().unwrap_or("0").parse().unwrap_or(0);
                }
            }
        } else if line.len() >= 3 {
            let status_code = &line[0..2];
            let file_path = line[3..].to_string();

            let (status, staged) = match status_code {
                "M " => ("modified", true),
                " M" => ("modified", false),
                "MM" => ("modified", true),
                "A " => ("added", true),
                "D " => ("deleted", true),
                " D" => ("deleted", false),
                "R " => ("renamed", true),
                "C " => ("copied", true),
                "??" => ("untracked", false),
                "!!" => ("ignored", false),
                "UU" => ("conflict", false),
                _ => ("unknown", false),
            };

            files.push(GitFileStatus {
                path: file_path,
                status: status.to_string(),
                staged,
            });
        }
    }

    Ok(GitStatus {
        is_repo: true,
        branch,
        files,
        ahead,
        behind,
    })
}

#[tauri::command]
pub fn git_log(path: String, count: i32) -> Result<Vec<GitCommit>, String> {
    let output = Command::new("git")
        .args(["log", &format!("-{}", count), "--pretty=format:%H%x00%h%x00%s%x00%an%x00%ae%x00%ci"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let commits: Vec<GitCommit> = stdout
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('\0').collect();
            if parts.len() >= 6 {
                Some(GitCommit {
                    id: parts[0].to_string(),
                    short_id: parts[1].to_string(),
                    message: parts[2].to_string(),
                    author: parts[3].to_string(),
                    email: parts[4].to_string(),
                    date: parts[5].to_string(),
                })
            } else {
                None
            }
        })
        .collect();

    Ok(commits)
}

#[tauri::command]
pub fn git_diff(path: String, file_path: Option<String>) -> Result<String, String> {
    let mut args = vec!["diff", "--color=never"];
    let fp_string: String;
    if let Some(ref fp) = file_path {
        fp_string = fp.clone();
        args.push("--");
        args.push(&fp_string);
    }

    let output = Command::new("git")
        .args(&args)
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub fn git_stage(path: String, file_path: String) -> Result<(), String> {
    Command::new("git")
        .args(["add", &file_path])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_unstage(path: String, file_path: String) -> Result<(), String> {
    Command::new("git")
        .args(["reset", "HEAD", &file_path])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_commit(path: String, message: String) -> Result<(), String> {
    let output = Command::new("git")
        .args(["commit", "-m", &message])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn git_push(path: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["push"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    let result = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    Ok(result)
}

#[tauri::command]
pub fn git_pull(path: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["pull"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    let result = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    Ok(result)
}

#[tauri::command]
pub fn git_blame(path: String, file_path: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["blame", &file_path])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub fn git_init(path: String) -> Result<(), String> {
    let output = Command::new("git")
        .args(["init"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn git_branches(path: String) -> Result<Vec<String>, String> {
    let output = Command::new("git")
        .args(["branch", "-a"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let branches: Vec<String> = stdout
        .lines()
        .map(|l| l.trim().trim_start_matches("* ").to_string())
        .collect();

    Ok(branches)
}

#[tauri::command]
pub fn git_checkout(path: String, branch: String) -> Result<(), String> {
    let output = Command::new("git")
        .args(["checkout", &branch])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn git_add_remote(path: String, url: String) -> Result<(), String> {
    let _ = Command::new("git")
        .args(["remote", "remove", "origin"])
        .current_dir(&path)
        .output();

    let output = Command::new("git")
        .args(["remote", "add", "origin", &url])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn git_get_remote(path: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["remote", "get-url", "origin"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err("No remote configured".to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[tauri::command]
pub fn git_create_branch(path: String, name: String) -> Result<(), String> {
    let output = Command::new("git")
        .args(["checkout", "-b", &name])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn git_stage_all(path: String) -> Result<(), String> {
    let output = Command::new("git")
        .args(["add", "-A"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn git_discard(path: String, file_path: String) -> Result<(), String> {
    let output = Command::new("git")
        .args(["checkout", "--", &file_path])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(())
}
