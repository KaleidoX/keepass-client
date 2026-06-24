use keepass_core::{get_entry, list_entries, open_database};

mod fixtures;

#[test]
fn opens_fixture_database_and_lists_entries() {
    let fixture = fixtures::create_fixture_database("secret");
    let opened = open_database(fixture.path.clone(), "secret".to_string()).expect("database opens");
    let entries = list_entries(opened.database_id).expect("entries list");

    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].title, "GitHub");
    assert_eq!(entries[0].username, "octo");
}

#[test]
fn returns_entry_detail_without_password() {
    let fixture = fixtures::create_fixture_database("secret");
    let opened = open_database(fixture.path.clone(), "secret".to_string()).expect("database opens");
    let entry = get_entry(opened.database_id, opened.entries[0].id.clone()).expect("entry exists");

    assert_eq!(entry.title, "GitHub");
    assert_eq!(entry.username, "octo");
}
