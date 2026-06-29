import { useEffect, useState } from 'react';
import { Alert, AlertDescription, Button, EntryDetail, EntryList, UnlockForm } from '@keepass/ui';
import { getKeePassAPI } from './lib/api';
import { useT } from './lib/i18n';
import { useMediaQuery } from './lib/useMediaQuery';
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
  const [activeMobilePane, setActiveMobilePane] = useState<'list' | 'detail'>('list');
  const isNarrowViewport = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    if (databaseId) {
      setActiveMobilePane('list');
    }
  }, [databaseId]);

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
    deleteConfirmationDescription: (entryTitle: string) =>
      t('entry.delete_confirmation_description', { title: entryTitle }),
    create: t('entry.new')
  };

  const showEntryList = !isNarrowViewport || activeMobilePane === 'list';
  const showEntryDetail = !isNarrowViewport || activeMobilePane === 'detail';

  return (
    <main className="min-h-dvh bg-slate-100 text-slate-950">
      <h1 className="sr-only">{t('welcome.title')}</h1>

      {databaseId ? (
        <div className="flex h-dvh min-h-0 flex-col bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.26),transparent_34rem)]">
          <header className="shrink-0 border-b border-slate-200 bg-white/90 px-3 py-3 shadow-sm backdrop-blur sm:px-4">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => {
                  void saveDatabase().catch(() => undefined);
                }}
              >
                {t('common.save_database')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-11"
                onClick={() => {
                  void closeDatabase().catch(() => undefined);
                }}
              >
                {t('common.close_database')}
              </Button>
            </div>
          </header>

          {error ? (
            <div className="shrink-0 px-3 pt-3 sm:px-4">
              <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 p-2 sm:p-3 md:grid-cols-[minmax(280px,34vw)_minmax(0,1fr)] md:gap-3 lg:grid-cols-[360px_minmax(0,1fr)] lg:p-4">
            {showEntryList ? (
              <section
                aria-label={t('entry.list_label')}
                className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/90 p-3 shadow-sm"
              >
                <EntryList
                  labels={{ search: t('entry.search_label'), empty: t('entry.empty') }}
                  entries={entries}
                  selectedEntryId={selectedEntryId}
                  onSelectEntry={(entryId) => {
                    void selectEntry(entryId).catch(() => undefined);
                    if (isNarrowViewport) {
                      setActiveMobilePane('detail');
                    }
                  }}
                />
              </section>
            ) : null}
            {showEntryDetail ? (
              <section
                aria-label={t('entry.detail_label')}
                className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/75 shadow-sm"
              >
                {isNarrowViewport ? (
                  <div className="border-b border-slate-200 bg-white/95 p-3">
                    <Button type="button" variant="outline" className="h-11" onClick={() => setActiveMobilePane('list')}>
                      {t('entry.back_to_entries')}
                    </Button>
                  </div>
                ) : null}
                <div className="min-h-0 flex-1">
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
                </div>
              </section>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.28),transparent_34rem)] p-4 sm:p-6">
          <div className="w-full">
            {error ? (
              <Alert variant="destructive" className="mx-auto mb-4 max-w-[28rem] border-red-200 bg-red-50 text-red-800">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            ) : null}
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
        </div>
      )}
    </main>
  );
}
