use keepass::{db::fields, Database, DatabaseKey};

fn create_fixture_bytes(password: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let mut database = Database::new();
    database.meta.database_name = Some("KeePass Client API Spike".to_string());

    let mut root = database.root_mut();
    let mut group = root.add_group();
    group.name = "Root".to_string();
    let mut entry = group.add_entry();
    entry.set_unprotected(fields::TITLE, "GitHub");
    entry.set_unprotected(fields::USERNAME, "octo");
    entry.set_protected(fields::PASSWORD, "ghp_secret");

    let mut bytes = Vec::new();
    database.save(&mut bytes, DatabaseKey::new().with_password(password))?;

    Ok(bytes)
}

fn list_titles_from_bytes(bytes: &[u8], password: &str) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let mut source = bytes;
    let database = Database::open(&mut source, DatabaseKey::new().with_password(password))?;
    Ok(database
        .iter_all_entries()
        .filter_map(|entry| entry.get(fields::TITLE).map(ToString::to_string))
        .collect())
}

fn roundtrip_fixture(bytes: &[u8], password: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut source = bytes;
    let database = Database::open(&mut source, DatabaseKey::new().with_password(password))?;
    let mut saved = Vec::new();
    database.save(&mut saved, DatabaseKey::new().with_password(password))?;
    let titles = list_titles_from_bytes(&saved, password)?;

    assert_eq!(titles, vec!["GitHub".to_string()]);
    Ok(())
}

#[test]
fn keepass_api_spike() {
    let bytes = create_fixture_bytes("secret").expect("fixture creates");
    let titles = list_titles_from_bytes(&bytes, "secret").expect("titles read");

    assert_eq!(titles, vec!["GitHub".to_string()]);
    roundtrip_fixture(&bytes, "secret").expect("roundtrip saves and reopens");
}
