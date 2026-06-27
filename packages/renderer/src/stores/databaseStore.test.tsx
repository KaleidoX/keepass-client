import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EntryDetailData, EntryPatch, EntrySummary } from '../lib/api';
import { installKeePassAPIMock } from '../lib/api.mock';
import { useDatabaseStore } from './databaseStore';

const mockEntry: EntrySummary = {
  id: 'entry-1',
  title: 'Email',
  username: 'alice',
  url: null,
  groupPath: ['Root']
};

const mockEntryDetail: EntryDetailData = {
  ...mockEntry,
  notes: 'Recovery codes in safe'
};

type FutureDatabaseStoreState = {
  databaseId: string | null;
  entries: EntrySummary[];
  selectedEntryId: string | null;
  selectedEntry: EntryDetailData | null;
  isLoading: boolean;
  isDetailLoading: boolean;
  error: string | null;
  openDatabase: (databasePath: string, password: string) => Promise<void>;
  closeDatabase: () => Promise<void>;
  selectEntry: (entryId: string) => Promise<void>;
  copyPassword: (entryId: string) => Promise<void>;
  updateEntry: (entryId: string, patch: EntryPatch) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  createEntry: (patch: EntryPatch) => Promise<void>;
  saveDatabase: () => Promise<void>;
  setError: (error: string | null) => void;
};

function getFutureDatabaseStore() {
  return useDatabaseStore.getState() as FutureDatabaseStoreState;
}

function resetDatabaseStore() {
  useDatabaseStore.setState({
    databaseId: null,
    entries: [],
    selectedEntryId: null,
    selectedEntry: null,
    isLoading: false,
    isDetailLoading: false,
    error: null
  } as Partial<FutureDatabaseStoreState>);
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

describe('databaseStore Strongbox MVP contract', () => {
  beforeEach(() => {
    resetDatabaseStore();
    delete window.keepassAPI;
  });

  it('selects an entry and loads detail through the renderer API mock', async () => {
    const getEntry = vi.fn().mockResolvedValue(mockEntryDetail);
    installKeePassAPIMock({ getEntry });
    useDatabaseStore.setState({ databaseId: 'db-1', entries: [mockEntry] });

    await getFutureDatabaseStore().selectEntry('entry-1');

    expect(getEntry).toHaveBeenCalledWith('db-1', 'entry-1');
    expect(getFutureDatabaseStore().selectedEntryId).toBe('entry-1');
    expect(getFutureDatabaseStore().selectedEntry).toEqual(mockEntryDetail);
    expect(getFutureDatabaseStore().isDetailLoading).toBe(false);
  });

  it('propagates detail loading errors and keeps the previous selected entry', async () => {
    const getEntry = vi.fn().mockRejectedValue(new Error('detail failed'));
    installKeePassAPIMock({ getEntry });
    useDatabaseStore.setState({
      databaseId: 'db-1',
      entries: [mockEntry],
      selectedEntryId: 'entry-1',
      selectedEntry: mockEntryDetail,
      isDetailLoading: true
    } as Partial<FutureDatabaseStoreState>);

    await expect(getFutureDatabaseStore().selectEntry('missing-entry')).rejects.toThrow('detail failed');

    expect(getFutureDatabaseStore().selectedEntryId).toBe('entry-1');
    expect(getFutureDatabaseStore().selectedEntry).toEqual(mockEntryDetail);
    expect(getFutureDatabaseStore().error).toBe('detail failed');
    expect(getFutureDatabaseStore().isDetailLoading).toBe(false);
  });

  it('copies a password through the main-process API without storing plaintext password', async () => {
    const copyPassword = vi.fn().mockResolvedValue(undefined);
    installKeePassAPIMock({ copyPassword });
    useDatabaseStore.setState({ databaseId: 'db-1', selectedEntry: mockEntryDetail } as Partial<FutureDatabaseStoreState>);

    await getFutureDatabaseStore().copyPassword('entry-1');

    expect(copyPassword).toHaveBeenCalledWith('db-1', 'entry-1');
    expect('password' in (getFutureDatabaseStore().selectedEntry ?? {})).toBe(false);
    expect(JSON.stringify(useDatabaseStore.getState())).not.toContain('one-time-secret');
  });

  it('updates the selected entry through the API and refreshes summary fields', async () => {
    const updatedEntry: EntryDetailData = {
      ...mockEntryDetail,
      title: 'Personal email',
      username: 'alice@example.com'
    };
    const updateEntry = vi.fn().mockResolvedValue(updatedEntry);
    installKeePassAPIMock({ updateEntry });
    useDatabaseStore.setState({
      databaseId: 'db-1',
      entries: [mockEntry],
      selectedEntryId: 'entry-1',
      selectedEntry: mockEntryDetail
    } as Partial<FutureDatabaseStoreState>);

    await getFutureDatabaseStore().updateEntry('entry-1', {
      title: 'Personal email',
      username: 'alice@example.com',
      password: 'rotated-secret',
      url: null,
      notes: 'Updated notes'
    });

    expect(updateEntry).toHaveBeenCalledWith('db-1', 'entry-1', {
      title: 'Personal email',
      username: 'alice@example.com',
      password: 'rotated-secret',
      url: null,
      notes: 'Updated notes'
    });
    expect(getFutureDatabaseStore().selectedEntry).toEqual(updatedEntry);
    expect(getFutureDatabaseStore().entries).toEqual([
      expect.objectContaining({ id: 'entry-1', title: 'Personal email', username: 'alice@example.com' })
    ]);
  });

  it('creates an entry through the API and selects the created detail', async () => {
    const createdEntry: EntryDetailData = {
      id: 'entry-2',
      title: 'GitHub',
      username: 'octo',
      url: 'https://github.com',
      notes: null,
      groupPath: ['Root']
    };
    const createEntry = vi.fn().mockResolvedValue(createdEntry);
    installKeePassAPIMock({ createEntry });
    useDatabaseStore.setState({ databaseId: 'db-1', entries: [mockEntry] });

    await getFutureDatabaseStore().createEntry({
      title: 'GitHub',
      username: 'octo',
      password: 'new-secret',
      url: 'https://github.com',
      notes: null
    });

    expect(createEntry).toHaveBeenCalledWith('db-1', {
      title: 'GitHub',
      username: 'octo',
      password: 'new-secret',
      url: 'https://github.com',
      notes: null
    });
    expect(getFutureDatabaseStore().selectedEntryId).toBe('entry-2');
    expect(getFutureDatabaseStore().selectedEntry).toEqual(createdEntry);
    expect(getFutureDatabaseStore().entries).toEqual([mockEntry, expect.objectContaining({ id: 'entry-2' })]);
  });

  it('deletes the selected entry through the API and clears detail state', async () => {
    const deleteEntry = vi.fn().mockResolvedValue(undefined);
    installKeePassAPIMock({ deleteEntry });
    useDatabaseStore.setState({
      databaseId: 'db-1',
      entries: [mockEntry],
      selectedEntryId: 'entry-1',
      selectedEntry: mockEntryDetail
    } as Partial<FutureDatabaseStoreState>);

    await getFutureDatabaseStore().deleteEntry('entry-1');

    expect(deleteEntry).toHaveBeenCalledWith('db-1', 'entry-1');
    expect(getFutureDatabaseStore().entries).toEqual([]);
    expect(getFutureDatabaseStore().selectedEntryId).toBeNull();
    expect(getFutureDatabaseStore().selectedEntry).toBeNull();
    expect(getFutureDatabaseStore().isDetailLoading).toBe(false);
  });

  it('saves the current database through the API', async () => {
    const saveDatabase = vi.fn().mockResolvedValue(undefined);
    installKeePassAPIMock({ saveDatabase });
    useDatabaseStore.setState({ databaseId: 'db-1', entries: [mockEntry] });

    await getFutureDatabaseStore().saveDatabase();

    expect(saveDatabase).toHaveBeenCalledWith('db-1');
  });

  it('clears selection and detail state when closing a database succeeds', async () => {
    const closeDatabase = vi.fn().mockResolvedValue(undefined);
    installKeePassAPIMock({ closeDatabase });
    useDatabaseStore.setState({
      databaseId: 'db-1',
      entries: [mockEntry],
      selectedEntryId: 'entry-1',
      selectedEntry: mockEntryDetail
    } as Partial<FutureDatabaseStoreState>);

    await getFutureDatabaseStore().closeDatabase();

    expect(getFutureDatabaseStore().databaseId).toBeNull();
    expect(getFutureDatabaseStore().entries).toEqual([]);
    expect(getFutureDatabaseStore().selectedEntryId).toBeNull();
    expect(getFutureDatabaseStore().selectedEntry).toBeNull();
  });
});
