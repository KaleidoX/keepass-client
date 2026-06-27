import { useMemo, useState } from 'react';
import { cn } from '../lib/utils';

export type EntryListItem = {
  id: string;
  title: string;
  username: string;
  url?: string | null;
  groupPath: string[];
};

export type EntryListLabels = {
  search: string;
  empty: string;
};

export type EntryListProps = {
  labels: EntryListLabels;
  entries: EntryListItem[];
  selectedEntryId: string | null;
  onSelectEntry: (entryId: string) => void;
};

export function EntryList({ labels, entries, selectedEntryId, onSelectEntry }: EntryListProps) {
  const [query, setQuery] = useState('');
  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return entries;
    }

    return entries.filter((entry) =>
      [entry.title, entry.username, entry.url ?? '', entry.groupPath.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [entries, query]);
  const selectedEntryVisible = filteredEntries.some((entry) => entry.id === selectedEntryId);
  const selectedOptionId = selectedEntryId && selectedEntryVisible ? `entry-option-${selectedEntryId}` : undefined;

  const selectByOffset = (offset: number) => {
    if (filteredEntries.length === 0) {
      return;
    }

    const currentIndex = filteredEntries.findIndex((entry) => entry.id === selectedEntryId);
    const nextIndex =
      currentIndex === -1
        ? offset < 0
          ? filteredEntries.length - 1
          : 0
        : Math.min(filteredEntries.length - 1, Math.max(0, currentIndex + offset));
    onSelectEntry(filteredEntries[nextIndex].id);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <input
        aria-label={`${labels.search} input`}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        placeholder={labels.search}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />

      <div
        role="listbox"
        aria-label={labels.search}
        aria-activedescendant={selectedOptionId}
        className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            selectByOffset(1);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            selectByOffset(-1);
          } else if (event.key === 'Home') {
            event.preventDefault();
            if (filteredEntries[0]) {
              onSelectEntry(filteredEntries[0].id);
            }
          } else if (event.key === 'End') {
            event.preventDefault();
            const lastEntry = filteredEntries[filteredEntries.length - 1];
            if (lastEntry) {
              onSelectEntry(lastEntry.id);
            }
          }
        }}
      >
        {filteredEntries.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-500">{labels.empty}</p>
        ) : (
          filteredEntries.map((entry) => (
            <button
              key={entry.id}
              id={`entry-option-${entry.id}`}
              type="button"
              role="option"
              aria-selected={entry.id === selectedEntryId}
              tabIndex={-1}
              className={cn(
                'flex w-full flex-col items-start gap-0.5 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50',
                entry.id === selectedEntryId && 'bg-blue-50 text-blue-950'
              )}
              onClick={() => onSelectEntry(entry.id)}
            >
              <span className="font-medium">{entry.title}</span>
              <span className="text-xs text-slate-500">{entry.username}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
