import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentType } from 'react';
import { describe, expect, it, vi } from 'vitest';
import * as UI from '../index';

type UnlockFormProps = {
  labels: {
    title: string;
    databasePath: string;
    chooseFile: string;
    password: string;
    submit: string;
    loading: string;
  };
  selectedPath: string | null;
  isLoading?: boolean;
  error?: string | null;
  onChooseFile: () => void;
  onSubmit: (password: string) => void;
};

type EntryListItem = {
  id: string;
  title: string;
  username: string;
  url?: string | null;
  groupPath: string[];
};

type EntryListProps = {
  labels: {
    search: string;
    empty: string;
  };
  entries: EntryListItem[];
  selectedEntryId: string | null;
  onSelectEntry: (entryId: string) => void;
};

type EntryDetailData = {
  id: string;
  title: string;
  username: string;
  url?: string | null;
  notes?: string | null;
  groupPath: string[];
};

type EntryPatch = {
  title: string;
  username: string;
  password?: string | null;
  url?: string | null;
  notes?: string | null;
};

type EntryDetailProps = {
  labels: {
    empty: string;
    title: string;
    username: string;
    password: string;
    url: string;
    notes: string;
    edit: string;
    save: string;
    cancel: string;
    copyPassword: string;
    delete: string;
    create: string;
    loading: string;
    showPassword: string;
    hidePassword: string;
  };
  entry: EntryDetailData | null;
  isLoading?: boolean;
  onCopyPassword: (entryId: string) => void;
  onUpdateEntry: (entryId: string, patch: EntryPatch) => void;
  onDeleteEntry: (entryId: string) => void;
  onCreateEntry: (patch: EntryPatch) => void;
};

const UnlockForm = (UI as typeof UI & { UnlockForm: ComponentType<UnlockFormProps> }).UnlockForm;
const EntryList = (UI as typeof UI & { EntryList: ComponentType<EntryListProps> }).EntryList;
const EntryDetail = (UI as typeof UI & { EntryDetail: ComponentType<EntryDetailProps> }).EntryDetail;

const unlockLabels = {
  title: 'Unlock database',
  databasePath: 'Database file',
  chooseFile: 'Choose file',
  password: 'Master password',
  submit: 'Unlock',
  loading: 'Unlocking…'
};

const detailLabels = {
  empty: 'Select an entry',
  title: 'Title',
  username: 'Username',
  password: 'Password',
  url: 'URL',
  notes: 'Notes',
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
  copyPassword: 'Copy password',
  delete: 'Delete',
  create: 'New entry',
  loading: 'Loading details…',
  showPassword: 'Show password',
  hidePassword: 'Hide password'
};

const entries: EntryListItem[] = [
  { id: 'entry-1', title: 'Email', username: 'alice', url: 'https://mail.example', groupPath: ['Root'] },
  { id: 'entry-2', title: 'GitHub', username: 'octo', url: 'https://github.com', groupPath: ['Root', 'Dev'] }
];

describe('UnlockForm contract', () => {
  it('uses prop labels and callbacks without i18n or API runtime bindings', async () => {
    const user = userEvent.setup();
    const onChooseFile = vi.fn();
    const onSubmit = vi.fn();

    render(
      <UnlockForm
        labels={unlockLabels}
        selectedPath="/vaults/main.kdbx"
        onChooseFile={onChooseFile}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByRole('heading', { name: 'Unlock database' })).toBeInTheDocument();
    expect(screen.getByText('/vaults/main.kdbx')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Choose file' }));
    await user.type(screen.getByLabelText('Master password'), 'correct horse battery staple');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));

    expect(onChooseFile).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('correct horse battery staple');
  });

  it('disables file selection and submit while loading', () => {
    render(
      <UnlockForm
        labels={unlockLabels}
        selectedPath={null}
        isLoading
        onChooseFile={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Choose file' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Unlocking…' })).toBeDisabled();
  });
});

describe('EntryList contract', () => {
  it('renders compact rows and reports selected entries by id', async () => {
    const user = userEvent.setup();
    const onSelectEntry = vi.fn();

    render(
      <EntryList
        labels={{ search: 'Search entries', empty: 'No entries' }}
        entries={entries}
        selectedEntryId="entry-1"
        onSelectEntry={onSelectEntry}
      />
    );

    expect(screen.getByRole('option', { name: /Email alice/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: /GitHub octo/ })).toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: /GitHub octo/ }));

    expect(onSelectEntry).toHaveBeenCalledWith('entry-2');
  });

  it('supports ArrowUp ArrowDown Home and End keyboard navigation', () => {
    const onSelectEntry = vi.fn();

    render(
      <EntryList
        labels={{ search: 'Search entries', empty: 'No entries' }}
        entries={entries}
        selectedEntryId="entry-1"
        onSelectEntry={onSelectEntry}
      />
    );

    const list = screen.getByRole('listbox', { name: 'Search entries' });

    expect(list).toHaveAttribute('aria-activedescendant', 'entry-option-entry-1');
    expect(screen.getByRole('option', { name: /Email alice/ })).not.toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'ArrowUp' });
    fireEvent.keyDown(list, { key: 'End' });
    fireEvent.keyDown(list, { key: 'Home' });

    expect(onSelectEntry).toHaveBeenNthCalledWith(1, 'entry-2');
    expect(onSelectEntry).toHaveBeenNthCalledWith(2, 'entry-1');
    expect(onSelectEntry).toHaveBeenNthCalledWith(3, 'entry-2');
    expect(onSelectEntry).toHaveBeenNthCalledWith(4, 'entry-1');
  });

  it('selects the first visible entry on ArrowDown when nothing is selected', () => {
    const onSelectEntry = vi.fn();

    render(
      <EntryList
        labels={{ search: 'Search entries', empty: 'No entries' }}
        entries={entries}
        selectedEntryId={null}
        onSelectEntry={onSelectEntry}
      />
    );

    fireEvent.keyDown(screen.getByRole('listbox', { name: 'Search entries' }), { key: 'ArrowDown' });

    expect(onSelectEntry).toHaveBeenCalledWith('entry-1');
  });

  it('clears active descendant when the selected entry is filtered out', async () => {
    const user = userEvent.setup();

    render(
      <EntryList
        labels={{ search: 'Search entries', empty: 'No entries' }}
        entries={entries}
        selectedEntryId="entry-1"
        onSelectEntry={vi.fn()}
      />
    );

    await user.type(screen.getByRole('searchbox', { name: 'Search entries input' }), 'GitHub');

    expect(screen.getByRole('option', { name: /GitHub octo/ })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'Search entries' })).not.toHaveAttribute('aria-activedescendant');
  });
});

describe('EntryDetail contract', () => {
  const entry: EntryDetailData = {
    id: 'entry-1',
    title: 'Email',
    username: 'alice',
    url: 'https://mail.example',
    notes: 'Recovery codes in safe',
    groupPath: ['Root']
  };

  it('renders an empty state when no entry is selected', () => {
    render(
      <EntryDetail
        labels={detailLabels}
        entry={null}
        onCopyPassword={vi.fn()}
        onUpdateEntry={vi.fn()}
        onDeleteEntry={vi.fn()}
        onCreateEntry={vi.fn()}
      />
    );

    expect(screen.getByText('Select an entry')).toBeInTheDocument();
  });

  it('calls field actions with ids and patches supplied by the renderer', async () => {
    const user = userEvent.setup();
    const onCopyPassword = vi.fn();
    const onUpdateEntry = vi.fn();
    const onDeleteEntry = vi.fn();

    render(
      <EntryDetail
        labels={detailLabels}
        entry={entry}
        onCopyPassword={onCopyPassword}
        onUpdateEntry={onUpdateEntry}
        onDeleteEntry={onDeleteEntry}
        onCreateEntry={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Copy password' }));
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Personal email');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onCopyPassword).toHaveBeenCalledWith('entry-1');
    expect(onUpdateEntry).toHaveBeenCalledWith('entry-1', expect.objectContaining({ title: 'Personal email' }));
    expect(onDeleteEntry).toHaveBeenCalledWith('entry-1');
  });

  it('omits password when editing an existing entry without a new password', async () => {
    const user = userEvent.setup();
    const onUpdateEntry = vi.fn();

    render(
      <EntryDetail
        labels={detailLabels}
        entry={entry}
        onCopyPassword={vi.fn()}
        onUpdateEntry={onUpdateEntry}
        onDeleteEntry={vi.fn()}
        onCreateEntry={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Personal email');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const [, patch] = onUpdateEntry.mock.calls[0];
    expect(patch).not.toHaveProperty('password');
  });

  it('keeps view-mode password opaque and toggles only the local form password field visibility', async () => {
    const user = userEvent.setup();

    render(
      <EntryDetail
        labels={detailLabels}
        entry={entry}
        onCopyPassword={vi.fn()}
        onUpdateEntry={vi.fn()}
        onDeleteEntry={vi.fn()}
        onCreateEntry={vi.fn()}
      />
    );

    expect(screen.getByText('••••••••')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show password' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('uses localized loading text from labels', () => {
    render(
      <EntryDetail
        labels={detailLabels}
        entry={entry}
        isLoading
        onCopyPassword={vi.fn()}
        onUpdateEntry={vi.fn()}
        onDeleteEntry={vi.fn()}
        onCreateEntry={vi.fn()}
      />
    );

    expect(screen.getByText('Loading details…')).toBeInTheDocument();
  });

  it('calls create with a patch and never requires plaintext password state from a store', async () => {
    const user = userEvent.setup();
    const onCreateEntry = vi.fn();

    render(
      <EntryDetail
        labels={detailLabels}
        entry={null}
        onCopyPassword={vi.fn()}
        onUpdateEntry={vi.fn()}
        onDeleteEntry={vi.fn()}
        onCreateEntry={onCreateEntry}
      />
    );

    await user.click(screen.getByRole('button', { name: 'New entry' }));
    await user.type(screen.getByLabelText('Title'), 'New login');
    await user.type(screen.getByLabelText('Username'), 'new-user');
    await user.type(screen.getByLabelText('Password'), 'one-time-secret');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onCreateEntry).toHaveBeenCalledWith({
      title: 'New login',
      username: 'new-user',
      password: 'one-time-secret',
      url: null,
      notes: null
    });
  });
});
