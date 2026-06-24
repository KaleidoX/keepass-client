use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicUsize, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

use keepass::{db::fields, Database, DatabaseKey};

pub struct FixtureDatabase {
    pub path: PathBuf,
}

pub fn create_fixture_database(password: &str) -> FixtureDatabase {
    static COUNTER: AtomicUsize = AtomicUsize::new(0);
    let unique = format!(
        "keepass-client-fixture-{}-{}-{}",
        std::process::id(),
        SystemTime::now().duration_since(UNIX_EPOCH).expect("system time before epoch").as_nanos(),
        COUNTER.fetch_add(1, Ordering::Relaxed)
    );
    let dir = std::env::temp_dir().join(unique);
    fs::create_dir_all(&dir).expect("create temp dir");
    let path = dir.join("fixture.kdbx");

    let mut database = Database::new();
    database.meta.database_name = Some("KeePass Client Fixture".to_string());

    let mut root = database.root_mut();
    let mut group = root.add_group();
    group.name = "Root".to_string();
    let mut entry = group.add_entry();
    entry.set_unprotected(fields::TITLE, "GitHub");
    entry.set_unprotected(fields::USERNAME, "octo");
    entry.set_protected(fields::PASSWORD, "ghp_secret");

    let mut bytes = Vec::new();
    database.save(&mut bytes, DatabaseKey::new().with_password(password)).expect("save fixture database");
    fs::write(&path, bytes).expect("write fixture database");

    FixtureDatabase { path }
}
