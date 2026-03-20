use std::path::PathBuf;

pub(crate) fn get_data_dir() -> Result<PathBuf, String> {
    dirs::data_dir()
        .map(|p| p.join("notepad-mac"))
        .ok_or_else(|| "Could not find data directory".to_string())
}
