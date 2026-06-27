import { useState } from 'react';
import { cn } from '../lib/utils';

export type UnlockFormLabels = {
  title: string;
  databasePath: string;
  chooseFile: string;
  password: string;
  submit: string;
  loading: string;
};

export type UnlockFormProps = {
  labels: UnlockFormLabels;
  selectedPath: string | null;
  isLoading?: boolean;
  error?: string | null;
  onChooseFile: () => void;
  onSubmit: (password: string) => void;
};

export function UnlockForm({ labels, selectedPath, isLoading = false, error, onChooseFile, onSubmit }: UnlockFormProps) {
  const [password, setPassword] = useState('');

  return (
    <section aria-labelledby="unlock-title" className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h1 id="unlock-title" className="text-2xl font-semibold text-slate-950">
          {labels.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{labels.databasePath}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          onClick={onChooseFile}
        >
          {labels.chooseFile}
        </button>
        {selectedPath ? <span className="min-w-0 truncate text-sm text-slate-700">{selectedPath}</span> : null}
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(password);
        }}
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          {labels.password}
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            type="password"
            value={password}
            disabled={isLoading}
            onChange={(event) => setPassword(event.currentTarget.value)}
          />
        </label>

        {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <button
          type="submit"
          className={cn(
            'rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800',
            'disabled:cursor-not-allowed disabled:opacity-60'
          )}
          disabled={isLoading}
        >
          {isLoading ? labels.loading : labels.submit}
        </button>
      </form>
    </section>
  );
}
