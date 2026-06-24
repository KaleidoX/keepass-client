mod db;
mod error;

pub use db::{get_entry, list_entries, open_database, Entry, OpenedDatabase};
pub use error::{Error, Result};
