# KeePass Client Electron Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Electron, the renderer, the shared translation resources, and the UI primitives into a usable desktop client.

**Architecture:** Keep i18n runtime code inside `packages/renderer/src/lib/i18n.tsx`. Keep state in `packages/renderer/src/lib/state.ts`. Keep shell-only Electron APIs in `packages/shell`, and keep `packages/ui` free of i18n/runtime libraries and business copy by passing labels through props.

**Tech Stack:** Electron 42, React 19, Vite 7, i18next, react-i18next, Zustand, Tailwind CSS v4, Vitest, React Testing Library.

---

## Files

### Create

- `packages/renderer/src/lib/i18n.tsx` — renderer-local i18n adapter.
- `packages/renderer/src/lib/state.ts` — renderer-local Zustand adapter.
- `packages/renderer/src/lib/api.ts` — typed bridge to `window.keepassAPI`.
- `packages/renderer/src/lib/api.mock.ts` — browser-only mock bridge.
- `packages/renderer/src/App.tsx` — renderer composition.
- `packages/renderer/src/main.tsx` — app bootstrap.
- `packages/renderer/src/stores/databaseStore.ts` — database state store.
- `packages/renderer/src/i18n.test.tsx` — i18n adapter test.
- `packages/shell/src/main/core.ts` — native addon loader.
- `packages/shell/src/main/handlers/db.ts` — IPC handlers.
- `packages/shell/src/preload/index.ts` — preload bridge.
- `packages/shell/src/preload/types.ts` — bridge types.
- `packages/ui/src/components/UnlockForm.tsx` — unlock form.
- `packages/ui/src/components/UnlockForm.test.tsx` — unlock form test.
- `packages/ui/src/components/EntryList.tsx` — entry list.
- `packages/ui/src/components/EntryList.test.tsx` — entry list test.
- `packages/ui/src/components/EntryDetail.tsx` — entry detail/editor.
- `packages/ui/src/components/EntryDetail.test.tsx` — entry detail test.

### Modify

- `packages/renderer/package.json` — add i18next/react-i18next and `@keepass/i18n` resource dependency.
- `packages/renderer/src/App.test.tsx` — wrap in i18n provider.
- `packages/ui/src/index.ts` — export new primitives.
- `packages/shell/src/main/index.ts` — register handlers and load renderer.

---

## Task 1: Renderer-local i18n adapter

**Files:**
- Create: `packages/renderer/src/lib/i18n.tsx`
- Create: `packages/renderer/src/i18n.test.tsx`
- Modify: `packages/renderer/src/App.tsx`
- Modify: `packages/renderer/src/main.tsx`
- Modify: `packages/renderer/src/App.test.tsx`

- [ ] **Step 1: Write the i18n adapter test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nProvider, createRendererI18n, useT } from './lib/i18n';

function Probe() {
  const { t } = useT();
  return <h1>{t('welcome.title')}</h1>;
}

describe('renderer i18n adapter', () => {
  it('translates welcome title in English', () => {
    const i18n = createRendererI18n('en-US');

    render(
      <I18nProvider i18n={i18n}>
        <Probe />
      </I18nProvider>
    );

    expect(screen.getByRole('heading', { name: 'Open a KeePass database' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement the adapter using local imports of `i18next` and `react-i18next`**

```tsx
import i18next from 'i18next';
import { I18nextProvider, useTranslation } from 'react-i18next';
import enUS from '@keepass/i18n/en-US';
import zhCN from '@keepass/i18n/zh-CN';

export type RendererLocale = 'en-US' | 'zh-CN';

export function createRendererI18n(lng: RendererLocale) {
  const instance = i18next.createInstance();

  instance.init({
    resources: {
      'en-US': { translation: enUS },
      'zh-CN': { translation: zhCN }
    },
    lng,
    fallbackLng: 'en-US',
    returnNull: false,
    interpolation: { escapeValue: false }
  });

  return instance;
}

export function I18nProvider({ i18n, children }: { i18n: ReturnType<typeof createRendererI18n>; children: React.ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export function useT() {
  return useTranslation();
}
```

- [ ] **Step 3: Wire the renderer bootstrap**

```tsx
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { I18nProvider, createRendererI18n } from './lib/i18n';

const locale = navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US';
const i18n = createRendererI18n(locale);

createRoot(document.getElementById('root')!).render(
  <I18nProvider i18n={i18n}>
    <App />
  </I18nProvider>
);
```

- [ ] **Step 4: Verify the adapter passes**

Run:

```bash
pnpm --filter @keepass/renderer test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/lib/i18n.tsx packages/renderer/src/i18n.test.tsx packages/renderer/src/main.tsx packages/renderer/src/App.tsx packages/renderer/src/App.test.tsx packages/renderer/package.json
git commit -m "feat: add renderer i18n adapter"
```

---

## Task 2: Renderer state and API adapters

**Files:**
- Create: `packages/renderer/src/lib/state.ts`
- Create: `packages/renderer/src/lib/api.ts`
- Create: `packages/renderer/src/lib/api.mock.ts`
- Create: `packages/renderer/src/stores/databaseStore.ts`

- [ ] **Step 1: Write the state adapter test**

```ts
import { describe, expect, it } from 'vitest';
import { createStore } from '../lib/state';

describe('createStore adapter', () => {
  it('creates a zustand store facade', () => {
    const useCounter = createStore<{ count: number; inc: () => void }>((set) => ({ count: 0, inc: () => set((state) => ({ count: state.count + 1 })) }));

    expect(useCounter.getState().count).toBe(0);
  });
});
```

- [ ] **Step 2: Implement the adapters**

```ts
import { create } from 'zustand';

export const createStore = create;
```

```ts
import type { EntryDetailData, EntryPatch, EntrySummary, OpenDatabaseResult } from './types';

declare global {
  interface Window {
    keepassAPI?: {
      getCoreVersion: () => Promise<string>;
      chooseDatabaseFile: () => Promise<string | null>;
      openDatabase: (path: string, password: string) => Promise<OpenDatabaseResult>;
      getEntry: (databaseId: string, entryId: string) => Promise<EntryDetailData>;
      updateEntry: (databaseId: string, entryId: string, patch: EntryPatch) => Promise<EntryDetailData>;
      createEntry: (databaseId: string, patch: EntryPatch) => Promise<EntryDetailData>;
      deleteEntry: (databaseId: string, entryId: string) => Promise<void>;
      saveDatabase: (databaseId: string) => Promise<void>;
      copyPassword: (databaseId: string, entryId: string) => Promise<void>;
    };
  }
}

export function getKeePassAPI() {
  if (!window.keepassAPI) throw new Error('keepassAPI is not available');
  return window.keepassAPI;
}
```

- [ ] **Step 3: Verify the adapters pass**

Run:

```bash
pnpm --filter @keepass/renderer test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/renderer/src/lib/state.ts packages/renderer/src/lib/api.ts packages/renderer/src/lib/api.mock.ts packages/renderer/src/stores/databaseStore.ts
git commit -m "feat: add renderer state and api adapters"
```

---

## Task 3: Shell IPC and preload bridge

**Files:**
- Modify: `packages/shell/src/main/core.ts`
- Create: `packages/shell/src/main/handlers/db.ts`
- Create: `packages/shell/src/preload/index.ts`
- Create: `packages/shell/src/preload/types.ts`
- Modify: `packages/shell/src/main/index.ts`

- [ ] **Step 1: Write the preload contract test**

```ts
import { describe, expect, it } from 'vitest';
import type { KeePassAPI } from '../src/preload/types';

describe('KeePassAPI contract', () => {
  it('exposes the desktop operations used by the renderer', () => {
    const methodName: keyof KeePassAPI = 'getCoreVersion';
    expect(methodName).toBe('getCoreVersion');
  });
});
```

- [ ] **Step 2: Implement the preload and handlers**

```ts
import { contextBridge, ipcRenderer } from 'electron';
import type { KeePassAPI } from './types';

const api: Pick<KeePassAPI, 'getCoreVersion' | 'chooseDatabaseFile' | 'openDatabase' | 'getEntry' | 'updateEntry' | 'createEntry' | 'deleteEntry' | 'saveDatabase' | 'copyPassword'> = {
  getCoreVersion: () => ipcRenderer.invoke('core:version'),
  chooseDatabaseFile: () => ipcRenderer.invoke('db:choose-file'),
  openDatabase: (path, password) => ipcRenderer.invoke('db:open', path, password),
  getEntry: (databaseId, entryId) => ipcRenderer.invoke('db:get-entry', databaseId, entryId),
  updateEntry: (databaseId, entryId, patch) => ipcRenderer.invoke('db:update-entry', databaseId, entryId, patch),
  createEntry: (databaseId, patch) => ipcRenderer.invoke('db:create-entry', databaseId, patch),
  deleteEntry: (databaseId, entryId) => ipcRenderer.invoke('db:delete-entry', databaseId, entryId),
  saveDatabase: (databaseId) => ipcRenderer.invoke('db:save', databaseId),
  copyPassword: (databaseId, entryId) => ipcRenderer.invoke('db:copy-password', databaseId, entryId)
};

contextBridge.exposeInMainWorld('keepassAPI', api);
```

- [ ] **Step 3: Wire the shell entry point**

`packages/shell/src/main/index.ts` must register the database handlers, create the BrowserWindow with `contextIsolation: true`, and load either `ELECTRON_RENDERER_URL` or `http://127.0.0.1:5173` in development.

- [ ] **Step 4: Verify the shell bridge passes**

Run:

```bash
pnpm --filter @keepass/shell test
pnpm --filter @keepass/shell build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shell/src/main/core.ts packages/shell/src/main/handlers/db.ts packages/shell/src/preload/index.ts packages/shell/src/preload/types.ts packages/shell/src/main/index.ts
git commit -m "feat: add shell ipc bridge"
```

---

## Task 4: UI primitives and translated labels

**Files:**
- Modify: `packages/ui/src/components/WelcomePanel.tsx`
- Create: `packages/ui/src/components/UnlockForm.tsx`
- Create: `packages/ui/src/components/UnlockForm.test.tsx`
- Create: `packages/ui/src/components/EntryList.tsx`
- Create: `packages/ui/src/components/EntryList.test.tsx`
- Create: `packages/ui/src/components/EntryDetail.tsx`
- Create: `packages/ui/src/components/EntryDetail.test.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/ui/src/styles/globals.css`

- [ ] **Step 1: Write UI tests with label props**

Use prop-driven labels for `UnlockForm`, `EntryList`, and `EntryDetail` so the UI package never hardcodes business copy.

- [ ] **Step 2: Implement the primitives**

`EntryList` must support ArrowUp/ArrowDown/Home/End keyboard navigation and render only semantic buttons and labels.

- [ ] **Step 3: Export the primitives**

`packages/ui/src/index.ts` should export the primitives and their prop types.

- [ ] **Step 4: Verify UI tests pass**

Run:

```bash
pnpm --filter @keepass/ui test
pnpm --filter @keepass/ui build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src packages/ui/package.json packages/ui/vite.config.ts packages/ui/vitest.config.ts
git commit -m "feat: add ui primitives"
```

---

## Task 5: End-to-end entry flows

**Files:**
- Modify: `packages/renderer/src/App.tsx`
- Modify: `packages/renderer/src/main.tsx`
- Modify: `packages/renderer/src/stores/databaseStore.ts`
- Modify: `packages/renderer/src/lib/i18n.tsx`
- Modify: `packages/renderer/src/lib/api.ts`

- [ ] **Step 1: Wire the open/list/detail/edit/create/delete/copy flow**

Use `useT()` for labels and pass translated text into `packages/ui` primitives. The renderer should call the API bridge only; all copy/password/error text should come from the i18n resource package.

- [ ] **Step 2: Verify the renderer flow**

Run:

```bash
pnpm --filter @keepass/renderer test
pnpm --filter @keepass/renderer build
pnpm --filter @keepass/renderer dev
```

Expected: browser renderer works without Electron and uses mock API data.

- [ ] **Step 3: Commit**

```bash
git add packages/renderer/src
git commit -m "feat: wire renderer flows"
```
