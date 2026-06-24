import type { IpcMainInvokeEvent } from 'electron';
import type { NativeCore } from '../core';
import type { EntryDetailData, EntryPatch, OpenDatabaseResult } from '../../preload/types';

type DialogService = {
  showOpenDialog(options: {
    properties: ['openFile'];
    filters: { name: string; extensions: string[] }[];
  }): Promise<{ canceled: boolean; filePaths: string[] }>;
};

type ClipboardService = {
  writeText(text: string): void;
};

type IpcMainService = {
  handle(channel: string, listener: (...args: never[]) => unknown): void;
};

type DatabaseHandlerDependencies = {
  core: NativeCore;
  dialog: DialogService;
  clipboard: ClipboardService;
};

type DatabaseHandlers = {
  'keepass:getCoreVersion': () => Promise<string>;
  'keepass:chooseDatabaseFile': () => Promise<string | null>;
  'keepass:openDatabase': (_event: IpcMainInvokeEvent, databasePath: string, password: string) => Promise<OpenDatabaseResult>;
  'keepass:getEntry': (_event: IpcMainInvokeEvent, databaseId: string, entryId: string) => Promise<EntryDetailData>;
  'keepass:updateEntry': (
    _event: IpcMainInvokeEvent,
    databaseId: string,
    entryId: string,
    patch: EntryPatch
  ) => Promise<EntryDetailData>;
  'keepass:createEntry': (_event: IpcMainInvokeEvent, databaseId: string, patch: EntryPatch) => Promise<EntryDetailData>;
  'keepass:deleteEntry': (_event: IpcMainInvokeEvent, databaseId: string, entryId: string) => Promise<void>;
  'keepass:saveDatabase': (_event: IpcMainInvokeEvent, databaseId: string) => Promise<void>;
  'keepass:copyPassword': (_event: IpcMainInvokeEvent, databaseId: string, entryId: string) => Promise<void>;
};

function requireCoreOperation<OperationName extends keyof NativeCore>(
  core: NativeCore,
  operationName: OperationName
): NonNullable<NativeCore[OperationName]> {
  const operation = core[operationName];

  if (typeof operation !== 'function') {
    throw new Error(`Native core does not provide ${String(operationName)}`);
  }

  return operation;
}

export function createDatabaseHandlers({ core, dialog, clipboard }: DatabaseHandlerDependencies): DatabaseHandlers {
  return {
    'keepass:getCoreVersion': async () => core.coreVersion(),
    'keepass:chooseDatabaseFile': async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'KeePass Database', extensions: ['kdbx'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled) {
        return null;
      }

      return result.filePaths[0] ?? null;
    },
    'keepass:openDatabase': async (_event, databasePath, password) => {
      const openDatabase = requireCoreOperation(core, 'openDatabase');
      return openDatabase.call(core, databasePath, password);
    },
    'keepass:getEntry': async (_event, databaseId, entryId) => {
      const getEntry = requireCoreOperation(core, 'getEntry');
      return getEntry.call(core, databaseId, entryId);
    },
    'keepass:updateEntry': async (_event, databaseId, entryId, patch) => {
      const updateEntry = requireCoreOperation(core, 'updateEntry');
      return updateEntry.call(core, databaseId, entryId, patch);
    },
    'keepass:createEntry': async (_event, databaseId, patch) => {
      const createEntry = requireCoreOperation(core, 'createEntry');
      return createEntry.call(core, databaseId, patch);
    },
    'keepass:deleteEntry': async (_event, databaseId, entryId) => {
      const deleteEntry = requireCoreOperation(core, 'deleteEntry');
      await deleteEntry.call(core, databaseId, entryId);
    },
    'keepass:saveDatabase': async (_event, databaseId) => {
      const saveDatabase = requireCoreOperation(core, 'saveDatabase');
      await saveDatabase.call(core, databaseId);
    },
    'keepass:copyPassword': async (_event, databaseId, entryId) => {
      const getEntryPassword = requireCoreOperation(core, 'getEntryPassword');
      const password = await getEntryPassword.call(core, databaseId, entryId);
      clipboard.writeText(password);
    }
  };
}

export function registerDatabaseHandlers(ipcMain: IpcMainService, dependencies: DatabaseHandlerDependencies) {
  const handlers = createDatabaseHandlers(dependencies);

  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, handler as (...args: never[]) => unknown);
  }
}
