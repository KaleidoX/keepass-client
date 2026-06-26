use keepass_core::{
    close_all_databases, close_database, create_entry, delete_entry, get_entry, get_entry_password,
    list_entries, open_database, save_database, update_entry, EntryPatch, Error,
};
use std::sync::{Mutex, MutexGuard};

mod fixtures;

static CORE_TEST_LOCK: Mutex<()> = Mutex::new(());

fn core_test_guard() -> MutexGuard<'static, ()> {
    CORE_TEST_LOCK
        .lock()
        .expect("core test lock should not be poisoned")
}

#[test]
fn opens_fixture_database_and_lists_entries() {
    let _guard = core_test_guard();
    let _ = close_all_databases();

    let fixture = fixtures::create_fixture_database("secret");
    let opened = open_database(fixture.path.clone(), "secret".to_string()).expect("database opens");
    let entries = list_entries(opened.database_id).expect("entries list");

    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].title, "GitHub");
    assert_eq!(entries[0].username, "octo");
    assert_eq!(entries[0].url, None);
    assert_eq!(entries[0].group_path, vec!["Root".to_string()]);
}

#[test]
fn returns_entry_detail_without_password() {
    let _guard = core_test_guard();
    let _ = close_all_databases();

    let fixture = fixtures::create_fixture_database("secret");
    let opened = open_database(fixture.path.clone(), "secret".to_string()).expect("database opens");
    let entry = get_entry(opened.database_id, opened.entries[0].id.clone()).expect("entry exists");

    assert_eq!(entry.title, "GitHub");
    assert_eq!(entry.username, "octo");
    assert_eq!(entry.url, None);
    assert_eq!(entry.notes, None);
    assert_eq!(entry.group_path, vec!["Root".to_string()]);
}

#[test]
fn updates_entry_and_saves_database() {
    let _guard = core_test_guard();
    let _ = close_all_databases();

    let fixture = fixtures::create_fixture_database("secret");
    let opened = open_database(fixture.path.clone(), "secret".to_string()).expect("database opens");
    let entry_id = opened.entries[0].id.clone();

    let updated = update_entry(
        opened.database_id,
        entry_id.clone(),
        EntryPatch {
            title: "GitHub Enterprise".to_string(),
            username: "hubot".to_string(),
            password: Some("rotated_secret".to_string()),
            url: Some("https://github.example.test".to_string()),
            notes: Some("SSO account".to_string()),
        },
    )
    .expect("entry updates");

    assert_eq!(updated.title, "GitHub Enterprise");
    assert_eq!(updated.username, "hubot");
    assert_eq!(updated.url, Some("https://github.example.test".to_string()));
    assert_eq!(updated.notes, Some("SSO account".to_string()));

    save_database(opened.database_id).expect("database saves");

    let reopened =
        open_database(fixture.path.clone(), "secret".to_string()).expect("database reopens");
    let persisted =
        get_entry(reopened.database_id, entry_id.clone()).expect("updated entry persists");

    assert_eq!(persisted.title, "GitHub Enterprise");
    assert_eq!(persisted.username, "hubot");
    assert_eq!(
        persisted.url,
        Some("https://github.example.test".to_string())
    );
    assert_eq!(persisted.notes, Some("SSO account".to_string()));
    assert_eq!(
        get_entry_password(reopened.database_id, entry_id).expect("password persists"),
        "rotated_secret"
    );
}

#[test]
fn creates_deletes_and_reads_password() {
    let _guard = core_test_guard();
    let _ = close_all_databases();

    let fixture = fixtures::create_fixture_database("secret");
    let opened = open_database(fixture.path.clone(), "secret".to_string()).expect("database opens");

    let created = create_entry(
        opened.database_id,
        EntryPatch {
            title: "GitLab".to_string(),
            username: "tanuki".to_string(),
            password: Some("glpat_secret".to_string()),
            url: Some("https://gitlab.example.test".to_string()),
            notes: Some("CI token".to_string()),
        },
    )
    .expect("entry creates");

    assert_eq!(created.title, "GitLab");
    assert_eq!(created.username, "tanuki");
    assert_eq!(created.url, Some("https://gitlab.example.test".to_string()));
    assert_eq!(created.notes, Some("CI token".to_string()));
    assert_eq!(
        get_entry_password(opened.database_id, created.id.clone()).expect("password reads"),
        "glpat_secret"
    );
    assert_eq!(
        list_entries(opened.database_id)
            .expect("entries list")
            .len(),
        2
    );

    delete_entry(opened.database_id, created.id.clone()).expect("entry deletes");

    assert_eq!(
        list_entries(opened.database_id)
            .expect("entries list")
            .len(),
        1
    );
    assert!(get_entry(opened.database_id, created.id).is_err());
}

#[test]
fn closes_database_session() {
    let _guard = core_test_guard();
    let _ = close_all_databases();

    let fixture = fixtures::create_fixture_database("password");
    let opened = open_database(fixture.path.clone(), "password".to_string())
        .expect("fixture database should open");
    let database_id = opened.database_id;

    close_database(database_id).expect("database session should close");

    let result = list_entries(database_id);
    assert!(matches!(
        result,
        Err(Error::SessionNotFound(missing_id)) if missing_id == database_id
    ));
}

#[test]
fn closing_database_twice_returns_session_not_found() {
    let _guard = core_test_guard();
    let _ = close_all_databases();

    let fixture = fixtures::create_fixture_database("password");
    let opened = open_database(fixture.path.clone(), "password".to_string())
        .expect("fixture database should open");
    let database_id = opened.database_id;

    close_database(database_id).expect("database session should close once");
    let result = close_database(database_id);

    assert!(matches!(
        result,
        Err(Error::SessionNotFound(missing_id)) if missing_id == database_id
    ));
}

#[test]
fn closes_all_database_sessions() {
    let _guard = core_test_guard();
    let _ = close_all_databases();

    let first_fixture = fixtures::create_fixture_database("password");
    let second_fixture = fixtures::create_fixture_database("password");
    let first = open_database(first_fixture.path.clone(), "password".to_string())
        .expect("first fixture database should open");
    let second = open_database(second_fixture.path.clone(), "password".to_string())
        .expect("second fixture database should open");

    let closed_count = close_all_databases().expect("all database sessions should close");

    assert_eq!(closed_count, 2);
    assert!(matches!(
        list_entries(first.database_id),
        Err(Error::SessionNotFound(missing_id)) if missing_id == first.database_id
    ));
    assert!(matches!(
        list_entries(second.database_id),
        Err(Error::SessionNotFound(missing_id)) if missing_id == second.database_id
    ));
}
