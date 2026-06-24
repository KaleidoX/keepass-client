use keepass_core::{
    create_entry, delete_entry, get_entry, get_entry_password, list_entries, open_database,
    save_database, update_entry, EntryPatch,
};

mod fixtures;

#[test]
fn opens_fixture_database_and_lists_entries() {
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
