import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

beforeEach(() => {
  resetDatabaseStore();
  delete window.keepassAPI;
});

describe('App', () => {
  it('renders the app shell', () => {
    render(
      <I18nProvider i18n={createRendererI18n('en-US')}>
        <App />
      </I18nProvider>
    );

    expect(screen.getByRole('heading', { name: 'Open a KeePass database' })).toBeInTheDocument();
  });

  it('closes the current database from the app shell', async () => {
    const closeDatabase = vi.fn().mockResolvedValue(undefined);
    installKeePassAPIMock({ closeDatabase });
    useDatabaseStore.setState({ databaseId: 'db-1', entries: [], isLoading: false, error: null });

    render(
      <I18nProvider i18n={createRendererI18n('en-US')}>
        <App />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lock database' }));

    await waitFor(() => expect(closeDatabase).toHaveBeenCalledWith('db-1'));
  });

  it('shows an error when closing the current database fails', async () => {
    const closeDatabase = vi.fn().mockRejectedValue(new Error('close failed'));
    installKeePassAPIMock({ closeDatabase });
    useDatabaseStore.setState({ databaseId: 'db-1', entries: [], isLoading: false, error: null });

    render(
      <I18nProvider i18n={createRendererI18n('en-US')}>
        <App />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lock database' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('close failed');
  });

  it('renders the locked unlock screen before a database is open', () => {
    const chooseDatabaseFile = vi.fn().mockResolvedValue('/vaults/main.kdbx');
    const openDatabase = vi.fn().mockResolvedValue({ databaseId: 'db-1', entries: [mockEntry] });
    installKeePassAPIMock({ chooseDatabaseFile, openDatabase });

    render(
      <I18nProvider i18n={createRendererI18n('en-US')}>
        <App />
      </I18nProvider>
    );

    expect(screen.getByRole('heading', { name: 'Unlock database' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose file' })).toBeInTheDocument();
    expect(screen.getByLabelText('Master password')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows localized feedback when unlocking without choosing a database file', async () => {
    installKeePassAPIMock();

    render(
      <I18nProvider i18n={createRendererI18n('en-US')}>
        <App />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a database file first');
  });

  it('shows localized Chinese feedback when unlocking without choosing a database file', async () => {
    installKeePassAPIMock();

    render(
      <I18nProvider i18n={createRendererI18n('zh-CN')}>
        <App />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '解锁' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('请先选择数据库文件');
  });

  it('renders an unlocked two-pane vault layout with list and detail panels', () => {
    useDatabaseStore.setState({
      databaseId: 'db-1',
      entries: [mockEntry],
      selectedEntryId: 'entry-1',
      selectedEntry: mockEntryDetail,
      isLoading: false,
      isDetailLoading: false,
      error: null
    } as Partial<FutureAppStoreState>);

    render(
      <I18nProvider i18n={createRendererI18n('en-US')}>
        <App />
      </I18nProvider>
    );

    expect(screen.getByRole('region', { name: 'Entries' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Entry details' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search entries input' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Email alice/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Recovery codes in safe')).toBeInTheDocument();
  });

  it('wires renderer controls to save, copy password, and close API calls', async () => {
    const saveDatabase = vi.fn().mockResolvedValue(undefined);
    const copyPassword = vi.fn().mockResolvedValue(undefined);
    const closeDatabase = vi.fn().mockResolvedValue(undefined);
    installKeePassAPIMock({ saveDatabase, copyPassword, closeDatabase });
    useDatabaseStore.setState({
      databaseId: 'db-1',
      entries: [mockEntry],
      selectedEntryId: 'entry-1',
      selectedEntry: mockEntryDetail,
      isLoading: false,
      isDetailLoading: false,
      error: null
    } as Partial<FutureAppStoreState>);

    render(
      <I18nProvider i18n={createRendererI18n('en-US')}>
        <App />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save database' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy password' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lock database' }));

    await waitFor(() => expect(saveDatabase).toHaveBeenCalledWith('db-1'));
    expect(copyPassword).toHaveBeenCalledWith('db-1', 'entry-1');
    expect(closeDatabase).toHaveBeenCalledWith('db-1');
  });

  it('propagates renderer API errors into the visible app alert', async () => {
    const saveDatabase = vi.fn().mockRejectedValue(new Error('save failed'));
    installKeePassAPIMock({ saveDatabase });
    useDatabaseStore.setState({
      databaseId: 'db-1',
      entries: [mockEntry],
      selectedEntryId: 'entry-1',
      selectedEntry: mockEntryDetail,
      isLoading: false,
      isDetailLoading: false,
      error: null
    } as Partial<FutureAppStoreState>);

    render(
      <I18nProvider i18n={createRendererI18n('en-US')}>
        <App />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save database' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('save failed');
  });
});
