mod db;
mod error;

pub use db::{
    close_all_databases, close_database, create_entry, delete_entry, get_entry, get_entry_password,
    list_entries, open_database, save_database, update_entry, EntryDetailData, EntryPatch,
    EntrySummary, OpenedDatabase,
};
pub use error::{Error, Result};
