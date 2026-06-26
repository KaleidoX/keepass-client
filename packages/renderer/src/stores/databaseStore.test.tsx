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
