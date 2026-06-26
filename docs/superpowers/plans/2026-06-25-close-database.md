# closeDatabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full `closeDatabase` lifecycle across Rust core, Electron shell, preload, renderer store, and a minimal manual UI trigger.

**Architecture:** Rust core remains the source of truth for database sessions. The shell exposes single-database close through IPC and performs synchronous best-effort `closeAllDatabases` cleanup from Electron `will-quit`. The renderer gets a typed API/store action and a small conditional close button for the current database.

**Tech Stack:** Rust 2021, `keepass` 0.13, Electron 42, TypeScript 5.8, React 19, Zustand, Vitest 4, pnpm 10.

---

## File Structure

### Rust core

- Modify: `packages/core/src/db.rs`
  - Add `close_database(database_id: Uuid) -> Result<()>`.
  - Add `close_all_databases() -> Result<usize>`.
- Modify: `packages/core/src/lib.rs`
  - Re-export both close functions.
- Modify: `packages/core/tests/core_test.rs`
  - Add TDD coverage for close behavior.
  - Serialize this integration test file because `SESSIONS` is process-global.

### Electron shell

- Modify: `packages/shell/src/main/core.ts`
  - Add `closeDatabase?` and synchronous `closeAllDatabases?` to `NativeCore`.
- Modify: `packages/shell/src/main/handlers/db.ts`
  - Add IPC channel `keepass:closeDatabase`.
- Create: `packages/shell/src/main/lifecycle.ts`
  - Isolate testable quit cleanup registration.
- Modify: `packages/shell/src/main/index.ts`
  - Reuse one `core` instance and register lifecycle cleanup.
- Modify: `packages/shell/tests/db-handlers.test.ts`
  - Add handler contract coverage.
- Create: `packages/shell/tests/main-lifecycle.test.ts`
  - Verify `will-quit` registration and synchronous cleanup.

### Preload bridge

- Modify: `packages/shell/src/preload/types.ts`
  - Add `closeDatabase(databaseId: string): Promise<void>`.
- Modify: `packages/shell/src/preload/index.ts`
  - Bridge `closeDatabase` to `ipcRenderer.invoke('keepass:closeDatabase', databaseId)`.
- Modify: `packages/shell/tests/preload-contract.test.ts`
  - Add contract coverage.

### Renderer

- Modify: `packages/renderer/src/lib/api.ts`
  - Add `closeDatabase` to `KeePassAPI`.
- Modify: `packages/renderer/src/lib/api.mock.ts`
  - Add no-op close mock and preserve overrides.
- Modify: `packages/renderer/src/lib/api.contract.test.tsx`
  - Assert mock API exposes `closeDatabase`.
- Modify: `packages/renderer/src/stores/databaseStore.ts`
  - Add `closeDatabase()` action.
- Create: `packages/renderer/src/stores/databaseStore.test.tsx`
  - Verify store reset, no-op, and error behavior.
- Modify: `packages/renderer/src/App.tsx`
  - Add conditional close button when a database is open.
- Modify: `packages/renderer/src/App.test.tsx`
  - Verify close button triggers store/API close.
- Modify: `packages/i18n/src/resources/en-US/translation.json`
  - Add `common.close_database`.
- Modify: `packages/i18n/src/resources/zh-CN/translation.json`
  - Add `common.close_database`.

---

## Task 1: Rust core close lifecycle

**Files:**
- Modify: `packages/core/tests/core_test.rs`
- Modify: `packages/core/src/db.rs`
- Modify: `packages/core/src/lib.rs`

- [ ] **Step 1: Write failing core tests**

Modify the import block in `packages/core/tests/core_test.rs` so it includes the close functions and `Error`:

```rust
use keepass_core::{
    close_all_databases, close_database, create_entry, delete_entry, get_entry,
    get_entry_password, list_entries, open_database, save_database, update_entry, EntryPatch,
    Error,
};
use std::sync::{Mutex, MutexGuard};

mod fixtures;
```

Add this test guard immediately after `mod fixtures;`:

```rust
static CORE_TEST_LOCK: Mutex<()> = Mutex::new(());

fn core_test_guard() -> MutexGuard<'static, ()> {
    CORE_TEST_LOCK
        .lock()
        .expect("core test lock should not be poisoned")
}
```

At the start of each existing test in `core_test.rs`, add these two lines before creating fixtures or opening databases:

```rust
let _guard = core_test_guard();
let _ = close_all_databases();
```

Append these tests to `core_test.rs`:

```rust
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
```

- [ ] **Step 2: Run core tests to verify failure**

Run from the repository root:

```bash
cargo test --manifest-path packages/core/Cargo.toml close_database -- --test-threads=1
```

Expected result: FAIL because `close_database` and `close_all_databases` are not exported yet.

- [ ] **Step 3: Implement close functions**

Add these functions in `packages/core/src/db.rs` near the other public database lifecycle functions:

```rust
pub fn close_database(database_id: Uuid) -> Result<()> {
    let mut sessions = SESSIONS.lock().map_err(|_| Error::SessionStorePoisoned)?;
    sessions
        .remove(&database_id)
        .ok_or(Error::SessionNotFound(database_id))?;
    Ok(())
}

pub fn close_all_databases() -> Result<usize> {
    let mut sessions = SESSIONS.lock().map_err(|_| Error::SessionStorePoisoned)?;
    let closed_count = sessions.len();
    sessions.clear();
    Ok(closed_count)
}
```

Update `packages/core/src/lib.rs` so the `pub use db::{ ... }` block includes both functions:

```rust
pub use db::{
    close_all_databases, close_database, create_entry, delete_entry, get_entry,
    get_entry_password, list_entries, open_database, save_database, update_entry,
    EntryDetailData, EntryPatch, EntrySummary, OpenedDatabase,
};
```

- [ ] **Step 4: Run core tests to verify pass**

Run from the repository root:

```bash
cargo test --manifest-path packages/core/Cargo.toml -- --test-threads=1
```

Expected result: PASS for the `keepass-core` test suite.

- [ ] **Step 5: Commit checkpoint if commits are approved**

Before running any commit command, ask the user for explicit confirmation. If approved, run:

```bash
git add packages/core/src/db.rs packages/core/src/lib.rs packages/core/tests/core_test.rs
git commit -m "feat(core): add database session close lifecycle"
```

---

## Task 2: Shell IPC and quit cleanup

**Files:**
- Modify: `packages/shell/tests/db-handlers.test.ts`
- Create: `packages/shell/tests/main-lifecycle.test.ts`
- Modify: `packages/shell/src/main/core.ts`
- Modify: `packages/shell/src/main/handlers/db.ts`
- Create: `packages/shell/src/main/lifecycle.ts`
- Modify: `packages/shell/src/main/index.ts`

- [ ] **Step 1: Write failing shell tests**

In `packages/shell/tests/db-handlers.test.ts`, update the mock `NativeCore` used for delegated handler tests by adding:

```typescript
closeDatabase: async () => {},
```

In the `Object.keys(handlers)` assertion, append the close channel after `keepass:copyPassword`:

```typescript
expect(Object.keys(handlers)).toEqual([
  'keepass:getCoreVersion',
  'keepass:chooseDatabaseFile',
  'keepass:openDatabase',
  'keepass:getEntry',
  'keepass:updateEntry',
  'keepass:createEntry',
  'keepass:deleteEntry',
  'keepass:saveDatabase',
  'keepass:copyPassword',
  'keepass:closeDatabase'
]);
```

Add this assertion near the other handler invocation assertions:

```typescript
await expect(handlers['keepass:closeDatabase']({}, 'db-1')).resolves.toBeUndefined();
```

In the `registerDatabaseHandlers` test, update the mock core with `closeDatabase: async () => {}` and change the registration assertions to:

```typescript
expect(handle).toHaveBeenCalledTimes(10);
expect(handle.mock.calls.map(([channel]) => channel)).toEqual([
  'keepass:getCoreVersion',
  'keepass:chooseDatabaseFile',
  'keepass:openDatabase',
  'keepass:getEntry',
  'keepass:updateEntry',
  'keepass:createEntry',
  'keepass:deleteEntry',
  'keepass:saveDatabase',
  'keepass:copyPassword',
  'keepass:closeDatabase'
]);
```

Create `packages/shell/tests/main-lifecycle.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest';
import type { NativeCore } from '../src/main/core';
import { closeAllDatabasesForQuit, registerAppLifecycleHandlers } from '../src/main/lifecycle';

describe('main lifecycle handlers', () => {
  it('registers a will-quit cleanup handler', () => {
    const app = { on: vi.fn() };
    const core: NativeCore = { coreVersion: () => 'test-core' };

    registerAppLifecycleHandlers(app, core);

    expect(app.on).toHaveBeenCalledWith('will-quit', expect.any(Function));
  });

  it('closes all database sessions during quit when the native core supports it', () => {
    const closeAllDatabases = vi.fn(() => 2);
    const core: NativeCore = {
      coreVersion: () => 'test-core',
      closeAllDatabases
    };

    closeAllDatabasesForQuit(core);

    expect(closeAllDatabases).toHaveBeenCalledTimes(1);
  });

  it('does nothing during quit when the native core has no closeAllDatabases operation', () => {
    const core: NativeCore = { coreVersion: () => 'test-core' };

    expect(() => closeAllDatabasesForQuit(core)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run shell tests to verify failure**

Run from `packages/shell`:

```bash
pnpm test tests/db-handlers.test.ts tests/main-lifecycle.test.ts
```

Expected result: FAIL because `main/lifecycle.ts` and `keepass:closeDatabase` do not exist yet.

- [ ] **Step 3: Update `NativeCore`**

In `packages/shell/src/main/core.ts`, add these optional operations to `NativeCore`:

```typescript
closeDatabase?(databaseId: string): void | Promise<void>;
closeAllDatabases?(): number;
```

`closeAllDatabases` is intentionally synchronous because Electron `will-quit` handlers are not awaited.

- [ ] **Step 4: Add the IPC close handler**

In `packages/shell/src/main/handlers/db.ts`, add the channel to `DatabaseHandlers`:

```typescript
'keepass:closeDatabase': (_event: unknown, databaseId: string) => Promise<void>;
```

Add this implementation inside `createDatabaseHandlers`:

```typescript
'keepass:closeDatabase': async (_event, databaseId) => {
  const closeDatabase = requireCoreOperation(core, 'closeDatabase');
  await closeDatabase.call(core, databaseId);
},
```

- [ ] **Step 5: Add synchronous lifecycle cleanup helper**

Create `packages/shell/src/main/lifecycle.ts`:

```typescript
import type { NativeCore } from './core';

export type AppLifecycleTarget = {
  on(event: 'will-quit', listener: () => void): void;
};

export function closeAllDatabasesForQuit(core: NativeCore): void {
  const closeAllDatabases = core.closeAllDatabases;
  if (!closeAllDatabases) {
    return;
  }

  try {
    closeAllDatabases.call(core);
  } catch (error) {
    console.warn('Failed to close KeePass database sessions during quit', error);
  }
}

export function registerAppLifecycleHandlers(app: AppLifecycleTarget, core: NativeCore): void {
  app.on('will-quit', () => closeAllDatabasesForQuit(core));
}
```

- [ ] **Step 6: Register lifecycle cleanup from main process**

Update `packages/shell/src/main/index.ts`:

```typescript
import { BrowserWindow, app, clipboard, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { loadCore } from './core';
import { registerDatabaseHandlers } from './handlers/db';
import { registerAppLifecycleHandlers } from './lifecycle';

const core = loadCore();

registerDatabaseHandlers(ipcMain, { core, dialog, clipboard });
registerAppLifecycleHandlers(app, core);

async function createWindow() {
  const window = new BrowserWindow({
    width: 1100,
    height: 760,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, '../preload/index.js')
    }
  });
  await window.loadURL(process.env.ELECTRON_RENDERER_URL ?? 'http://127.0.0.1:5173');
}

app.whenReady().then(createWindow);
```

- [ ] **Step 7: Run shell tests to verify pass**

Run from `packages/shell`:

```bash
pnpm test tests/db-handlers.test.ts tests/main-lifecycle.test.ts
```

Expected result: PASS.

- [ ] **Step 8: Commit checkpoint if commits are approved**

Before running any commit command, ask the user for explicit confirmation. If approved, run:

```bash
git add packages/shell/src/main/core.ts packages/shell/src/main/handlers/db.ts packages/shell/src/main/index.ts packages/shell/src/main/lifecycle.ts packages/shell/tests/db-handlers.test.ts packages/shell/tests/main-lifecycle.test.ts
git commit -m "feat(shell): close database sessions on request and quit"
```

---

## Task 3: Preload bridge contract

**Files:**
- Modify: `packages/shell/tests/preload-contract.test.ts`
- Modify: `packages/shell/src/preload/types.ts`
- Modify: `packages/shell/src/preload/index.ts`

- [ ] **Step 1: Write failing preload contract updates**

In `packages/shell/tests/preload-contract.test.ts`, append `closeDatabase` to `methodNames`:

```typescript
const methodNames = [
  'getCoreVersion',
  'chooseDatabaseFile',
  'openDatabase',
  'getEntry',
  'updateEntry',
  'createEntry',
  'deleteEntry',
  'saveDatabase',
  'copyPassword',
  'closeDatabase'
] as const satisfies readonly (keyof KeePassAPI)[];
```

In the `invoke.mockImplementation` switch, return `Promise.resolve()` for the close channel:

```typescript
case 'keepass:deleteEntry':
case 'keepass:saveDatabase':
case 'keepass:copyPassword':
case 'keepass:closeDatabase':
  return Promise.resolve();
```

When the test calls all API methods, add:

```typescript
await api.closeDatabase('db-1');
```

Append the expected IPC invocation:

```typescript
['keepass:closeDatabase', 'db-1']
```

- [ ] **Step 2: Run preload test to verify failure**

Run from `packages/shell`:

```bash
pnpm test tests/preload-contract.test.ts
```

Expected result: FAIL because `closeDatabase` is missing from the preload API.

- [ ] **Step 3: Add preload type and bridge method**

In `packages/shell/src/preload/types.ts`, add:

```typescript
closeDatabase(databaseId: string): Promise<void>;
```

In `packages/shell/src/preload/index.ts`, add this property to the object returned by `createKeePassAPI()`:

```typescript
closeDatabase: (databaseId) => ipcRenderer.invoke('keepass:closeDatabase', databaseId),
```

- [ ] **Step 4: Run preload test to verify pass**

Run from `packages/shell`:

```bash
pnpm test tests/preload-contract.test.ts
```

Expected result: PASS.

- [ ] **Step 5: Commit checkpoint if commits are approved**

Before running any commit command, ask the user for explicit confirmation. If approved, run:

```bash
git add packages/shell/src/preload/types.ts packages/shell/src/preload/index.ts packages/shell/tests/preload-contract.test.ts
git commit -m "feat(shell): expose closeDatabase through preload"
```

---

## Task 4: Renderer API, store, and manual close UI

**Files:**
- Modify: `packages/renderer/src/lib/api.contract.test.tsx`
- Create: `packages/renderer/src/stores/databaseStore.test.tsx`
- Modify: `packages/renderer/src/App.test.tsx`
- Modify: `packages/renderer/src/lib/api.ts`
- Modify: `packages/renderer/src/lib/api.mock.ts`
- Modify: `packages/renderer/src/stores/databaseStore.ts`
- Modify: `packages/renderer/src/App.tsx`
- Modify: `packages/i18n/src/resources/en-US/translation.json`
- Modify: `packages/i18n/src/resources/zh-CN/translation.json`

- [ ] **Step 1: Write failing renderer contract and store tests**

In `packages/renderer/src/lib/api.contract.test.tsx`, add:

```typescript
expect(api.closeDatabase).toBeTypeOf('function');
```

Create `packages/renderer/src/stores/databaseStore.test.tsx`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EntrySummary } from '../lib/api';
import { installKeePassAPIMock } from '../lib/api.mock';
import { useDatabaseStore } from './databaseStore';

const mockEntry: EntrySummary = {
  id: 'entry-1',
  title: 'Email',
  username: 'alice',
  url: null,
  groupPath: ['Root']
};

function resetDatabaseStore() {
  useDatabaseStore.setState({
    databaseId: null,
    entries: [],
    isLoading: false,
    error: null
  });
}

describe('databaseStore.closeDatabase', () => {
  beforeEach(() => {
    resetDatabaseStore();
    delete window.keepassAPI;
  });

  it('closes the active database and resets current database state', async () => {
    const closeDatabase = vi.fn().mockResolvedValue(undefined);
    installKeePassAPIMock({
      openDatabase: vi.fn().mockResolvedValue({ databaseId: 'db-1', entries: [mockEntry] }),
      closeDatabase
    });

    await useDatabaseStore.getState().openDatabase('/tmp/test.kdbx', 'password');
    await useDatabaseStore.getState().closeDatabase();

    expect(closeDatabase).toHaveBeenCalledWith('db-1');
    expect(useDatabaseStore.getState().databaseId).toBeNull();
    expect(useDatabaseStore.getState().entries).toEqual([]);
    expect(useDatabaseStore.getState().error).toBeNull();
  });

  it('does nothing when no database is open', async () => {
    const closeDatabase = vi.fn().mockResolvedValue(undefined);
    installKeePassAPIMock({ closeDatabase });

    await useDatabaseStore.getState().closeDatabase();

    expect(closeDatabase).not.toHaveBeenCalled();
    expect(useDatabaseStore.getState().databaseId).toBeNull();
    expect(useDatabaseStore.getState().entries).toEqual([]);
  });

  it('keeps the current database state and records an error when close fails', async () => {
    const closeDatabase = vi.fn().mockRejectedValue(new Error('close failed'));
    installKeePassAPIMock({
      openDatabase: vi.fn().mockResolvedValue({ databaseId: 'db-1', entries: [mockEntry] }),
      closeDatabase
    });

    await useDatabaseStore.getState().openDatabase('/tmp/test.kdbx', 'password');
    await expect(useDatabaseStore.getState().closeDatabase()).rejects.toThrow('close failed');

    expect(useDatabaseStore.getState().databaseId).toBe('db-1');
    expect(useDatabaseStore.getState().entries).toEqual([mockEntry]);
    expect(useDatabaseStore.getState().error).toBe('close failed');
  });
});
```

- [ ] **Step 2: Write failing App close button test**

Update `packages/renderer/src/App.test.tsx` imports:

```typescript
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { installKeePassAPIMock } from './lib/api.mock';
import { I18nProvider, createRendererI18n } from './lib/i18n';
import { useDatabaseStore } from './stores/databaseStore';
```

Add this reset helper and `beforeEach` inside the test file:

```typescript
function resetDatabaseStore() {
  useDatabaseStore.setState({
    databaseId: null,
    entries: [],
    isLoading: false,
    error: null
  });
}

beforeEach(() => {
  resetDatabaseStore();
  delete window.keepassAPI;
});
```

Append this test:

```typescript
it('closes the current database from the app shell', async () => {
  const closeDatabase = vi.fn().mockResolvedValue(undefined);
  installKeePassAPIMock({ closeDatabase });
  useDatabaseStore.setState({ databaseId: 'db-1', entries: [], isLoading: false, error: null });

  render(
    <I18nProvider i18n={createRendererI18n('en-US')}>
      <App />
    </I18nProvider>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Close database' }));

  await waitFor(() => expect(closeDatabase).toHaveBeenCalledWith('db-1'));
});
```

- [ ] **Step 3: Run renderer tests to verify failure**

Run from `packages/renderer`:

```bash
pnpm test src/lib/api.contract.test.tsx src/stores/databaseStore.test.tsx src/App.test.tsx
```

Expected result: FAIL because `closeDatabase`, the store action, and the close button are missing.

- [ ] **Step 4: Add renderer API and mock support**

In `packages/renderer/src/lib/api.ts`, add this method to `KeePassAPI`:

```typescript
closeDatabase(databaseId: string): Promise<void>;
```

In `packages/renderer/src/lib/api.mock.ts`, add this mock function near the other async no-op methods:

```typescript
const closeDatabase = async () => {};
```

Include it in the object returned from `createKeePassAPIMock` before `...overrides`:

```typescript
closeDatabase,
```

- [ ] **Step 5: Add store close action**

In `packages/renderer/src/stores/databaseStore.ts`, add this method to `DatabaseStoreState`:

```typescript
closeDatabase: () => Promise<void>;
```

Add this action to the object passed to `createStore`:

```typescript
closeDatabase: async () => {
  const { databaseId } = get();
  if (!databaseId) {
    return;
  }

  try {
    await getKeePassAPI().closeDatabase(databaseId);
    set({ databaseId: null, entries: [], error: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    set({ error: message });
    throw error;
  }
},
```

- [ ] **Step 6: Add i18n close label**

In `packages/i18n/src/resources/en-US/translation.json`, add `close_database` under `common`:

```json
"common": {
  "save": "Save",
  "cancel": "Cancel",
  "loading": "Loading…",
  "close_database": "Close database"
}
```

In `packages/i18n/src/resources/zh-CN/translation.json`, add the same key under `common`:

```json
"common": {
  "save": "保存",
  "cancel": "取消",
  "loading": "加载中…",
  "close_database": "关闭数据库"
}
```

- [ ] **Step 7: Add minimal close button to App**

Update `packages/renderer/src/App.tsx`:

```typescript
import { WelcomePanel } from '@keepass/ui';
import { useT } from './lib/i18n';
import { useDatabaseStore } from './stores/databaseStore';

export function App() {
  const { t } = useT();
  const databaseId = useDatabaseStore((state) => state.databaseId);
  const closeDatabase = useDatabaseStore((state) => state.closeDatabase);

  return (
    <main className="min-h-screen">
      {databaseId ? (
        <div className="flex justify-end p-4">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={() => {
              void closeDatabase().catch(() => undefined);
            }}
          >
            {t('common.close_database')}
          </button>
        </div>
      ) : null}
      <WelcomePanel
        title={t('welcome.title')}
        description={t('welcome.description')}
      />
    </main>
  );
}
```

- [ ] **Step 8: Run renderer tests to verify pass**

Run from `packages/renderer`:

```bash
pnpm test src/lib/api.contract.test.tsx src/stores/databaseStore.test.tsx src/App.test.tsx
```

Expected result: PASS.

- [ ] **Step 9: Commit checkpoint if commits are approved**

Before running any commit command, ask the user for explicit confirmation. If approved, run:

```bash
git add packages/renderer/src/lib/api.ts packages/renderer/src/lib/api.mock.ts packages/renderer/src/lib/api.contract.test.tsx packages/renderer/src/stores/databaseStore.ts packages/renderer/src/stores/databaseStore.test.tsx packages/renderer/src/App.tsx packages/renderer/src/App.test.tsx packages/i18n/src/resources/en-US/translation.json packages/i18n/src/resources/zh-CN/translation.json
git commit -m "feat(renderer): add manual database close action"
```

---

## Task 5: Full verification

**Files:**
- Verify repository state only.

- [ ] **Step 1: Run Rust core tests**

Run from the repository root:

```bash
cargo test --manifest-path packages/core/Cargo.toml -- --test-threads=1
```

Expected result: PASS.

- [ ] **Step 2: Run shell tests**

Run from `packages/shell`:

```bash
pnpm test
```

Expected result: PASS.

- [ ] **Step 3: Run renderer tests**

Run from `packages/renderer`:

```bash
pnpm test
```

Expected result: PASS.

- [ ] **Step 4: Run workspace tests**

Run from the repository root:

```bash
pnpm -r test
```

Expected result: PASS for all pnpm workspace package tests.

- [ ] **Step 5: Inspect git diff**

Run from the repository root:

```bash
git diff -- docs/superpowers/specs/2026-06-25-close-database-design.md docs/superpowers/plans/2026-06-25-close-database.md packages/core packages/shell packages/renderer packages/i18n
```

Expected result: only close database lifecycle changes appear.

- [ ] **Step 6: Final commit if commits are approved**

Before running any commit command, ask the user for explicit confirmation. If approved and earlier task commits were not created, run:

```bash
git add docs/superpowers/specs/2026-06-25-close-database-design.md docs/superpowers/plans/2026-06-25-close-database.md packages/core packages/shell packages/renderer packages/i18n
git commit -m "feat: add close database lifecycle"
```

---

## Self-Review

- Spec coverage: covered manual close, direct close without save, exit-time all-session cleanup, renderer state reset, contracts, and tests.
- Marker scan: no unresolved marker steps remain.
- Type consistency: Rust uses `close_database` / `close_all_databases`; TypeScript uses `closeDatabase` / `closeAllDatabases`; IPC uses `keepass:closeDatabase`.
- Electron lifecycle: `closeAllDatabases` is planned as synchronous because Electron app quit events do not await async handlers.
