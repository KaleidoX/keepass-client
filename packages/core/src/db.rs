use std::{collections::HashMap, fs::File, path::PathBuf, sync::Mutex};

use keepass::{db::{EntryId, fields, Database}, DatabaseKey};
use once_cell::sync::Lazy;
use uuid::Uuid;

use crate::error::{Error, Result};

static SESSIONS: Lazy<Mutex<HashMap<Uuid, Session>>> = Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Entry {
    pub id: EntryId,
    pub title: String,
    pub username: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OpenedDatabase {
    pub database_id: Uuid,
    pub entries: Vec<Entry>,
}

struct Session {
    path: PathBuf,
    password: String,
    entries: HashMap<EntryId, Entry>,
}

pub fn open_database(path: PathBuf, password: String) -> Result<OpenedDatabase> {
    let mut file = File::open(&path)?;
    let database = Database::open(&mut file, DatabaseKey::new().with_password(&password))?;

    let entries: Vec<Entry> = database
        .iter_all_entries()
        .map(|entry| Entry {
            id: entry.id(),
            title: entry.get(fields::TITLE).unwrap_or_default().to_string(),
            username: entry.get(fields::USERNAME).unwrap_or_default().to_string(),
        })
        .collect();

    let database_id = Uuid::new_v4();
    let session = Session {
        path,
        password,
        entries: entries.iter().cloned().map(|entry| (entry.id, entry)).collect(),
    };

    SESSIONS.lock().map_err(|_| Error::SessionStorePoisoned)?.insert(database_id, session);

    Ok(OpenedDatabase { database_id, entries })
}

pub fn list_entries(database_id: Uuid) -> Result<Vec<Entry>> {
    let sessions = SESSIONS.lock().map_err(|_| Error::SessionStorePoisoned)?;
    let session = sessions.get(&database_id).ok_or(Error::SessionNotFound(database_id))?;

    Ok(session.entries.values().cloned().collect())
}

pub fn get_entry(database_id: Uuid, entry_id: EntryId) -> Result<Entry> {
    let sessions = SESSIONS.lock().map_err(|_| Error::SessionStorePoisoned)?;
    let session = sessions.get(&database_id).ok_or(Error::SessionNotFound(database_id))?;

    session
        .entries
        .get(&entry_id)
        .cloned()
        .ok_or(Error::EntryNotFound { database_id, entry_id })
}

#[allow(dead_code)]
impl Session {
    fn path(&self) -> &PathBuf {
        &self.path
    }

    fn password(&self) -> &str {
        &self.password
    }
}
