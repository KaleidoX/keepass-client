import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import type { EntryDetailData, EntrySummary } from './lib/api';
import { installKeePassAPIMock } from './lib/api.mock';
import { I18nProvider, createRendererI18n } from './lib/i18n';
import { useDatabaseStore } from './stores/databaseStore';

const mockEntry: EntrySummary = {
  id: 'entry-1',
  title: 'Email',
  username: 'alice',
  url: 'https://mail.example',
  groupPath: ['Root']
};

const mockEntryDetail: EntryDetailData = {
  ...mockEntry,
  notes: 'Recovery codes in safe'
};

type FutureAppStoreState = {
  databaseId: string | null;
  entries: EntrySummary[];
  selectedEntryId: string | null;
  selectedEntry: EntryDetailData | null;
  isLoading: boolean;
  isDetailLoading: boolean;
  error: string | null;
};

function resetDatabaseStore() {
  useDatabaseStore.setState({
    databaseId: null,
    entries: [],
    selectedEntryId: null,
    selectedEntry: null,
    isLoading: false,
    isDetailLoading: false,
    error: null
  } as Partial<FutureAppStoreState>);
}

function renderUnlockedApp(state: Partial<FutureAppStoreState> = {}) {
  installKeePassAPIMock({
    getEntry: vi.fn().mockResolvedValue(mockEntryDetail)
  });
  useDatabaseStore.setState({
    databaseId: 'db-1',
    entries: [mockEntry],
    selectedEntryId: null,
    selectedEntry: null,
    isLoading: false,
    isDetailLoading: false,
    error: null,
    ...state
  } as Partial<FutureAppStoreState>);

  render(
    <I18nProvider i18n={createRendererI18n('en-US')}>
      <App />
    </I18nProvider>
  );
}

function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

beforeEach(() => {
  resetDatabaseStore();
  delete window.keepassAPI;
});

afterEach(() => {
  delete (window as Partial<Window>).matchMedia;
});

describe('App responsive layout', () => {
  it('shows the entry list first on a narrow unlocked viewport', () => {
    stubMatchMedia(true);

    renderUnlockedApp();

    expect(screen.getByRole('region', { name: 'Entries' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Entry details' })).not.toBeInTheDocument();
  });

  it('shows details with a back control after selecting an entry on a narrow viewport', async () => {
    stubMatchMedia(true);

    renderUnlockedApp();
    fireEvent.click(screen.getByRole('option', { name: /Email alice/ }));

    expect(await screen.findByRole('region', { name: 'Entry details' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Entries' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to entries' })).toBeInTheDocument();
  });

  it('returns to the entry list from details without clearing selection on a narrow viewport', async () => {
    stubMatchMedia(true);

    renderUnlockedApp();
    fireEvent.click(screen.getByRole('option', { name: /Email alice/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Back to entries' }));

    expect(screen.getByRole('region', { name: 'Entries' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Entry details' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('option', { name: /Email alice/ })).toHaveAttribute('aria-selected', 'true'));
  });

  it('shows both entries and details on a wide viewport', () => {
    stubMatchMedia(false);

    renderUnlockedApp({ selectedEntryId: 'entry-1', selectedEntry: mockEntryDetail });

    expect(screen.getByRole('region', { name: 'Entries' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Entry details' })).toBeInTheDocument();
  });
});
