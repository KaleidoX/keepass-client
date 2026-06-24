import { getKeePassAPI, type EntrySummary } from '../lib/api';
import { createStore } from '../lib/state';

export type DatabaseStoreState = {
  databaseId: string | null;
  entries: EntrySummary[];
  isLoading: boolean;
  error: string | null;
  openDatabase: (databasePath: string, password: string) => Promise<void>;
  chooseAndOpenDatabase: () => Promise<void>;
  setError: (error: string | null) => void;
};

export const useDatabaseStore = createStore<DatabaseStoreState>((set, get) => ({
  databaseId: null,
  entries: [],
  isLoading: false,
  error: null,
  openDatabase: async (databasePath: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await getKeePassAPI().openDatabase(databasePath, password);

      set({
        databaseId: result.databaseId,
        entries: result.entries,
        isLoading: false
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  chooseAndOpenDatabase: async () => {
    const api = getKeePassAPI();
    const databasePath = await api.chooseDatabaseFile();

    if (!databasePath) {
      return;
    }

    await get().openDatabase(databasePath, '');
  },
  setError: (error: string | null) => {
    set({ error });
  }
}));
