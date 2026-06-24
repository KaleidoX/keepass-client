export type EntrySummary = {
  id: string;
  title: string;
  username: string;
  url?: string | null;
  groupPath: string[];
};

export type EntryDetailData = {
  id: string;
  title: string;
  username: string;
  url?: string | null;
  notes?: string | null;
  groupPath: string[];
};

export type EntryPatch = {
  title: string;
  username: string;
  password?: string | null;
  url?: string | null;
  notes?: string | null;
};

export type OpenDatabaseResult = {
  databaseId: string;
  entries: EntrySummary[];
};

export type KeePassAPI = {
  getCoreVersion(): Promise<string>;
  chooseDatabaseFile(): Promise<string | null>;
  openDatabase(databasePath: string, password: string): Promise<OpenDatabaseResult>;
  getEntry(databaseId: string, entryId: string): Promise<EntryDetailData>;
  updateEntry(databaseId: string, entryId: string, patch: EntryPatch): Promise<EntryDetailData>;
  createEntry(databaseId: string, patch: EntryPatch): Promise<EntryDetailData>;
  deleteEntry(databaseId: string, entryId: string): Promise<void>;
  saveDatabase(databaseId: string): Promise<void>;
  copyPassword(databaseId: string, entryId: string): Promise<void>;
};

export function getKeePassAPI(): KeePassAPI {
  const api = window.keepassAPI;

  if (!api) {
    throw new Error('keepassAPI is not available');
  }

  return api;
}

declare global {
  interface Window {
    keepassAPI?: KeePassAPI;
  }
}

export {};
