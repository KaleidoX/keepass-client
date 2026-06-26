import { WelcomePanel } from '@keepass/ui';
import { useT } from './lib/i18n';
import { useDatabaseStore } from './stores/databaseStore';

export function App() {
  const { t } = useT();
  const databaseId = useDatabaseStore((state) => state.databaseId);
  const error = useDatabaseStore((state) => state.error);
  const closeDatabase = useDatabaseStore((state) => state.closeDatabase);

  return (
    <main className="min-h-screen">
      {databaseId ? (
        <div className="flex justify-end p-4">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={() => {
              void closeDatabase().catch(() => undefined);
            }}
          >
            {t('common.close_database')}
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="mx-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <WelcomePanel
        title={t('welcome.title')}
        description={t('welcome.description')}
      />
    </main>
  );
}
