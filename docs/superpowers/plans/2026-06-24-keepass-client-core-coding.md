# KeePass Client Core Coding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Rust core that opens KeePass databases, reads entries, updates them in memory, and saves MVP-managed files safely.

**Architecture:** Keep all KeePass logic in `packages/core`. First verify the installed `keepass` 0.13 API with a spike test, then implement the session model and mutating operations behind napi exports. The save path must refuse to overwrite non-MVP-managed files.

**Tech Stack:** Rust 2021, keepass 0.13, napi-rs, uuid, once_cell, tempfile/standard library for test fixtures.

---

## Files

### Create

- `packages/core/Cargo.toml` — Rust crate manifest.
- `packages/core/src/lib.rs` — napi export surface.
- `packages/core/src/db.rs` — session model and KeePass operations.
- `packages/core/src/error.rs` — napi error helpers.
- `packages/core/tests/keepass_api_spike_test.rs` — API verification test.
- `packages/core/tests/fixtures.rs` — fixture database helper.
- `packages/core/tests/core_test.rs` — core behavior tests.

### Modify

- `packages/core/Cargo.toml:1-99` — add keepass and napi dependencies.

---

## Task 1: Keepass API spike

**Files:**
- Create: `packages/core/tests/keepass_api_spike_test.rs`
- Modify: `packages/core/Cargo.toml`

- [ ] **Step 1: Write the spike test using real keepass APIs**

```rust
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
fn verifies_keepass_open_list_and_save_api() {
    let bytes = create_fixture_bytes("secret").expect("fixture creates");
    let titles = list_titles_from_bytes(&bytes, "secret").expect("titles read");

    assert_eq!(titles, vec!["GitHub".to_string()]);
    roundtrip_fixture(&bytes, "secret").expect("roundtrip saves and reopens");
}
```

- [ ] **Step 2: Add the core dependencies**

```toml
[dependencies]
keepass = { version = "0.13", features = ["save_kdbx4"] }
napi = { version = "2", features = ["napi8"] }
napi-derive = "2"
once_cell = "1.20"
thiserror = "2.0"
uuid = { version = "1.11", features = ["v4"] }
```

- [ ] **Step 3: Verify the spike passes**

Run:

```bash
cargo test --manifest-path packages/core/Cargo.toml keepass_api_spike
```

Expected: PASS. If it fails, update the spike test to match the installed `keepass` API, then rerun until it passes.

- [ ] **Step 4: Commit**

```bash
git add packages/core/Cargo.toml packages/core/tests/keepass_api_spike_test.rs
git commit -m "test: verify keepass api usage"
```

---

## Task 2: Open/list/detail session model

**Files:**
- Create: `packages/core/src/db.rs`
- Create: `packages/core/src/error.rs`
- Modify: `packages/core/src/lib.rs`
- Create: `packages/core/tests/fixtures.rs`
- Modify: `packages/core/tests/core_test.rs`

- [ ] **Step 1: Write the open/list/detail tests**

```rust
use keepass_core::{get_entry, list_entries, open_database};

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
```

- [ ] **Step 2: Implement the session model and napi exports**

Use the verified keepass API to implement `open_database`, `list_entries`, and `get_entry` in `packages/core/src/db.rs`. The session model must retain the opened file path, password, and an in-memory list of session entries.

```rust
#[napi(object)]
#[derive(Clone)]
pub struct EntrySummary {
    pub id: String,
    pub title: String,
    pub username: String,
    pub url: Option<String>,
    pub group_path: Vec<String>,
}

#[napi(object)]
#[derive(Clone)]
pub struct EntryDetailData {
    pub id: String,
    pub title: String,
    pub username: String,
    pub url: Option<String>,
    pub notes: Option<String>,
    pub group_path: Vec<String>,
}
```

- [ ] **Step 3: Create fixture databases for tests**

`packages/core/tests/fixtures.rs` must create a temporary KDBX4 file with one `GitHub` entry and password `ghp_secret`.

- [ ] **Step 4: Verify the core tests pass**

Run:

```bash
cargo test --manifest-path packages/core/Cargo.toml opens_fixture_database_and_lists_entries returns_entry_detail_without_password
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src packages/core/tests
git commit -m "feat: open and list database entries"
```

---

## Task 3: Update/save and mutating operations

**Files:**
- Modify: `packages/core/src/db.rs`
- Modify: `packages/core/tests/core_test.rs`
- Modify: `packages/core/src/lib.rs`

- [ ] **Step 1: Write tests for update/save and mutating operations**

```rust
use keepass_core::{create_entry, delete_entry, get_entry_password, save_database, update_entry, EntryPatch};

#[test]
fn updates_entry_and_saves_database() {
    let fixture = fixtures::create_fixture_database("secret");
    let opened = open_database(fixture.path.clone(), "secret".to_string()).expect("database opens");
    let entry_id = opened.entries[0].id.clone();

    let updated = update_entry(opened.database_id.clone(), entry_id.clone(), EntryPatch {
        title: "GitHub Work".to_string(),
        username: "octo-work".to_string(),
        password: None,
        url: Some("https://github.com".to_string()),
        notes: Some("updated".to_string()),
    }).expect("entry updates");

    save_database(opened.database_id).expect("database saves");
    assert_eq!(updated.title, "GitHub Work");
}

#[test]
fn creates_deletes_and_reads_password() {
    let fixture = fixtures::create_fixture_database("secret");
    let opened = open_database(fixture.path.clone(), "secret".to_string()).expect("database opens");

    let created = create_entry(opened.database_id.clone(), EntryPatch {
        title: "New Login".to_string(),
        username: "new-user".to_string(),
        password: Some("new-password".to_string()),
        url: None,
        notes: None,
    }).expect("entry creates");

    assert_eq!(get_entry_password(opened.database_id.clone(), created.id.clone()).unwrap(), "new-password");
    delete_entry(opened.database_id.clone(), created.id).expect("entry deletes");
}
```

- [ ] **Step 2: Implement `update_entry`, `save_database`, `create_entry`, `delete_entry`, and `get_entry_password`**

Use the in-memory session model from Task 2. `save_database` must refuse to overwrite a non-MVP-managed file and return a clear napi error instead of silently clobbering user data.

```rust
if !session.is_mvp_managed {
    return Err(crate::error::napi_error(
        "Refusing to overwrite a non-MVP database. Use a generated MVP copy before saving."
    ));
}
```

- [ ] **Step 3: Verify mutating core tests pass**

Run:

```bash
cargo test --manifest-path packages/core/Cargo.toml updates_entry_and_saves_database creates_deletes_and_reads_password
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src packages/core/tests
git commit -m "feat: mutate and save database entries"
```
