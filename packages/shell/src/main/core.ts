import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

import type { EntryDetailData, EntryPatch, OpenDatabaseResult } from '../preload/types';

export interface NativeCore {
  coreVersion(): string;
  openDatabase?(databasePath: string, password: string): OpenDatabaseResult | Promise<OpenDatabaseResult>;
  getEntry?(databaseId: string, entryId: string): EntryDetailData | Promise<EntryDetailData>;
  updateEntry?(databaseId: string, entryId: string, patch: EntryPatch): EntryDetailData | Promise<EntryDetailData>;
  createEntry?(databaseId: string, patch: EntryPatch): EntryDetailData | Promise<EntryDetailData>;
  deleteEntry?(databaseId: string, entryId: string): void | Promise<void>;
  saveDatabase?(databaseId: string): void | Promise<void>;
  getEntryPassword?(databaseId: string, entryId: string): string | Promise<string>;
}

export function loadCore(): NativeCore {
  try {
    return require('../../../core/target/debug/keepass_core.node') as NativeCore;
  } catch {
    return {
      coreVersion: () => 'keepass-core-mvp'
    };
  }
}
