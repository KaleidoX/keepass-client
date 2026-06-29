# Shadcn Responsive UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use shadcn/ui-style primitives to remodel the Electron renderer into a responsive password-manager UI that works at phone-sized, small-tablet, desktop, and wide-desktop window widths.

**Architecture:** Keep business/security state in `@keepass/renderer` and keep reusable presentation components in `@keepass/ui`. The renderer owns Tailwind compilation at runtime: it imports `@keepass/ui/globals.css`, uses `@tailwindcss/vite`, and the UI stylesheet explicitly points Tailwind v4 at UI package source with `@source`. Add only needed shadcn primitives under `packages/ui/src/components/ui/`, then update the existing props-driven UI components and `App.tsx` layout without changing store/API contracts.

**Tech Stack:** React 19, TypeScript 5.8, Vite 7, Tailwind CSS v4, shadcn/ui, pnpm workspace catalogs, Vitest + React Testing Library.

---

## Confirmed Constraints

- Do not change `window.keepassAPI`, renderer store, database types, or shell handlers.
- Do not expose plaintext passwords in renderer state or view mode.
- Preserve current UI component label/callback contracts:
  - `UnlockForm`: `title`, `databasePath`, `chooseFile`, `password`, `submit`, `loading`; `onChooseFile()`, `onSubmit(password)`.
  - `EntryList`: `search`, `empty`; `onSelectEntry(entryId)`; listbox keyboard behavior.
  - `EntryDetail`: existing 15 label keys and callbacks; password update patch omits empty password.
- `@keepass/ui` must stay runtime-agnostic: no renderer API, no i18n runtime dependency.
- `@keepass/ui` must export `./globals.css`; `packages/renderer/src/main.tsx` must import `@keepass/ui/globals.css`.
- `packages/renderer/vite.config.ts` must include `@tailwindcss/vite`; otherwise Tailwind classes will not be compiled for the running app.
- `packages/ui/src/styles/globals.css` must include Tailwind v4 `@source` for UI package source so renderer builds include classes from workspace UI components.
- `useMediaQuery` must return wide/desktop semantics (`false` for narrow queries) when `window.matchMedia` is missing, so existing jsdom App tests keep the two-pane fallback.
- New visible App shell copy, including the mobile back control, must come from `@keepass/i18n` resources.
- Validate at these widths conceptually and through tests where jsdom can represent behavior: `390px`, `768px`, `1024px`, `1280px`.
- Use Lucide/shadcn icons instead of emoji. Icon-only controls need accessible names.
- Use visible focus states, 44px+ touch targets, and no hover-only behavior.
- No commits unless the user explicitly confirms git commit operations.

## File Map

### Create

- `packages/ui/components.json` — shadcn config scoped to the UI package.
- `packages/ui/src/components/ui/button.tsx`
- `packages/ui/src/components/ui/input.tsx`
- `packages/ui/src/components/ui/label.tsx`
- `packages/ui/src/components/ui/card.tsx`
- `packages/ui/src/components/ui/alert.tsx`
- `packages/ui/src/components/ui/alert-dialog.tsx`
- `packages/renderer/src/lib/useMediaQuery.ts` — small client hook for jsdom-testable responsive branching.
- `packages/renderer/src/App.responsive.test.tsx` — responsive behavior tests.

### Modify

- `pnpm-workspace.yaml` — add any shadcn/Radix dependencies to the catalog if the CLI introduces new package versions.
- `packages/ui/package.json` — export `./globals.css` and add component/CSS dependencies using `catalog:`.
- `packages/ui/vite.config.ts` — add `@` alias for generated imports and update library-build externals for new component dependencies.
- `packages/ui/tsconfig.json` — add `baseUrl` / `paths` for `@/*` generated imports.
- `packages/ui/src/styles/globals.css` — add shadcn theme tokens, `tw-animate-css`, Tailwind v4 theme setup, and `@source` for UI source files.
- `packages/ui/src/index.ts` — export business components as before; optionally export UI primitives only if consumers need them.
- `packages/renderer/package.json` — add `@tailwindcss/vite`/Tailwind dependencies if not already owned by the renderer package.
- `packages/renderer/vite.config.ts` — add `@tailwindcss/vite` plugin.
- `packages/renderer/src/main.tsx` — import `@keepass/ui/globals.css` before rendering.
- `packages/renderer/src/test/setup.ts` — add a default `matchMedia` stub only if hook guard plus per-test stubs are insufficient.
- `packages/i18n/src/resources/en-US/translation.json` — add the back-to-entry-list label.
- `packages/i18n/src/resources/zh-CN/translation.json` — add the back-to-entry-list label.
- `packages/ui/src/components/UnlockForm.tsx` — shadcn Card/Input/Button/Alert remodel, preserve labels/callbacks.
- `packages/ui/src/components/EntryList.tsx` — shadcn Input/Card remodel, preserve listbox keyboard behavior.
- `packages/ui/src/components/EntryDetail.tsx` — shadcn Card/Input/Button/AlertDialog remodel, preserve password security behavior.
- `packages/ui/src/components/strongboxMvp.test.tsx` — add delete confirmation/accessibility tests; update queries only when semantics intentionally improve.
- `packages/renderer/src/App.tsx` — responsive app shell, narrow list/detail switching, back affordance, shadcn buttons.
- `packages/renderer/src/App.test.tsx` — keep existing integration coverage stable; adjust layout assertions only for intentional responsive behavior.

## Delegation Model

- Phase 1 foundation: `@fixer` is appropriate because it is mechanical configuration/component setup.
- Phase 2 responsive state/tests: `@fixer` is appropriate because it is behavior-first TDD and preserves existing design until green.
- Phase 3 UI remodel: `@designer` must own visual hierarchy, spacing, component feel, responsive layout, and interaction polish.
- Phase 4 mechanical polish/test fixes: `@fixer` can handle bounded non-visual fixes that preserve designer intent.
- After each phase: orchestrator runs validation, updates `.slim/deepwork/shadcn-ui-upgrade.md`, then asks `@oracle` for phase review including simplify/readability feedback. Fix actionable review issues before continuing.

---

## Phase 1 — shadcn Foundation and Runtime Tailwind Pipeline

**Purpose:** Add shadcn-compatible primitives, Tailwind v4 tokens, and the renderer runtime CSS pipeline without changing app behavior.

**Owner:** `@fixer`

**Review gate:** `@oracle` must review before Phase 2.

### Task 1.1: Add shadcn config and renderer Tailwind runtime pipeline

**Files:**

- Create: `packages/ui/components.json`
- Modify: `packages/ui/package.json`
- Modify: `packages/ui/tsconfig.json`
- Modify: `packages/ui/vite.config.ts`
- Modify: `packages/ui/src/styles/globals.css`
- Modify: `packages/renderer/package.json`
- Modify: `packages/renderer/vite.config.ts`
- Modify: `packages/renderer/src/main.tsx`

- [ ] **Step 1: Inspect current shadcn CLI context without applying changes**

Run from `packages/ui`:

```bash
pnpm dlx shadcn@latest info
```

Expected: CLI reports Vite/React/Tailwind context or clearly states missing config. Record relevant output in `.slim/deepwork/shadcn-ui-upgrade.md`.

- [ ] **Step 2: Create package-scoped `components.json`**

Use this stable package-scoped config unless CLI `info` proves a different current schema is required:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 3: Add `@/*` support in UI package only**

`packages/ui/tsconfig.json` should include:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

Merge this into the existing config; do not remove existing options.

`packages/ui/vite.config.ts` should resolve `@` to `src` and keep the existing library build. Use Node URL helpers rather than hard-coded absolute paths.

- [ ] **Step 4: Make `@keepass/ui` export its global CSS**

Update `packages/ui/package.json` exports to include CSS while preserving the existing source export:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./globals.css": "./src/styles/globals.css"
  }
}
```

Do not remove existing package metadata, scripts, or dependencies.

- [ ] **Step 5: Add renderer Tailwind compilation**

Update `packages/renderer/vite.config.ts` so it uses Tailwind v4 during the renderer build:

```ts
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss()],
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react'
  }
});
```

Add `@tailwindcss/vite` and `tailwindcss` to `packages/renderer/package.json` with `"catalog:"` if the package does not already own them.

- [ ] **Step 6: Import UI global CSS in the renderer entry**

Update `packages/renderer/src/main.tsx`:

```ts
import '@keepass/ui/globals.css';
```

Place the CSS import before `App` rendering. Keep React/i18n setup unchanged.

- [ ] **Step 7: Make Tailwind v4 scan UI package source**

Update `packages/ui/src/styles/globals.css` so it contains Tailwind import, animation import, and a UI-package source directive. Keep this near the top before theme variables:

```css
@import "tailwindcss";
@import "tw-animate-css";

@source "../components";
@source "../lib";
```

The `@source` lines are required because the renderer consumes `@keepass/ui` through a workspace package and Tailwind v4 may otherwise miss classes inside UI source files.

- [ ] **Step 8: Validate runtime pipeline before visual remodel**

Run:

```bash
pnpm --filter @keepass/ui test
pnpm --filter @keepass/ui build
pnpm --filter @keepass/renderer build
```

Expected: existing UI tests, UI package build, and renderer build pass. The renderer build must now exercise `@keepass/ui/globals.css` and Tailwind compilation.

### Task 1.2: Add only required shadcn primitives and dependencies

**Files:**

- Create: `packages/ui/src/components/ui/*.tsx`
- Modify: `packages/ui/src/styles/globals.css`
- Modify: `packages/ui/package.json`
- Modify: `packages/ui/vite.config.ts`
- Modify: `pnpm-workspace.yaml` if new dependencies are introduced

- [ ] **Step 1: Generate components with preview first**

Run from `packages/ui`:

```bash
pnpm dlx shadcn@latest add button input label card alert alert-dialog --dry-run
```

Expected: preview only. Confirm generated file paths stay under `packages/ui/src/components/ui/`. If the dry run proposes overwriting `exports`, removing existing package scripts, or replacing the Tailwind globals instead of merging tokens, stop and use the dry-run output/docs as a manual source instead of applying the CLI.

- [ ] **Step 2: Apply component generation**

Run from `packages/ui`:

```bash
pnpm dlx shadcn@latest add button input label card alert alert-dialog
```

Expected: components are created under `src/components/ui/`, global CSS is updated, and package dependencies reflect generated imports. Do not add `Badge`, `Separator`, `Tooltip`, or `Skeleton` until a later phase has a concrete consumer.

- [ ] **Step 3: Normalize workspace dependencies**

If the CLI adds direct dependency versions, move those versions into `pnpm-workspace.yaml` `catalog:` and set `packages/ui/package.json` entries to `"catalog:"`. Keep existing catalog style.

Use the generated component imports as source of truth. If components import `@radix-ui/react-*`, catalog those packages. If they import the unified `radix-ui` package, catalog that package. Do not guess.

- [ ] **Step 4: Preserve Tailwind v4 globals**

Ensure `packages/ui/src/styles/globals.css` contains Tailwind v4 setup, shadcn CSS variables, and:

```css
@import "tailwindcss";
@import "tw-animate-css";
```

Do not duplicate conflicting theme blocks.

- [ ] **Step 5: Update UI library build externals**

Update `packages/ui/vite.config.ts` `rollupOptions.external` so the library build treats new shadcn dependencies as external. Include every package imported by generated primitives, for example:

```ts
external: [
  'react',
  'react-dom',
  'clsx',
  'tailwind-merge',
  'class-variance-authority',
  'lucide-react',
  '@radix-ui/react-slot',
  '@radix-ui/react-label',
  '@radix-ui/react-alert-dialog'
]
```

Adjust the Radix entries to match the actual generated imports.

- [ ] **Step 6: Validate foundation**

Run:

```bash
pnpm --filter @keepass/ui test
pnpm --filter @keepass/ui build
pnpm --filter @keepass/renderer build
```

Expected: no TypeScript, Vite, or CSS import failures. The renderer build must still resolve `@keepass/ui/globals.css`.

---

## Phase 2 — Responsive App Behavior with TDD

**Purpose:** Make the app structurally responsive before visual remodel: narrow windows use list/detail switching; desktop keeps both panes.

**Owner:** `@fixer`

**Review gate:** `@oracle` must review before Phase 3.

### Task 2.1: Add viewport hook and responsive tests first

**Files:**

- Create: `packages/renderer/src/lib/useMediaQuery.ts`
- Create: `packages/renderer/src/App.responsive.test.tsx`
- Modify: `packages/i18n/src/resources/en-US/translation.json`
- Modify: `packages/i18n/src/resources/zh-CN/translation.json`
- Modify: `packages/renderer/src/App.tsx`

- [ ] **Step 1: Add localized back-label resources before using them**

Add a new `entry.back_to_entries` key to both translation files:

```json
// packages/i18n/src/resources/en-US/translation.json
"entry": {
  "back_to_entries": "Back to entries"
}
```

```json
// packages/i18n/src/resources/zh-CN/translation.json
"entry": {
  "back_to_entries": "返回条目列表"
}
```

Merge into the existing `entry` objects; do not remove or rename current keys.

- [ ] **Step 2: Write failing responsive tests**

Create tests that stub `window.matchMedia` and verify:

```tsx
it('shows the entry list first on a narrow unlocked viewport', async () => {
  // arrange: database open with entries, matchMedia('(max-width: 767px)') matches true
  // assert: Entries region is visible, Entry details region is not in the accessibility tree
});

it('switches to details after selecting an entry on a narrow viewport', async () => {
  // click an option in the listbox
  // assert: Entry details region is visible and a Back to entries button is available
});

it('returns to the entry list from details on a narrow viewport', async () => {
  // click Back to entries
  // assert: Entries region is visible again
});

it('shows both entries and details on a wide viewport', async () => {
  // arrange: matchMedia('(max-width: 767px)') matches false
  // assert: both regions are visible
});
```

Use the existing App test setup/mocks. Do not depend on CSS media queries in jsdom; assert conditional rendering or data attributes from React state.

Each responsive test that needs a narrow or wide viewport must stub `window.matchMedia` directly. The default no-stub environment must still behave as wide/two-pane.

- [ ] **Step 3: Verify tests fail for missing behavior**

Run:

```bash
pnpm --filter @keepass/renderer test -- App.responsive.test.tsx
```

Expected: tests fail because the responsive hook/layout/back affordance does not exist yet.

- [ ] **Step 4: Implement minimal `useMediaQuery`**

Create a small hook that:

- returns `false` when `typeof window === 'undefined'`;
- returns `false` when `typeof window.matchMedia !== 'function'`;
- treats `false` for a narrow query as the required wide/desktop fallback in jsdom, so existing `App.test.tsx` keeps rendering both panes without stubbing `matchMedia`;
- reads `window.matchMedia(query).matches` only after the guard;
- subscribes to `change` events with `addEventListener` and cleans up;
- falls back to legacy listener methods only if needed by the test environment.

- [ ] **Step 5: Implement narrow list/detail switching in `App.tsx`**

Keep `databaseId` as the unlock/main switch. Add local UI state only for narrow pane visibility, for example `activeMobilePane: 'list' | 'detail'`.

Required behavior:

- narrow + database open starts on list;
- selecting an entry calls the existing store selection and switches to detail on narrow view;
- Back to entries uses `t('entry.back_to_entries')`, switches back to list, and does not clear selection;
- wide view renders both panels and ignores the mobile pane state;
- existing Save database and Lock database buttons keep their accessible names.

- [ ] **Step 6: Verify green**

Run:

```bash
pnpm --filter @keepass/renderer test -- App.responsive.test.tsx
pnpm --filter @keepass/renderer test -- App.test.tsx
pnpm --filter @keepass/renderer test -- i18n.test.tsx
```

Expected: responsive tests, existing App tests, and renderer i18n tests pass. Existing `App.test.tsx` must pass without a `matchMedia` stub.

---

## Phase 3 — Designer-Led shadcn UI Remodel

**Purpose:** Replace ad-hoc Tailwind controls with shadcn primitives and responsive security-product layout while preserving behavior.

**Owner:** `@designer`

**Review gate:** `@oracle` must review before Phase 4.

### Task 3.1: Remodel the unlock screen

**Files:**

- Modify: `packages/ui/src/components/UnlockForm.tsx`
- Test: `packages/ui/src/components/strongboxMvp.test.tsx`

- [ ] **Step 1: Preserve existing tests**

Run current UI tests before editing:

```bash
pnpm --filter @keepass/ui test -- strongboxMvp.test.tsx
```

- [ ] **Step 2: Replace container/control styling with shadcn primitives**

Use `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `Button`, `Input`, `Label`, and `Alert`.

Preserve:

- heading text from `labels.title`;
- file path rendering only when `selectedPath` is not null;
- disabled state when `isLoading` is true;
- `onSubmit(password)` behavior.

Responsive design intent:

- full-width card with 16px gutters on narrow widths;
- comfortable desktop max width;
- primary submit action visually dominant;
- error uses role `alert` and shadcn alert styling.

- [ ] **Step 3: Validate behavior**

Run:

```bash
pnpm --filter @keepass/ui test -- strongboxMvp.test.tsx
```

Expected: existing UnlockForm tests pass without weakening assertions.

### Task 3.2: Remodel entry list

**Files:**

- Modify: `packages/ui/src/components/EntryList.tsx`
- Test: `packages/ui/src/components/strongboxMvp.test.tsx`

- [ ] **Step 1: Keep listbox semantics**

Before visual changes, note current roles: outer interactive list remains `role="listbox"`; entries remain `role="option"`; selected entry keeps `aria-selected`.

- [ ] **Step 2: Apply shadcn visual treatment**

Use `Input`, `Card`/surface classes, and consistent selected/hover/focus states. Do not introduce `Badge` unless this phase explicitly adds that primitive and a concrete consumer.

Preserve:

- filtering behavior;
- ArrowDown/ArrowUp/Home/End behavior;
- `onSelectEntry(entryId)` callback;
- empty state label.

Responsive design intent:

- narrow width list rows have 44px+ hit area;
- no horizontal overflow for long titles, URLs, usernames, or group paths;
- selected state is visible without relying on color alone.

- [ ] **Step 3: Validate behavior**

Run:

```bash
pnpm --filter @keepass/ui test -- strongboxMvp.test.tsx
```

Expected: list rendering, filtering, and keyboard tests pass.

### Task 3.3: Remodel entry detail and app shell surfaces

**Files:**

- Modify: `packages/ui/src/components/EntryDetail.tsx`
- Modify: `packages/renderer/src/App.tsx`
- Test: `packages/ui/src/components/strongboxMvp.test.tsx`
- Test: `packages/renderer/src/App.test.tsx`
- Test: `packages/renderer/src/App.responsive.test.tsx`

- [ ] **Step 1: Preserve password security tests**

Ensure tests still prove:

- view mode renders `••••••••`, not plaintext;
- edit mode password field is empty;
- update patch omits empty password.

- [ ] **Step 2: Apply shadcn detail layout**

Use `Card`, `Button`, `Input`, `Label`, and already-added primitives. Do not introduce `Badge`, `Separator`, `Tooltip`, or `Skeleton` unless this phase first adds the primitive with a concrete consumer and validation.

Responsive design intent:

- desktop: stable two-pane layout with list width around 320–380px and detail taking remaining space;
- 768–1023px: compressed two-column layout without cramped controls;
- under 768px: single pane controlled by Phase 2 behavior;
- detail content scrolls within available area rather than pushing the shell off-screen.

- [ ] **Step 3: Apply app shell polish**

Use shadcn buttons for Save/Lock actions. Keep accessible names `Save database` and `Lock database`. Preserve sr-only app heading for screen readers.

- [ ] **Step 4: Validate behavior**

Run:

```bash
pnpm --filter @keepass/ui test -- strongboxMvp.test.tsx
pnpm --filter @keepass/renderer test -- App.test.tsx App.responsive.test.tsx
```

Expected: UI contracts, App integration, and responsive behavior pass.

---

## Phase 4 — Confirmation, Accessibility, Validation

**Purpose:** Add destructive-action confirmation and finish accessibility/validation without changing the accepted visual direction.

**Owner:** `@fixer` for tests/mechanical wiring; route back to `@designer` if visual judgment is needed.

**Review gate:** final `@oracle` review after validation.

### Task 4.1: Add delete confirmation with tests first

**Files:**

- Modify: `packages/ui/src/components/EntryDetail.tsx`
- Modify: `packages/ui/src/components/strongboxMvp.test.tsx`

- [ ] **Step 1: Write failing tests**

Add tests that verify:

```tsx
it('asks for confirmation before deleting an entry', async () => {
  // click Delete
  // expect alertdialog/dialog to be visible
  // expect onDeleteEntry not called yet
});

it('does not delete when the confirmation is cancelled', async () => {
  // open confirmation, click Cancel
  // expect onDeleteEntry not called
});

it('deletes when the confirmation is confirmed', async () => {
  // open confirmation, click confirm Delete
  // expect onDeleteEntry called with entry id
});
```

- [ ] **Step 2: Verify red**

Run:

```bash
pnpm --filter @keepass/ui test -- strongboxMvp.test.tsx
```

Expected: new confirmation tests fail because delete currently calls immediately.

- [ ] **Step 3: Implement `AlertDialog` confirmation**

Use shadcn `AlertDialog` primitives. Keep visible labels from existing `labels.delete` and `labels.cancel`; do not add required label keys to `EntryDetailLabels`. If extra confirmation copy is needed, use internal neutral text or optional props only after review.

- [ ] **Step 4: Verify green**

Run:

```bash
pnpm --filter @keepass/ui test -- strongboxMvp.test.tsx
```

Expected: delete confirmation tests and existing UI contract tests pass.

### Task 4.2: Full validation and copy/accessibility pass

**Files:**

- Modify only files needed for mechanical fixes.

- [ ] **Step 1: Run full validation**

Run:

```bash
pnpm test
pnpm build
```

Expected: all package tests and builds pass.

- [ ] **Step 2: Verify runtime Tailwind styles manually**

Automated jsdom tests cannot prove that Tailwind produced the runtime CSS used by Electron. Run one of the app dev commands and visually verify the app has real Tailwind/shadcn styling:

```bash
pnpm dev:renderer
# or, for Electron shell validation:
pnpm dev:shell
```

Check these viewport widths: `390px`, `768px`, `1024px`, `1280px`.

Required observations:

- Tailwind/shadcn styles render; the app is not unstyled HTML.
- 390px: list-first single-pane flow, detail opens after entry selection, Back to entries returns to list.
- 768px: compact two-column or planned small-tablet behavior without horizontal overflow.
- 1024px and 1280px: two-pane desktop layout with stable entry list and usable detail surface.
- Save/Lock actions remain reachable.

- [ ] **Step 3: Manual/static accessibility checklist**

Check the changed UI code for:

- icon-only buttons have `aria-label` or `sr-only` text;
- dialog/alert-dialog content has accessible title/description;
- focus-visible styles are not removed;
- touch/click targets are at least 44px high where practical;
- no mobile-only action depends on hover.

- [ ] **Step 4: Deepwork and oracle review**

Update `.slim/deepwork/shadcn-ui-upgrade.md` with validation results and ask `@oracle` for final review including simplify/readability feedback.

---

## Validation Commands

Use these commands at the relevant gates:

```bash
pnpm --filter @keepass/ui test
pnpm --filter @keepass/renderer test
pnpm --filter @keepass/ui build
pnpm --filter @keepass/renderer build
pnpm test
pnpm build
```

Manual runtime validation is also required before final completion:

```bash
pnpm dev:renderer
# or pnpm dev:shell
```

Check `390px`, `768px`, `1024px`, and `1280px` widths for real rendered Tailwind/shadcn styling and responsive behavior.

Do not claim a phase is complete until its listed validation commands have been run freshly and their output is reconciled.

## Plan Self-Review

- Scope is limited to Electron renderer/UI package responsive shadcn remodel.
- Browser extension, React Native, shell IPC, database store, and API contracts are out of scope.
- New behavior is covered by tests before implementation: responsive list/detail switching and delete confirmation.
- Existing security behavior remains explicitly protected by tests and constraints.
- Visual work is routed to `@designer`; mechanical setup/tests are routed to `@fixer`.
- Every phase has validation and `@oracle` review before moving forward.
- Oracle required-change review has been incorporated: renderer Tailwind runtime pipeline is explicit, `matchMedia` fallback is guarded, Back to entries is localized, UI build externals are planned, and unused primitives are deferred.
