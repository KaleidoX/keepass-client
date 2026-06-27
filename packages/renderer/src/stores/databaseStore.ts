import { getKeePassAPI, type EntryDetailData, type EntryPatch, type EntrySummary } from '../lib/api';
import { createStore } from '../lib/state';

export type DatabaseStoreState = {
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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

function toEntrySummary(entry: EntryDetailData): EntrySummary {
  return {
    id: entry.id,
    title: entry.title,
    username: entry.username,
    url: entry.url ?? null,
    groupPath: entry.groupPath
  };
}

export const useDatabaseStore = createStore<DatabaseStoreState>((set, get) => ({
  databaseId: null,
  entries: [],
  selectedEntryId: null,
  selectedEntry: null,
  isLoading: false,
  isDetailLoading: false,
  error: null,
  openDatabase: async (databasePath: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await getKeePassAPI().openDatabase(databasePath, password);

      set({
        databaseId: result.databaseId,
        entries: result.entries,
        selectedEntryId: null,
        selectedEntry: null,
        isLoading: false,
        isDetailLoading: false
      });
    } catch (error) {
      const message = errorMessage(error);
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  closeDatabase: async () => {
    const { databaseId } = get();
    if (!databaseId) {
      return;
    }

    try {
      await getKeePassAPI().closeDatabase(databaseId);
      set({ databaseId: null, entries: [], selectedEntryId: null, selectedEntry: null, isDetailLoading: false, error: null });
    } catch (error) {
      const message = errorMessage(error);
      set({ error: message });
      throw error;
    }
  },
  selectEntry: async (entryId: string) => {
    const { databaseId } = get();
    if (!databaseId) {
      return;
    }

    set({ isDetailLoading: true, error: null });

    try {
      const entry = await getKeePassAPI().getEntry(databaseId, entryId);
      set({ selectedEntryId: entryId, selectedEntry: entry, isDetailLoading: false });
    } catch (error) {
      set({ isDetailLoading: false, error: errorMessage(error) });
      throw error;
    }
  },
  copyPassword: async (entryId: string) => {
    const { databaseId } = get();
    if (!databaseId) {
      return;
    }

    try {
      await getKeePassAPI().copyPassword(databaseId, entryId);
      set({ error: null });
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    }
  },
  updateEntry: async (entryId: string, patch: EntryPatch) => {
    const { databaseId } = get();
    if (!databaseId) {
      return;
    }

    try {
      const entry = await getKeePassAPI().updateEntry(databaseId, entryId, patch);
      const summary = toEntrySummary(entry);
      set((state) => ({
        entries: state.entries.map((existingEntry) => (existingEntry.id === entryId ? summary : existingEntry)),
        selectedEntryId: entryId,
        selectedEntry: entry,
        error: null
      }));
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    }
  },
  deleteEntry: async (entryId: string) => {
    const { databaseId } = get();
    if (!databaseId) {
      return;
    }

    try {
      await getKeePassAPI().deleteEntry(databaseId, entryId);
      set((state) => ({
        entries: state.entries.filter((entry) => entry.id !== entryId),
        selectedEntryId: state.selectedEntryId === entryId ? null : state.selectedEntryId,
        selectedEntry: state.selectedEntryId === entryId ? null : state.selectedEntry,
        error: null
      }));
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    }
  },
  createEntry: async (patch: EntryPatch) => {
    const { databaseId } = get();
    if (!databaseId) {
      return;
    }

    try {
      const entry = await getKeePassAPI().createEntry(databaseId, patch);
      set((state) => ({
        entries: [...state.entries, toEntrySummary(entry)],
        selectedEntryId: entry.id,
        selectedEntry: entry,
        error: null
      }));
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    }
  },
  saveDatabase: async () => {
    const { databaseId } = get();
    if (!databaseId) {
      return;
    }

    try {
      await getKeePassAPI().saveDatabase(databaseId);
      set({ error: null });
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    }
  },
  setError: (error: string | null) => {
    set({ error });
  }
}));
