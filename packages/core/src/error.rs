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

    #[error("session store poisoned")]
    SessionStorePoisoned,

    #[error("session not found: {0}")]
    SessionNotFound(Uuid),

    #[error("entry not found: database={database_id}, entry={entry_id}")]
    EntryNotFound { database_id: Uuid, entry_id: EntryId },
}
