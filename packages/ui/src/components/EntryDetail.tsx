import { useEffect, useState } from 'react';

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

export type EntryDetailLabels = {
  empty: string;
  loading: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  edit: string;
  save: string;
  cancel: string;
  copyPassword: string;
  showPassword: string;
  hidePassword: string;
  delete: string;
  create: string;
};

export type EntryDetailProps = {
  labels: EntryDetailLabels;
  entry: EntryDetailData | null;
  isLoading?: boolean;
  onCopyPassword: (entryId: string) => void;
  onUpdateEntry: (entryId: string, patch: EntryPatch) => void;
  onDeleteEntry: (entryId: string) => void;
  onCreateEntry: (patch: EntryPatch) => void;
};

type FormState = {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
};

const emptyForm: FormState = {
  title: '',
  username: '',
  password: '',
  url: '',
  notes: ''
};

function formFromEntry(entry: EntryDetailData): FormState {
  return {
    title: entry.title,
    username: entry.username,
    password: '',
    url: entry.url ?? '',
    notes: entry.notes ?? ''
  };
}

function basePatchFromForm(form: FormState): EntryPatch {
  return {
    title: form.title,
    username: form.username,
    url: form.url || null,
    notes: form.notes || null
  };
}

function createPatchFromForm(form: FormState): EntryPatch {
  return {
    ...basePatchFromForm(form),
    password: form.password || null
  };
}

function updatePatchFromForm(form: FormState): EntryPatch {
  const patch = basePatchFromForm(form);

  if (form.password) {
    patch.password = form.password;
  }

  return patch;
}

const inputClass =
  'rounded-md border border-slate-300 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';
const secondaryButtonClass =
  'rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';
const primaryButtonClass =
  'rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

export function EntryDetail({
  labels,
  entry,
  isLoading = false,
  onCopyPassword,
  onUpdateEntry,
  onDeleteEntry,
  onCreateEntry
}: EntryDetailProps) {
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>('view');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  useEffect(() => {
    if (entry) {
      setMode('view');
      setForm(formFromEntry(entry));
      setIsPasswordVisible(false);
    }
  }, [entry]);

  const updateForm = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const renderForm = () => (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (mode === 'create') {
          onCreateEntry(createPatchFromForm(form));
        } else if (entry) {
          onUpdateEntry(entry.id, updatePatchFromForm(form));
        }
        setIsPasswordVisible(false);
        setMode('view');
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        {labels.title}
        <input className={inputClass} value={form.title} onChange={(event) => updateForm('title', event.currentTarget.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        {labels.username}
        <input className={inputClass} value={form.username} onChange={(event) => updateForm('username', event.currentTarget.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        {labels.password}
        <div className="flex gap-2">
          <input
            className={`${inputClass} min-w-0 flex-1`}
            type={isPasswordVisible ? 'text' : 'password'}
            value={form.password}
            onChange={(event) => updateForm('password', event.currentTarget.value)}
          />
          <button type="button" className={secondaryButtonClass} onClick={() => setIsPasswordVisible((visible) => !visible)}>
            {isPasswordVisible ? labels.hidePassword : labels.showPassword}
          </button>
        </div>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        {labels.url}
        <input className={inputClass} value={form.url} onChange={(event) => updateForm('url', event.currentTarget.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        {labels.notes}
        <textarea className={`${inputClass} min-h-24`} value={form.notes} onChange={(event) => updateForm('notes', event.currentTarget.value)} />
      </label>

      <div className="flex gap-2">
        <button type="submit" className={primaryButtonClass}>
          {labels.save}
        </button>
        <button type="button" className={secondaryButtonClass} onClick={() => setMode('view')}>
          {labels.cancel}
        </button>
      </div>
    </form>
  );

  if (isLoading) {
    return <p className="text-sm text-slate-500">{labels.loading}</p>;
  }

  if (mode === 'create') {
    return <div className="p-4">{renderForm()}</div>;
  }

  if (!entry) {
    return (
      <div className="flex h-full flex-col items-start justify-center gap-4 p-4 text-slate-600">
        <p>{labels.empty}</p>
        <button
          type="button"
          className={primaryButtonClass}
          onClick={() => {
            setForm(emptyForm);
            setIsPasswordVisible(false);
            setMode('create');
          }}
        >
          {labels.create}
        </button>
      </div>
    );
  }

  if (mode === 'edit') {
    return <div className="p-4">{renderForm()}</div>;
  }

  return (
    <article className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{entry.title}</h2>
          <p className="text-sm text-slate-500">{entry.groupPath.join(' / ')}</p>
        </div>
        <button type="button" className={secondaryButtonClass} onClick={() => setMode('edit')}>
          {labels.edit}
        </button>
      </div>

      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="font-medium text-slate-500">{labels.username}</dt>
          <dd className="text-slate-950">{entry.username}</dd>
        </div>
        {entry.url ? (
          <div>
            <dt className="font-medium text-slate-500">{labels.url}</dt>
            <dd className="text-slate-950">{entry.url}</dd>
          </div>
        ) : null}
        <div>
          <dt className="font-medium text-slate-500">{labels.password}</dt>
          <dd className="text-slate-950">••••••••</dd>
        </div>
        {entry.notes ? (
          <div>
            <dt className="font-medium text-slate-500">{labels.notes}</dt>
            <dd className="whitespace-pre-wrap text-slate-950">{entry.notes}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-auto flex flex-wrap gap-2">
        <button type="button" className={secondaryButtonClass} onClick={() => onCopyPassword(entry.id)}>
          {labels.copyPassword}
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => {
            setForm(emptyForm);
            setIsPasswordVisible(false);
            setMode('create');
          }}
        >
          {labels.create}
        </button>
        <button
          type="button"
          className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          onClick={() => onDeleteEntry(entry.id)}
        >
          {labels.delete}
        </button>
      </div>
    </article>
  );
}
