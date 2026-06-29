import { useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import { Card } from './ui/card';
import { Input } from './ui/input';

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
      <div className="rounded-xl border border-slate-200 bg-white/80 p-2 shadow-sm">
        <Input
          aria-label={`${labels.search} input`}
          className="h-11 border-slate-200 bg-slate-50/80 text-base shadow-none placeholder:text-slate-500 md:text-sm"
          placeholder={labels.search}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </div>

      <Card
        role="listbox"
        aria-label={labels.search}
        aria-activedescendant={selectedOptionId}
        className="min-h-0 flex-1 gap-1 overflow-auto border-slate-200 bg-white/90 p-1 shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
          <p className="rounded-lg px-3 py-6 text-sm leading-6 text-slate-500">{labels.empty}</p>
        ) : (
          filteredEntries.map((entry) => {
            const isSelected = entry.id === selectedEntryId;

            return (
              <button
                key={entry.id}
                id={`entry-option-${entry.id}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                className={cn(
                  'group relative flex min-h-14 w-full min-w-0 flex-col items-start gap-1 rounded-lg border border-transparent px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  isSelected && 'border-slate-300 bg-slate-100 text-slate-950 shadow-xs'
                )}
                onClick={() => onSelectEntry(entry.id)}
              >
                <span
                  className={cn(
                    'absolute inset-y-2 left-1 w-1 rounded-full bg-transparent',
                    isSelected && 'bg-slate-900'
                  )}
                  aria-hidden="true"
                />
                <span className="w-full min-w-0 truncate pl-2 font-medium leading-5 text-slate-950">{entry.title}</span>
                <span className="w-full min-w-0 truncate pl-2 text-xs leading-4 text-slate-500">{entry.username}</span>
                {entry.url ? <span className="w-full min-w-0 truncate pl-2 text-xs leading-4 text-slate-400">{entry.url}</span> : null}
              </button>
            );
          })
        )}
      </Card>
    </div>
  );
}
