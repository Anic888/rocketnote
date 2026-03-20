use std::fs;
use std::path::PathBuf;
use ignore::WalkBuilder;
use rayon::prelude::*;
use crate::models::{SearchMatch, SearchResult};

#[tauri::command]
pub fn global_search(
    directory: String,
    query: String,
    case_sensitive: bool,
    use_regex: bool,
    file_pattern: Option<String>,
    max_results: Option<usize>,
) -> Result<SearchResult, String> {
    use std::time::Instant;
    let start = Instant::now();

    let max_results = max_results.unwrap_or(1000);

    let pattern = if use_regex {
        if case_sensitive {
            regex::Regex::new(&query)
        } else {
            regex::RegexBuilder::new(&query)
                .case_insensitive(true)
                .build()
        }
    } else {
        let escaped = regex::escape(&query);
        if case_sensitive {
            regex::Regex::new(&escaped)
        } else {
            regex::RegexBuilder::new(&escaped)
                .case_insensitive(true)
                .build()
        }
    }.map_err(|e| format!("Invalid pattern: {}", e))?;

    const BINARY_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "gif", "ico", "pdf", "zip", "tar", "gz",
                                     "exe", "dll", "so", "dylib", "class", "jar", "wasm", "mp3",
                                     "mp4", "mov", "avi", "mkv", "webm", "ttf", "woff", "woff2"];

    let mut files_to_search: Vec<PathBuf> = Vec::new();

    let walker = WalkBuilder::new(&directory)
        .hidden(false)
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .ignore(true)
        .build();

    let file_pattern_regex = file_pattern.as_ref().map(|p| {
        regex::Regex::new(p).unwrap_or_else(|_| regex::Regex::new(".*").unwrap())
    });

    for entry in walker.flatten() {
        let path = entry.path();
        if path.is_file() {
            let ext = path.extension()
                .and_then(|e| e.to_str())
                .unwrap_or("");

            if BINARY_EXTENSIONS.contains(&ext.to_lowercase().as_str()) {
                continue;
            }

            if let Some(ref fp) = file_pattern_regex {
                if !fp.is_match(path.to_string_lossy().as_ref()) {
                    continue;
                }
            }

            files_to_search.push(path.to_path_buf());
        }
    }

    let total_files = files_to_search.len();

    let all_matches: Vec<SearchMatch> = files_to_search
        .par_iter()
        .flat_map(|path| {
            let mut matches = Vec::new();

            if let Ok(content) = fs::read_to_string(path) {
                for (line_idx, line) in content.lines().enumerate() {
                    for mat in pattern.find_iter(line) {
                        matches.push(SearchMatch {
                            path: path.to_string_lossy().to_string(),
                            line_number: line_idx + 1,
                            line_content: line.chars().take(500).collect(),
                            match_start: mat.start(),
                            match_end: mat.end(),
                        });

                        if matches.len() >= 100 {
                            break;
                        }
                    }
                }
            }

            matches
        })
        .collect();

    let total_matches = all_matches.len();
    let truncated: Vec<SearchMatch> = all_matches.into_iter().take(max_results).collect();

    let duration = start.elapsed();

    Ok(SearchResult {
        matches: truncated,
        total_files_searched: total_files,
        total_matches,
        duration_ms: duration.as_millis() as u64,
    })
}

#[tauri::command]
pub fn search_in_file(path: String, query: String, case_sensitive: bool) -> Result<Vec<SearchMatch>, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;

    let pattern = if case_sensitive {
        regex::Regex::new(&regex::escape(&query))
    } else {
        regex::RegexBuilder::new(&regex::escape(&query))
            .case_insensitive(true)
            .build()
    }.map_err(|e| e.to_string())?;

    let mut matches = Vec::new();

    for (line_idx, line) in content.lines().enumerate() {
        for mat in pattern.find_iter(line) {
            matches.push(SearchMatch {
                path: path.clone(),
                line_number: line_idx + 1,
                line_content: line.chars().take(500).collect(),
                match_start: mat.start(),
                match_end: mat.end(),
            });

            if matches.len() >= 1000 {
                return Ok(matches);
            }
        }
    }

    Ok(matches)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn create_test_file(dir: &std::path::Path, name: &str, content: &str) -> String {
        let path = dir.join(name);
        let mut f = fs::File::create(&path).unwrap();
        f.write_all(content.as_bytes()).unwrap();
        path.to_string_lossy().to_string()
    }

    #[test]
    fn search_case_insensitive() {
        let dir = tempfile::tempdir().unwrap();
        let path = create_test_file(dir.path(), "test.txt", "Hello World\nhello world\nHELLO WORLD");

        let matches = search_in_file(path, "hello".to_string(), false).unwrap();
        assert_eq!(matches.len(), 3);
    }

    #[test]
    fn search_case_sensitive() {
        let dir = tempfile::tempdir().unwrap();
        let path = create_test_file(dir.path(), "test.txt", "Hello World\nhello world\nHELLO WORLD");

        let matches = search_in_file(path, "hello".to_string(), true).unwrap();
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].line_number, 2);
    }

    #[test]
    fn search_line_numbers_correct() {
        let dir = tempfile::tempdir().unwrap();
        let path = create_test_file(dir.path(), "test.txt", "line one\nfind me\nline three\nfind me again");

        let matches = search_in_file(path, "find".to_string(), true).unwrap();
        assert_eq!(matches.len(), 2);
        assert_eq!(matches[0].line_number, 2);
        assert_eq!(matches[1].line_number, 4);
    }

    #[test]
    fn global_search_finds_across_files() {
        let dir = tempfile::tempdir().unwrap();
        create_test_file(dir.path(), "a.txt", "foo bar");
        create_test_file(dir.path(), "b.txt", "baz foo");
        create_test_file(dir.path(), "c.txt", "no match here");

        let result = global_search(
            dir.path().to_string_lossy().to_string(),
            "foo".to_string(),
            false,
            false,
            None,
            None,
        ).unwrap();

        assert_eq!(result.total_matches, 2);
        assert!(result.total_files_searched >= 3);
    }

    #[test]
    fn global_search_regex() {
        let dir = tempfile::tempdir().unwrap();
        create_test_file(dir.path(), "test.txt", "error: something\nwarning: other\nerror: again");

        let result = global_search(
            dir.path().to_string_lossy().to_string(),
            "^error:".to_string(),
            true,
            true,
            None,
            None,
        ).unwrap();

        assert_eq!(result.total_matches, 2);
    }
}
