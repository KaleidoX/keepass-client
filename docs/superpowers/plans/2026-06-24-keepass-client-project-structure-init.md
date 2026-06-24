# KeePass Client Project Structure Initialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the workspace skeleton, package manifests, and translation-resource package so every later stage has a stable place to plug in code.

**Architecture:** Keep `packages/i18n` as a pure JSON resource package. Keep `packages/ui` as a pure UI primitive package. Keep `packages/renderer` and `packages/shell` bootable but minimal, so later stages can replace placeholders without changing package boundaries.

**Tech Stack:** pnpm workspace, TypeScript 5.8, React 19, Vite 7, Electron 42, Tailwind CSS v4, Vitest, React Testing Library.

---

## Files

### Create

- `package.json` — root scripts and workspace entry.
- `pnpm-workspace.yaml` — workspace globs and version catalog.
- `tsconfig.base.json` — shared TypeScript config.
- `.gitignore` — generated outputs and platform junk.
- `packages/i18n/package.json` — pure translation-resource package exports.
- `packages/i18n/src/resources/en-US/translation.json` — English copy.
- `packages/i18n/src/resources/zh-CN/translation.json` — Simplified Chinese copy.
- `packages/ui/package.json` — UI primitives package manifest.
- `packages/ui/tsconfig.json` — UI package TypeScript config.
- `packages/ui/vite.config.ts` — UI library build config.
- `packages/ui/vitest.config.ts` — UI tests config.
- `packages/ui/src/lib/utils.ts` — class merge helper.
- `packages/ui/src/styles/globals.css` — Tailwind v4 token entry.
- `packages/ui/src/components/WelcomePanel.tsx` — minimal welcome panel primitive.
- `packages/ui/src/components/WelcomePanel.test.tsx` — UI primitive test.
- `packages/ui/src/index.ts` — UI exports.
- `packages/renderer/package.json` — renderer package manifest.
- `packages/renderer/index.html` — renderer entry HTML.
- `packages/renderer/vite.config.ts` — renderer Vite config.
- `packages/renderer/vitest.config.ts` — renderer test config.
- `packages/renderer/src/main.tsx` — React entry.
- `packages/renderer/src/App.tsx` — placeholder app shell.
- `packages/renderer/src/App.test.tsx` — renderer smoke test.
- `packages/renderer/src/test/setup.ts` — DOM test setup.
- `packages/shell/package.json` — Electron shell manifest.
- `packages/shell/electron.vite.config.ts` — Electron Vite config.
- `packages/shell/src/main/index.ts` — Electron bootstrap.

### Modify

- `keepass-client-plan.md` — leave as design reference only; do not use for execution.

---

## Task 1: Root workspace and translation resources

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `packages/i18n/package.json`
- Create: `packages/i18n/src/resources/en-US/translation.json`
- Create: `packages/i18n/src/resources/zh-CN/translation.json`

- [ ] **Step 1: Write the root workspace manifest**

```json
{
  "name": "keepass-client",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.0.0",
  "scripts": {
    "test": "pnpm -r test",
    "build": "pnpm -r build",
    "dev:renderer": "pnpm --filter @keepass/renderer dev",
    "dev:shell": "pnpm --filter @keepass/shell dev"
  }
}
```

- [ ] **Step 2: Write the workspace catalog**

```yaml
packages:
  - 'packages/*'

catalog:
  '@tailwindcss/vite': '^4.3.0'
  '@testing-library/dom': '^10.4.1'
  '@testing-library/jest-dom': '^6.9.1'
  '@testing-library/react': '^16.3.2'
  '@testing-library/user-event': '^14.6.1'
  '@types/node': '^22.13.0'
  '@types/react': '^19.0.0'
  '@types/react-dom': '^19.0.0'
  '@vitejs/plugin-react': '^6.0.0'
  'class-variance-authority': '^0.7.1'
  'clsx': '^2.1.1'
  'electron': '^42.0.0'
  'electron-vite': '^5.0.0'
  'i18next': '^26.3.2'
  'jsdom': '^25.0.1'
  'lucide-react': '^0.575.0'
  'react': '^19.2.0'
  'react-dom': '^19.2.0'
  'react-i18next': '^17.0.8'
  'tailwind-merge': '^3.4.0'
  'tailwindcss': '^4.3.0'
  'tw-animate-css': '^1.4.0'
  'typescript': '^5.8.0'
  'vite': '^7.3.0'
  'vitest': '^4.1.6'
  'zustand': '^5.0.12'
```

- [ ] **Step 3: Add the shared translation package**

```json
{
  "name": "@keepass/i18n",
  "private": true,
  "type": "module",
  "exports": {
    "./en-US": "./src/resources/en-US/translation.json",
    "./zh-CN": "./src/resources/zh-CN/translation.json"
  }
}
```

Create `packages/i18n/src/resources/en-US/translation.json`:

```json
{
  "welcome": {
    "title": "Open a KeePass database",
    "description": "Choose a local .kdbx file to get started."
  },
  "unlock": {
    "choose_file": "Choose .kdbx file",
    "no_file_selected": "No file selected",
    "password_label": "Master password",
    "submit": "Open database"
  },
  "entry": {
    "list_label": "Entries",
    "new": "New entry",
    "delete_selected": "Delete selected entry",
    "select_empty": "Select an entry to view details.",
    "copy_password": "Copy password"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "loading": "Loading…"
  }
}
```

Create `packages/i18n/src/resources/zh-CN/translation.json`:

```json
{
  "welcome": {
    "title": "打开 KeePass 数据库",
    "description": "选择一个本地 .kdbx 文件开始使用。"
  },
  "unlock": {
    "choose_file": "选择 .kdbx 文件",
    "no_file_selected": "未选择文件",
    "password_label": "主密码",
    "submit": "打开数据库"
  },
  "entry": {
    "list_label": "条目",
    "new": "新建条目",
    "delete_selected": "删除选中条目",
    "select_empty": "选择一个条目查看详情。",
    "copy_password": "复制密码"
  },
  "common": {
    "save": "保存",
    "cancel": "取消",
    "loading": "加载中…"
  }
}
```

- [ ] **Step 4: Verify the translation package exports**

Run:

```bash
pnpm install
node --input-type=module -e "import enUS from './packages/i18n/src/resources/en-US/translation.json' assert { type: 'json' }; console.log(enUS.welcome.title)"
```

Expected: the command prints `Open a KeePass database` and exits 0.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore packages/i18n
git commit -m "chore: scaffold workspace and translations"
```

---

## Task 2: UI and renderer bootstraps

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/vite.config.ts`
- Create: `packages/ui/vitest.config.ts`
- Create: `packages/ui/src/lib/utils.ts`
- Create: `packages/ui/src/styles/globals.css`
- Create: `packages/ui/src/components/WelcomePanel.tsx`
- Create: `packages/ui/src/components/WelcomePanel.test.tsx`
- Create: `packages/ui/src/index.ts`
- Create: `packages/renderer/package.json`
- Create: `packages/renderer/index.html`
- Create: `packages/renderer/vite.config.ts`
- Create: `packages/renderer/vitest.config.ts`
- Create: `packages/renderer/src/main.tsx`
- Create: `packages/renderer/src/App.tsx`
- Create: `packages/renderer/src/App.test.tsx`
- Create: `packages/renderer/src/test/setup.ts`
- Create: `packages/shell/package.json`
- Create: `packages/shell/electron.vite.config.ts`
- Create: `packages/shell/src/main/index.ts`

- [ ] **Step 1: Write the UI primitive test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WelcomePanel } from './WelcomePanel';

describe('WelcomePanel', () => {
  it('renders title and description props', () => {
    render(<WelcomePanel title="Open a KeePass database" description="Choose a local .kdbx file to get started." />);

    expect(screen.getByRole('heading', { name: 'Open a KeePass database' })).toBeInTheDocument();
    expect(screen.getByText('Choose a local .kdbx file to get started.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement the UI primitive**

```tsx
interface WelcomePanelProps {
  title: string;
  description: string;
}

export function WelcomePanel({ title, description }: WelcomePanelProps) {
  return (
    <section aria-labelledby="welcome-title">
      <h1 id="welcome-title">{title}</h1>
      <p>{description}</p>
    </section>
  );
}
```

- [ ] **Step 3: Write the renderer smoke test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the app shell', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Open a KeePass database' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Implement the renderer placeholder**

```tsx
import { WelcomePanel } from '@keepass/ui';

export function App() {
  return <WelcomePanel title="Open a KeePass database" description="Choose a local .kdbx file to get started." />;
}
```

- [ ] **Step 5: Verify the workspace boots**

Run:

```bash
pnpm install
pnpm test
pnpm --filter @keepass/ui build
pnpm --filter @keepass/renderer build
pnpm --filter @keepass/shell build
```

Expected: all commands pass and the renderer placeholder compiles without Electron.

- [ ] **Step 6: Commit**

```bash
git add packages/ui packages/renderer packages/shell
git commit -m "chore: bootstrap ui renderer shell"
```

---

## Task 3: Electron shell bootstrap

**Files:**
- Create: `packages/shell/src/main/core.ts`
- Modify: `packages/shell/src/main/index.ts`
- Modify: `packages/shell/electron.vite.config.ts`

- [ ] **Step 1: Write the shell loader test**

Create `packages/shell/tests/core-loader.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { loadCore } from '../src/main/core';

describe('loadCore', () => {
  it('falls back to the MVP version string when addon is absent', () => {
    expect(loadCore().coreVersion()).toBe('keepass-core-mvp');
  });
});
```

- [ ] **Step 2: Implement the shell loader with ESM-safe require**

```ts
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export interface NativeCore {
  coreVersion(): string;
}

export function loadCore(): NativeCore {
  try {
    return require('../../../core/target/debug/keepass_core.node') as NativeCore;
  } catch {
    return {
      coreVersion: () => 'keepass-core-mvp'
    };
  }
}
```

- [ ] **Step 3: Wire the BrowserWindow bootstrap**

```ts
import { BrowserWindow, app } from 'electron';
import path from 'node:path';

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

- [ ] **Step 4: Verify shell bootstrap**

Run:

```bash
pnpm --filter @keepass/shell build
```

Expected: build succeeds and the main process compiles in ESM mode.

- [ ] **Step 5: Commit**

```bash
git add packages/shell/src/main/core.ts packages/shell/src/main/index.ts packages/shell/electron.vite.config.ts packages/shell/tests/core-loader.test.ts
git commit -m "chore: bootstrap electron shell"
```
