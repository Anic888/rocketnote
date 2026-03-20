#![cfg_attr(
    all(not(debug_assertions), target_os = "macos"),
    windows_subsystem = "windows"
)]

mod models;
mod state;
mod helpers;
mod commands;

fn main() {
    use tauri::{Menu, MenuItem, Submenu, CustomMenuItem, Manager};

    // File menu
    let file_menu = Submenu::new("File", Menu::new()
        .add_item(CustomMenuItem::new("new", "New").accelerator("CmdOrCtrl+N"))
        .add_item(CustomMenuItem::new("open", "Open...").accelerator("CmdOrCtrl+O"))
        .add_item(CustomMenuItem::new("open_folder", "Open Folder...").accelerator("CmdOrCtrl+Shift+O"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("save", "Save").accelerator("CmdOrCtrl+S"))
        .add_item(CustomMenuItem::new("save_as", "Save As...").accelerator("CmdOrCtrl+Shift+S"))
        .add_item(CustomMenuItem::new("save_all", "Save All").accelerator("CmdOrCtrl+Alt+S"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("close", "Close Tab").accelerator("CmdOrCtrl+W"))
        .add_item(CustomMenuItem::new("close_all", "Close All Tabs").accelerator("CmdOrCtrl+Shift+W"))
    );

    // Edit menu
    let edit_menu = Submenu::new("Edit", Menu::new()
        .add_native_item(MenuItem::Undo)
        .add_native_item(MenuItem::Redo)
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Cut)
        .add_native_item(MenuItem::Copy)
        .add_native_item(MenuItem::Paste)
        .add_native_item(MenuItem::SelectAll)
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("find", "Find...").accelerator("CmdOrCtrl+F"))
        .add_item(CustomMenuItem::new("find_replace", "Find and Replace...").accelerator("CmdOrCtrl+H"))
        .add_item(CustomMenuItem::new("global_search", "Search in Files...").accelerator("CmdOrCtrl+Shift+F"))
    );

    // View menu
    let view_menu = Submenu::new("View", Menu::new()
        .add_item(CustomMenuItem::new("sidebar", "Toggle Sidebar").accelerator("CmdOrCtrl+B"))
        .add_item(CustomMenuItem::new("terminal", "Toggle Terminal").accelerator("CmdOrCtrl+`"))
        .add_item(CustomMenuItem::new("split", "Split Editor").accelerator("CmdOrCtrl+Shift+E"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("focus_mode", "Focus Mode").accelerator("CmdOrCtrl+Shift+Enter"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("zoom_in", "Zoom In").accelerator("CmdOrCtrl+="))
        .add_item(CustomMenuItem::new("zoom_out", "Zoom Out").accelerator("CmdOrCtrl+-"))
        .add_item(CustomMenuItem::new("zoom_reset", "Reset Zoom").accelerator("CmdOrCtrl+0"))
    );

    // Tools menu
    let tools_menu = Submenu::new("Tools", Menu::new()
        .add_item(CustomMenuItem::new("git", "Git Panel").accelerator("CmdOrCtrl+Shift+G"))
        .add_item(CustomMenuItem::new("ai", "AI Assistant").accelerator("CmdOrCtrl+K"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("encryption", "Encryption"))
        .add_item(CustomMenuItem::new("cloud", "Cloud Storage"))
        .add_item(CustomMenuItem::new("screenshot", "Code Screenshot"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("dev_tools", "Developer Tools"))
        .add_item(CustomMenuItem::new("snippets", "Snippets"))
        .add_item(CustomMenuItem::new("settings", "Settings...").accelerator("CmdOrCtrl+,"))
    );

    // Window menu
    let window_menu = Submenu::new("Window", Menu::new()
        .add_native_item(MenuItem::Minimize)
        .add_native_item(MenuItem::Zoom)
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("theme_toggle", "Toggle Dark/Light Theme"))
    );

    // Help menu
    let help_menu = Submenu::new("Help", Menu::new()
        .add_item(CustomMenuItem::new("about", "About RocketNote"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("documentation", "Documentation"))
        .add_item(CustomMenuItem::new("shortcuts", "Keyboard Shortcuts"))
        .add_item(CustomMenuItem::new("privacy", "Privacy Policy"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("support", "Support the Author"))
    );

    let menu = Menu::new()
        .add_submenu(file_menu)
        .add_submenu(edit_menu)
        .add_submenu(view_menu)
        .add_submenu(tools_menu)
        .add_submenu(window_menu)
        .add_submenu(help_menu);

    tauri::Builder::default()
        .menu(menu)
        .setup(|app| {
            let args: Vec<String> = std::env::args().collect();
            if args.len() > 1 {
                let file_path = &args[1];
                if !file_path.starts_with('-') && std::path::Path::new(file_path).exists() {
                    let window = app.get_window("main").unwrap();
                    let path = file_path.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(500));
                        let _ = window.emit("open-file", path);
                    });
                }
            }
            Ok(())
        })
        .on_menu_event(|event| {
            let window = event.window();
            match event.menu_item_id() {
                "new" => { let _ = window.emit("menu-new", ()); }
                "open" => { let _ = window.emit("menu-open", ()); }
                "open_folder" => { let _ = window.emit("menu-open-folder", ()); }
                "save" => { let _ = window.emit("menu-save", ()); }
                "save_as" => { let _ = window.emit("menu-save-as", ()); }
                "save_all" => { let _ = window.emit("menu-save-all", ()); }
                "close" => { let _ = window.emit("menu-close", ()); }
                "close_all" => { let _ = window.emit("menu-close-all", ()); }
                "find" => { let _ = window.emit("menu-find", ()); }
                "find_replace" => { let _ = window.emit("menu-find-replace", ()); }
                "global_search" => { let _ = window.emit("menu-global-search", ()); }
                "sidebar" => { let _ = window.emit("menu-sidebar", ()); }
                "terminal" => { let _ = window.emit("menu-terminal", ()); }
                "split" => { let _ = window.emit("menu-split", ()); }
                "focus_mode" => { let _ = window.emit("menu-focus-mode", ()); }
                "git" => { let _ = window.emit("menu-git", ()); }
                "ai" => { let _ = window.emit("menu-ai", ()); }
                "encryption" => { let _ = window.emit("menu-encryption", ()); }
                "cloud" => { let _ = window.emit("menu-cloud", ()); }
                "screenshot" => { let _ = window.emit("menu-screenshot", ()); }
                "dev_tools" => { let _ = window.emit("menu-dev-tools", ()); }
                "snippets" => { let _ = window.emit("menu-snippets", ()); }
                "settings" => { let _ = window.emit("menu-settings", ()); }
                "theme_toggle" => { let _ = window.emit("menu-theme-toggle", ()); }
                "about" => { let _ = window.emit("menu-about", ()); }
                "support" => { let _ = window.emit("menu-support", ()); }
                "documentation" => { let _ = window.emit("menu-documentation", ()); }
                "shortcuts" => { let _ = window.emit("menu-shortcuts", ()); }
                "privacy" => { let _ = window.emit("menu-privacy", ()); }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            // File system
            commands::filesystem::read_file,
            commands::filesystem::read_file_bytes,
            commands::filesystem::write_file,
            commands::filesystem::read_directory,
            commands::filesystem::file_exists,
            commands::filesystem::get_file_name,
            commands::filesystem::create_directory,
            commands::filesystem::delete_file,
            commands::filesystem::rename_file,
            // Terminal
            commands::terminal::execute_command,
            commands::terminal::pty_spawn,
            commands::terminal::pty_write,
            commands::terminal::pty_write_force,
            commands::terminal::pty_resize,
            commands::terminal::pty_kill,
            // Git
            commands::git::git_status,
            commands::git::git_log,
            commands::git::git_diff,
            commands::git::git_stage,
            commands::git::git_unstage,
            commands::git::git_commit,
            commands::git::git_push,
            commands::git::git_pull,
            commands::git::git_blame,
            commands::git::git_init,
            commands::git::git_checkout,
            commands::git::git_branches,
            commands::git::git_add_remote,
            commands::git::git_get_remote,
            commands::git::git_create_branch,
            commands::git::git_stage_all,
            commands::git::git_discard,
            // Utilities
            commands::utilities::format_json,
            commands::utilities::minify_json,
            commands::utilities::base64_encode,
            commands::utilities::base64_decode,
            commands::utilities::hash_md5,
            commands::utilities::hash_sha256,
            commands::utilities::generate_uuid,
            commands::utilities::timestamp_to_date,
            commands::utilities::date_to_timestamp,
            commands::utilities::regex_test,
            // Sessions
            commands::sessions::save_session,
            commands::sessions::load_session,
            commands::sessions::list_sessions,
            commands::sessions::delete_session,
            // Snippets
            commands::snippets::save_snippet,
            commands::snippets::list_snippets,
            commands::snippets::delete_snippet,
            // Stats
            commands::stats::get_coding_stats,
            commands::stats::update_coding_stats,
            commands::stats::reset_coding_stats,
            // Bookmarks
            commands::bookmarks::save_bookmarks,
            commands::bookmarks::load_bookmarks,
            // Macros
            commands::macros::save_macro,
            commands::macros::list_macros,
            commands::macros::delete_macro,
            // Encryption
            commands::crypto::encrypt_text,
            commands::crypto::decrypt_text,
            commands::crypto::encrypt_file,
            commands::crypto::decrypt_file,
            // Global Search
            commands::search::global_search,
            commands::search::search_in_file,
            // Cloud Storage
            commands::cloud::open_oauth_window,
            commands::cloud::exchange_oauth_token,
            commands::cloud::refresh_oauth_token,
            commands::cloud::cloud_list_files,
            commands::cloud::cloud_upload_file,
            commands::cloud::cloud_download_file,
            // Secure Key Storage
            commands::keychain::store_secret,
            commands::keychain::get_secret,
            commands::keychain::delete_secret,
            commands::keychain::store_api_key,
            commands::keychain::get_api_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
