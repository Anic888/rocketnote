use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use std::io::Write;
use portable_pty::MasterPty;

pub(crate) struct PtySession {
    pub writer: Arc<Mutex<Box<dyn Write + Send>>>,
    pub master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    pub command_buffer: Arc<Mutex<String>>,
}

lazy_static::lazy_static! {
    pub(crate) static ref PTY_SESSIONS: Mutex<HashMap<String, PtySession>> = Mutex::new(HashMap::new());
}
