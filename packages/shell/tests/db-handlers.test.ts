import { describe, expect, it, vi } from 'vitest';
import { createDatabaseHandlers, registerDatabaseHandlers } from '../src/main/handlers/db';
import type { NativeCore } from '../src/main/core';

describe('database IPC handlers', () => {
  it('throws a clear error when the native core lacks an operation', async () => {
    const handlers = createDatabaseHandlers({
      core: {
        coreVersion: () => '2.0.0-test'
      },
      dialog: {
        showOpenDialog: vi.fn()
      },
      clipboard: {
        writeText: vi.fn()
      }
    });

    await expect(handlers['keepass:openDatabase']({}, 'database.kdbx', 'password')).rejects.toThrow(
      'Native core does not provide openDatabase'
    );
  });

  it('throws a clear error when copy password lacks getEntryPassword', async () => {
    const handlers = createDatabaseHandlers({
      core: {
        coreVersion: () => '2.0.0-test'
      },
      dialog: {
        showOpenDialog: vi.fn()
      },
      clipboard: {
        writeText: vi.fn()
      }
    });

    await expect(handlers['keepass:copyPassword']({}, 'db-1', 'entry-1')).rejects.toThrow(
      'Native core does not provide getEntryPassword'
    );
  });

  it('create handlers that delegate to the native core and shell services', async () => {
    const showOpenDialog = vi.fn().mockResolvedValue({
      canceled: false,
      filePaths: ['/tmp/example.kdbx']
    });
    const writeText = vi.fn();

    const core: NativeCore = {
      coreVersion: () => '2.0.0-test',
      openDatabase: async (databasePath: string, password: string) => ({
        databaseId: `db:${databasePath}:${password}`,
        entries: []
      }),
      getEntry: async (databaseId: string, entryId: string) => ({
        id: entryId,
        title: `${databaseId}-${entryId}`,
        username: 'user',
        url: null,
        notes: null,
        groupPath: ['General']
      }),
      updateEntry: async (_databaseId: string, entryId: string) => ({
        id: entryId,
        title: 'updated',
        username: 'user',
        url: null,
        notes: null,
        groupPath: ['General']
      }),
      createEntry: async (_databaseId: string) => ({
        id: 'created-entry',
        title: 'created',
        username: 'user',
        url: null,
        notes: null,
        groupPath: ['General']
      }),
      deleteEntry: async () => {},
      saveDatabase: async () => {},
      getEntryPassword: async () => 'super-secret'
    };

    const handlers = createDatabaseHandlers({
      core,
      dialog: { showOpenDialog },
      clipboard: { writeText }
    });

    expect(Object.keys(handlers)).toEqual([
      'keepass:getCoreVersion',
      'keepass:chooseDatabaseFile',
      'keepass:openDatabase',
      'keepass:getEntry',
      'keepass:updateEntry',
      'keepass:createEntry',
      'keepass:deleteEntry',
      'keepass:saveDatabase',
      'keepass:copyPassword'
    ]);

    await expect(handlers['keepass:getCoreVersion']()).resolves.toBe('2.0.0-test');
    await expect(handlers['keepass:chooseDatabaseFile']()).resolves.toBe('/tmp/example.kdbx');
    await expect(handlers['keepass:openDatabase']({}, 'database.kdbx', 'password')).resolves.toEqual({
      databaseId: 'db:database.kdbx:password',
      entries: []
    });
    await expect(handlers['keepass:getEntry']({}, 'db-1', 'entry-1')).resolves.toMatchObject({
      id: 'entry-1'
    });
    await expect(handlers['keepass:updateEntry']({}, 'db-1', 'entry-1', { title: 'updated', username: 'user' })).resolves.toMatchObject({
      title: 'updated'
    });
    await expect(handlers['keepass:createEntry']({}, 'db-1', { title: 'created', username: 'user' })).resolves.toMatchObject({
      id: 'created-entry'
    });
    await expect(handlers['keepass:deleteEntry']({}, 'db-1', 'entry-1')).resolves.toBeUndefined();
    await expect(handlers['keepass:saveDatabase']({}, 'db-1')).resolves.toBeUndefined();
    await expect(handlers['keepass:copyPassword']({}, 'db-1', 'entry-1')).resolves.toBeUndefined();

    expect(showOpenDialog).toHaveBeenCalledWith({
      properties: ['openFile'],
      filters: [
        { name: 'KeePass Database', extensions: ['kdbx'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    expect(writeText).toHaveBeenCalledWith('super-secret');
  });

  it('registers each handler on ipcMain', () => {
    const handle = vi.fn();

    registerDatabaseHandlers({ handle }, {
      core: {
        coreVersion: () => '2.0.0-test',
        chooseDatabaseFile: async () => null,
        openDatabase: async () => ({ databaseId: 'db', entries: [] }),
        getEntry: async () => ({
          id: 'entry',
          title: 'title',
          username: 'user',
          url: null,
          notes: null,
          groupPath: []
        }),
        updateEntry: async () => ({
          id: 'entry',
          title: 'title',
          username: 'user',
          url: null,
          notes: null,
          groupPath: []
        }),
        createEntry: async () => ({
          id: 'entry',
          title: 'title',
          username: 'user',
          url: null,
          notes: null,
          groupPath: []
        }),
        deleteEntry: async () => {},
        saveDatabase: async () => {},
        getEntryPassword: async () => 'password'
      },
      dialog: {
        showOpenDialog: vi.fn()
      },
      clipboard: {
        writeText: vi.fn()
      }
    });

    expect(handle).toHaveBeenCalledTimes(9);
    expect(handle.mock.calls.map(([channel]) => channel)).toEqual([
      'keepass:getCoreVersion',
      'keepass:chooseDatabaseFile',
      'keepass:openDatabase',
      'keepass:getEntry',
      'keepass:updateEntry',
      'keepass:createEntry',
      'keepass:deleteEntry',
      'keepass:saveDatabase',
      'keepass:copyPassword'
    ]);
  });
});
