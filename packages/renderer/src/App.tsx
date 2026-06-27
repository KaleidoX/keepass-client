import { useState } from 'react';
import { EntryDetail, EntryList, UnlockForm } from '@keepass/ui';
import { getKeePassAPI } from './lib/api';
import { useT } from './lib/i18n';
import { useDatabaseStore } from './stores/databaseStore';

export function App() {
  const { t } = useT();
  const databaseId = useDatabaseStore((state) => state.databaseId);
  const entries = useDatabaseStore((state) => state.entries);
  const selectedEntryId = useDatabaseStore((state) => state.selectedEntryId);
  const selectedEntry = useDatabaseStore((state) => state.selectedEntry);
  const isLoading = useDatabaseStore((state) => state.isLoading);
  const isDetailLoading = useDatabaseStore((state) => state.isDetailLoading);
  const error = useDatabaseStore((state) => state.error);
  const openDatabase = useDatabaseStore((state) => state.openDatabase);
  const closeDatabase = useDatabaseStore((state) => state.closeDatabase);
  const selectEntry = useDatabaseStore((state) => state.selectEntry);
  const copyPassword = useDatabaseStore((state) => state.copyPassword);
  const updateEntry = useDatabaseStore((state) => state.updateEntry);
  const deleteEntry = useDatabaseStore((state) => state.deleteEntry);
  const createEntry = useDatabaseStore((state) => state.createEntry);
  const saveDatabase = useDatabaseStore((state) => state.saveDatabase);
  const setError = useDatabaseStore((state) => state.setError);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const unlockLabels = {
    title: t('unlock.title'),
    databasePath: t('unlock.database_path'),
    chooseFile: t('unlock.choose_file'),
    password: t('unlock.password_label'),
    submit: t('unlock.submit'),
    loading: t('unlock.loading')
  };

  const detailLabels = {
    empty: t('entry.select_empty'),
    title: t('entry.title'),
    username: t('entry.username'),
    password: t('entry.password'),
    url: t('entry.url'),
    notes: t('entry.notes'),
    loading: t('entry.loading'),
    edit: t('entry.edit'),
    save: t('common.save'),
    cancel: t('common.cancel'),
    copyPassword: t('entry.copy_password'),
    showPassword: t('entry.show_password'),
    hidePassword: t('entry.hide_password'),
    delete: t('entry.delete'),
    create: t('entry.new')
  };

  const headerButtonClass =
    'rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <h1 className="sr-only">{t('welcome.title')}</h1>
      {error ? (
        <p className="mx-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {databaseId ? (
        <div className="flex h-screen flex-col">
          <header className="flex items-center justify-end gap-2 border-b border-slate-200 bg-white p-4">
            <button
              type="button"
              className={headerButtonClass}
              onClick={() => {
                void saveDatabase().catch(() => undefined);
              }}
            >
              {t('common.save_database')}
            </button>
            <button
              type="button"
              className={headerButtonClass}
              onClick={() => {
                void closeDatabase().catch(() => undefined);
              }}
            >
              {t('common.close_database')}
            </button>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(240px,360px)_1fr]">
            <section aria-label={t('entry.list_label')} className="min-h-0 border-r border-slate-200 bg-slate-100 p-4">
              <EntryList
                labels={{ search: t('entry.search_label'), empty: t('entry.empty') }}
                entries={entries}
                selectedEntryId={selectedEntryId}
                onSelectEntry={(entryId) => {
                  void selectEntry(entryId).catch(() => undefined);
                }}
              />
            </section>
            <section aria-label={t('entry.detail_label')} className="min-h-0 bg-white">
              <EntryDetail
                labels={detailLabels}
                entry={selectedEntry}
                isLoading={isDetailLoading}
                onCopyPassword={(entryId) => {
                  void copyPassword(entryId).catch(() => undefined);
                }}
                onUpdateEntry={(entryId, patch) => {
                  void updateEntry(entryId, patch).catch(() => undefined);
                }}
                onDeleteEntry={(entryId) => {
                  void deleteEntry(entryId).catch(() => undefined);
                }}
                onCreateEntry={(patch) => {
                  void createEntry(patch).catch(() => undefined);
                }}
              />
            </section>
          </div>
        </div>
      ) : (
        <div className="flex min-h-screen items-center justify-center p-6">
          <UnlockForm
            labels={unlockLabels}
            selectedPath={selectedPath}
            isLoading={isLoading}
            error={null}
            onChooseFile={() => {
              void getKeePassAPI()
                .chooseDatabaseFile()
                .then((path) => {
                  if (path) {
                    setError(null);
                    setSelectedPath(path);
                  }
                })
                .catch((chooseError) => {
                  setError(chooseError instanceof Error ? chooseError.message : 'Unknown error');
                });
            }}
            onSubmit={(password) => {
              if (!selectedPath) {
                setError(t('unlock.no_file_selected'));
                return;
              }

              setError(null);
              void openDatabase(selectedPath, password).catch(() => undefined);
            }}
          />
        </div>
      )}
    </main>
  );
}
