use thiserror::Error;
use uuid::Uuid;

use keepass::db::EntryId;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Error)]
pub enum Error {
    #[error(transparent)]
    Io(#[from] std::io::Error),

    #[error(transparent)]
    Keepass(#[from] keepass::db::DatabaseOpenError),

    #[error(transparent)]
    KeepassSave(#[from] keepass::db::DatabaseSaveError),

    #[error("Refusing to overwrite a non-MVP database. Use a generated MVP copy before saving.")]
    RefusingToOverwriteNonMvpDatabase,

    #[error("session store poisoned")]
    SessionStorePoisoned,

    #[error("session not found: {0}")]
    SessionNotFound(Uuid),

    #[error("invalid entry id: {0}")]
    InvalidEntryId(String),

    #[error("entry not found: database={database_id}, entry={entry_id}")]
    EntryNotFound {
        database_id: Uuid,
        entry_id: EntryId,
    },
}
