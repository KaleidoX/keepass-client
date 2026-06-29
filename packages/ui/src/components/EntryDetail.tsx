import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

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
  deleteConfirmationDescription?: (entryTitle: string) => string;
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

const fieldShellClass = 'rounded-xl border border-slate-200 bg-slate-50/70 p-3';
const fieldLabelClass = 'text-xs font-medium uppercase tracking-wide text-slate-500';
const fieldValueClass = 'mt-1 min-w-0 break-words text-sm leading-6 text-slate-950';
const formControlClass = 'h-11 bg-background text-base md:text-sm';

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

  const getDeleteConfirmationDescription = (entryTitle: string) =>
    labels.deleteConfirmationDescription?.(entryTitle) ??
    `This will permanently delete “${entryTitle}”. This action cannot be undone.`;

  const renderForm = () => {
    const formTitle = mode === 'create' ? labels.create : labels.edit;

    return (
      <Card className="min-h-full border-slate-200 bg-card/95 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-5">
          <CardTitle>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">{formTitle}</h2>
          </CardTitle>
          <CardDescription className="leading-6">{mode === 'create' ? labels.empty : entry?.groupPath.join(' / ')}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form
            className="grid gap-5"
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
            <div className="grid gap-2">
              <Label htmlFor="entry-title">{labels.title}</Label>
              <Input id="entry-title" className={formControlClass} value={form.title} onChange={(event) => updateForm('title', event.currentTarget.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="entry-username">{labels.username}</Label>
              <Input
                id="entry-username"
                className={formControlClass}
                value={form.username}
                onChange={(event) => updateForm('username', event.currentTarget.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="entry-password">{labels.password}</Label>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                <Input
                  id="entry-password"
                  className={cn(formControlClass, 'min-w-0 flex-1')}
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={form.password}
                  onChange={(event) => updateForm('password', event.currentTarget.value)}
                />
                <Button type="button" variant="outline" className="h-11 sm:min-w-32" onClick={() => setIsPasswordVisible((visible) => !visible)}>
                  {isPasswordVisible ? labels.hidePassword : labels.showPassword}
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="entry-url">{labels.url}</Label>
              <Input id="entry-url" className={formControlClass} value={form.url} onChange={(event) => updateForm('url', event.currentTarget.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="entry-notes">{labels.notes}</Label>
              <textarea
                id="entry-notes"
                className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-base leading-6 shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
                value={form.notes}
                onChange={(event) => updateForm('notes', event.currentTarget.value)}
              />
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="h-11" onClick={() => setMode('view')}>
                {labels.cancel}
              </Button>
              <Button type="submit" className="h-11 font-semibold">
                {labels.save}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Card className="border-slate-200 bg-card/95 p-6 text-sm leading-6 text-slate-500 shadow-sm">
        <p>{labels.loading}</p>
      </Card>
    );
  }

  if (mode === 'create') {
    return <div className="h-full min-h-0 overflow-auto p-3 sm:p-4">{renderForm()}</div>;
  }

  if (!entry) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-3 sm:p-4">
        <Card className="w-full max-w-lg border-slate-200 bg-card/95 text-center shadow-sm">
          <CardHeader className="gap-3">
            <CardTitle>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">{labels.empty}</h2>
            </CardTitle>
            <CardDescription className="leading-6">{labels.create}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              className="h-11 w-full sm:w-auto"
              onClick={() => {
                setForm(emptyForm);
                setIsPasswordVisible(false);
                setMode('create');
              }}
            >
              {labels.create}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === 'edit') {
    return <div className="h-full min-h-0 overflow-auto p-3 sm:p-4">{renderForm()}</div>;
  }

  return (
    <article className="flex h-full min-h-0 flex-col overflow-auto p-3 sm:p-4">
      <Card className="min-h-full border-slate-200 bg-card/95 shadow-sm">
        <CardHeader className="gap-4 border-b border-slate-100 pb-5">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <CardTitle>
                <h2 className="break-words text-2xl font-semibold tracking-tight text-slate-950">{entry.title}</h2>
              </CardTitle>
              <CardDescription className="mt-2 min-w-0 break-words leading-6">{entry.groupPath.join(' / ')}</CardDescription>
            </div>
            <Button type="button" variant="outline" className="h-11 w-full lg:w-auto" onClick={() => setMode('edit')}>
              {labels.edit}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-6 pt-6">
          <dl className="grid gap-3 md:grid-cols-2">
            <div className={fieldShellClass}>
              <dt className={fieldLabelClass}>{labels.username}</dt>
              <dd className={fieldValueClass}>{entry.username}</dd>
            </div>
            {entry.url ? (
              <div className={fieldShellClass}>
                <dt className={fieldLabelClass}>{labels.url}</dt>
                <dd className={fieldValueClass}>{entry.url}</dd>
              </div>
            ) : null}
            <div className={fieldShellClass}>
              <dt className={fieldLabelClass}>{labels.password}</dt>
              <dd className="mt-1 font-mono text-sm leading-6 tracking-[0.24em] text-slate-950">••••••••</dd>
            </div>
            {entry.notes ? (
              <div className={cn(fieldShellClass, 'md:col-span-2')}>
                <dt className={fieldLabelClass}>{labels.notes}</dt>
                <dd className={cn(fieldValueClass, 'whitespace-pre-wrap')}>{entry.notes}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <Button type="button" variant="outline" className="h-11" onClick={() => onCopyPassword(entry.id)}>
              {labels.copyPassword}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11"
              onClick={() => {
                setForm(emptyForm);
                setIsPasswordVisible(false);
                setMode('create');
              }}
            >
              {labels.create}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" className="h-11">
                  {labels.delete}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-slate-200 sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>{labels.delete}</AlertDialogTitle>
                  <AlertDialogDescription className="leading-6">{getDeleteConfirmationDescription(entry.title)}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="h-11">{labels.cancel}</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" className="h-11" onClick={() => onDeleteEntry(entry.id)}>
                    {labels.delete}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </article>
  );
}
