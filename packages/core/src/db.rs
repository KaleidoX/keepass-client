use std::{collections::HashMap, fs::File, path::PathBuf, sync::Mutex};

use keepass::{
    db::{fields, Database, EntryId},
    DatabaseKey,
};
use once_cell::sync::Lazy;
use uuid::Uuid;

use crate::error::{Error, Result};

static SESSIONS: Lazy<Mutex<HashMap<Uuid, Session>>> = Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EntrySummary {
    pub id: String,
    pub title: String,
    pub username: String,
    pub url: Option<String>,
    pub group_path: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EntryDetailData {
    pub id: String,
    pub title: String,
    pub username: String,
    pub url: Option<String>,
    pub notes: Option<String>,
    pub group_path: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EntryPatch {
    pub title: String,
    pub username: String,
    pub password: Option<String>,
    pub url: Option<String>,
    pub notes: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OpenedDatabase {
    pub database_id: Uuid,
    pub entries: Vec<EntrySummary>,
}

struct Session {
    path: PathBuf,
    password: String,
    database: Database,
    is_mvp_managed: bool,
}

pub fn open_database(path: PathBuf, password: String) -> Result<OpenedDatabase> {
    let mut file = File::open(&path)?;
    let database = Database::open(&mut file, DatabaseKey::new().with_password(&password))?;

    let entries = entry_summaries_from_database(&database);

    let database_id = Uuid::new_v4();
    let session = Session {
        path,
        password,
        database,
        is_mvp_managed: true,
    };

    SESSIONS
        .lock()
        .map_err(|_| Error::SessionStorePoisoned)?
        .insert(database_id, session);

    Ok(OpenedDatabase {
        database_id,
        entries,
    })
}

pub fn list_entries(database_id: Uuid) -> Result<Vec<EntrySummary>> {
    let sessions = SESSIONS.lock().map_err(|_| Error::SessionStorePoisoned)?;
    let session = sessions
        .get(&database_id)
        .ok_or(Error::SessionNotFound(database_id))?;

    Ok(entry_summaries_from_database(&session.database))
}

pub fn get_entry(database_id: Uuid, entry_id: String) -> Result<EntryDetailData> {
    let sessions = SESSIONS.lock().map_err(|_| Error::SessionStorePoisoned)?;
    let session = sessions
        .get(&database_id)
        .ok_or(Error::SessionNotFound(database_id))?;
    let entry_id = parse_entry_id(&entry_id)?;

    session
        .database
        .entry(entry_id)
        .map(entry_detail_from_ref)
        .ok_or(Error::EntryNotFound {
            database_id,
            entry_id,
        })
}

pub fn update_entry(
    database_id: Uuid,
    entry_id: String,
    patch: EntryPatch,
) -> Result<EntryDetailData> {
    let mut sessions = SESSIONS.lock().map_err(|_| Error::SessionStorePoisoned)?;
    let session = sessions
        .get_mut(&database_id)
        .ok_or(Error::SessionNotFound(database_id))?;
    let entry_id = parse_entry_id(&entry_id)?;
    let mut entry = session
        .database
        .entry_mut(entry_id)
        .ok_or(Error::EntryNotFound {
            database_id,
            entry_id,
        })?;

    apply_patch(&mut entry, patch);

    Ok(entry_detail_from_ref(entry.as_ref()))
}

pub fn save_database(database_id: Uuid) -> Result<()> {
    let sessions = SESSIONS.lock().map_err(|_| Error::SessionStorePoisoned)?;
    let session = sessions
        .get(&database_id)
        .ok_or(Error::SessionNotFound(database_id))?;

    if !session.is_mvp_managed {
        return Err(Error::RefusingToOverwriteNonMvpDatabase);
    }

    let mut file = File::create(&session.path)?;
    session.database.save(
        &mut file,
        DatabaseKey::new().with_password(&session.password),
    )?;

    Ok(())
}

pub fn create_entry(database_id: Uuid, patch: EntryPatch) -> Result<EntryDetailData> {
    let mut sessions = SESSIONS.lock().map_err(|_| Error::SessionStorePoisoned)?;
    let session = sessions
        .get_mut(&database_id)
        .ok_or(Error::SessionNotFound(database_id))?;
    let mut root = session.database.root_mut();
    let mut entry = root.add_entry();

    apply_patch(&mut entry, patch);

    Ok(entry_detail_from_ref(entry.as_ref()))
}

pub fn delete_entry(database_id: Uuid, entry_id: String) -> Result<()> {
    let mut sessions = SESSIONS.lock().map_err(|_| Error::SessionStorePoisoned)?;
    let session = sessions
        .get_mut(&database_id)
        .ok_or(Error::SessionNotFound(database_id))?;
    let entry_id = parse_entry_id(&entry_id)?;
    let entry = session
        .database
        .entry_mut(entry_id)
        .ok_or(Error::EntryNotFound {
            database_id,
            entry_id,
        })?;

    entry.remove();

    Ok(())
}

pub fn get_entry_password(database_id: Uuid, entry_id: String) -> Result<String> {
    let sessions = SESSIONS.lock().map_err(|_| Error::SessionStorePoisoned)?;
    let session = sessions
        .get(&database_id)
        .ok_or(Error::SessionNotFound(database_id))?;
    let entry_id = parse_entry_id(&entry_id)?;

    session
        .database
        .entry(entry_id)
        .ok_or(Error::EntryNotFound {
            database_id,
            entry_id,
        })
        .map(|entry| entry.get(fields::PASSWORD).unwrap_or_default().to_string())
}

fn entry_summaries_from_database(database: &Database) -> Vec<EntrySummary> {
    database
        .iter_all_entries()
        .map(entry_summary_from_ref)
        .collect()
}

fn entry_summary_from_ref(entry: keepass::db::EntryRef<'_>) -> EntrySummary {
    EntrySummary {
        id: entry.id().to_string(),
        title: entry.get(fields::TITLE).unwrap_or_default().to_string(),
        username: entry.get(fields::USERNAME).unwrap_or_default().to_string(),
        url: optional_field(&entry, fields::URL),
        group_path: group_path(&entry),
    }
}

fn entry_detail_from_ref(entry: keepass::db::EntryRef<'_>) -> EntryDetailData {
    EntryDetailData {
        id: entry.id().to_string(),
        title: entry.get(fields::TITLE).unwrap_or_default().to_string(),
        username: entry.get(fields::USERNAME).unwrap_or_default().to_string(),
        url: optional_field(&entry, fields::URL),
        notes: optional_field(&entry, fields::NOTES),
        group_path: group_path(&entry),
    }
}

fn apply_patch(entry: &mut keepass::db::EntryMut<'_>, patch: EntryPatch) {
    entry.set_unprotected(fields::TITLE, patch.title);
    entry.set_unprotected(fields::USERNAME, patch.username);
    if let Some(password) = patch.password {
        entry.set_protected(fields::PASSWORD, password);
    }
    set_optional_unprotected(entry, fields::URL, patch.url);
    set_optional_unprotected(entry, fields::NOTES, patch.notes);
}

fn parse_entry_id(entry_id: &str) -> Result<EntryId> {
    let uuid =
        Uuid::parse_str(entry_id).map_err(|_| Error::InvalidEntryId(entry_id.to_string()))?;

    Ok(EntryId::from_uuid(uuid))
}

fn optional_field(entry: &keepass::db::EntryRef<'_>, field: &str) -> Option<String> {
    entry
        .get(field)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn set_optional_unprotected(
    entry: &mut keepass::db::EntryMut<'_>,
    field: &str,
    value: Option<String>,
) {
    if let Some(value) = value {
        entry.set_unprotected(field, value);
    }
}

fn group_path(entry: &keepass::db::EntryRef<'_>) -> Vec<String> {
    group_path_from_group(entry.parent())
}

fn group_path_from_group(group: keepass::db::GroupRef<'_>) -> Vec<String> {
    let mut path = group
        .parent()
        .map(group_path_from_group)
        .unwrap_or_default();
    if !group.name.is_empty() {
        path.push(group.name.clone());
    }
    path
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn save_database_refuses_non_mvp_managed_session() {
        let database_id = Uuid::new_v4();
        let session = Session {
            path: std::env::temp_dir().join(format!("keepass-client-non-mvp-{database_id}.kdbx")),
            password: "secret".to_string(),
            database: Database::new(),
            is_mvp_managed: false,
        };
        SESSIONS
            .lock()
            .expect("session store locks")
            .insert(database_id, session);

        let error = save_database(database_id)
            .expect_err("save is refused")
            .to_string();

        SESSIONS
            .lock()
            .expect("session store locks")
            .remove(&database_id);
        assert!(error.contains(
            "Refusing to overwrite a non-MVP database. Use a generated MVP copy before saving."
        ));
    }
}
