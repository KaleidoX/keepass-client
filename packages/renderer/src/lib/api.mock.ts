import type { EntryDetailData, EntryPatch, EntrySummary, KeePassAPI, OpenDatabaseResult } from './api';

const MOCK_ENTRIES: EntrySummary[] = [
  {
    id: 'mock-entry-1',
    title: 'Example account',
    username: 'alice',
    url: 'https://example.com',
    groupPath: ['General']
  }
];

export function createKeePassAPIMock(overrides: Partial<KeePassAPI> = {}): KeePassAPI {
  const getCoreVersion = async (): Promise<string> => '1.0.0-mock';

  const chooseDatabaseFile = async (): Promise<string | null> => '/mock/database.kdbx';

  const openDatabase = async (_databasePath: string, _password: string): Promise<OpenDatabaseResult> => ({
    databaseId: 'mock-database',
    entries: MOCK_ENTRIES
  });

  const getEntry = async (_databaseId: string, entryId: string): Promise<EntryDetailData> => ({
    ...MOCK_ENTRIES[0],
    id: entryId,
    notes: 'Mock entry details',
    groupPath: ['General']
  });

  const updateEntry = async (
    _databaseId: string,
    entryId: string,
    patch: EntryPatch
  ): Promise<EntryDetailData> => ({
    ...MOCK_ENTRIES[0],
    id: entryId,
    ...patch
  });

  const createEntry = async (_databaseId: string, patch: EntryPatch): Promise<EntryDetailData> => ({
    id: 'mock-created-entry',
    title: patch.title,
    username: patch.username,
    url: patch.url ?? null,
    notes: patch.notes ?? null,
    groupPath: ['General']
  });

  const deleteEntry = async () => {};

  const saveDatabase = async () => {};

  const copyPassword = async () => {};

  const closeDatabase = async () => {};

  return {
    getCoreVersion,
    chooseDatabaseFile,
    openDatabase,
    getEntry,
    updateEntry,
    createEntry,
    deleteEntry,
    saveDatabase,
    copyPassword,
    closeDatabase,
    ...overrides
  };
}

export function installKeePassAPIMock(overrides?: Partial<KeePassAPI>) {
  if (typeof window === 'undefined') {
    throw new Error('KeePass API mock can only be installed in a browser');
  }

  const api = createKeePassAPIMock(overrides);
  window.keepassAPI = api;

  return api;
}
