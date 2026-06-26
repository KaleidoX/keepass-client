import { describe, expect, it, vi } from 'vitest';
import type { KeePassAPI } from '../src/preload/types';

const invoke = vi.fn();
const exposeInMainWorld = vi.fn();

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld
  },
  ipcRenderer: {
    invoke
  }
}));

describe('KeePassAPI contract', () => {
  it('exposes the desktop operations used by the renderer', async () => {
    const { createKeePassAPI } = await import('../src/preload/index');

    const methodNames = [
      'getCoreVersion',
      'chooseDatabaseFile',
      'openDatabase',
      'getEntry',
      'updateEntry',
      'createEntry',
      'deleteEntry',
      'saveDatabase',
      'copyPassword',
      'closeDatabase'
    ] as const satisfies readonly (keyof KeePassAPI)[];

    const api = createKeePassAPI();

    expect(Object.keys(api)).toEqual(methodNames);
    expect(exposeInMainWorld).toHaveBeenCalledWith('keepassAPI', expect.any(Object));

    invoke.mockImplementation((channel: string) => {
      switch (channel) {
        case 'keepass:getCoreVersion':
          return Promise.resolve('keepass-core-mvp');
        case 'keepass:chooseDatabaseFile':
          return Promise.resolve('/tmp/test.kdbx');
        case 'keepass:openDatabase':
          return Promise.resolve({ databaseId: 'db-1', entries: [] });
        case 'keepass:getEntry':
          return Promise.resolve({
            id: 'entry-1',
            title: 'Entry',
            username: 'user',
            url: null,
            notes: null,
            groupPath: []
          });
        case 'keepass:updateEntry':
          return Promise.resolve({
            id: 'entry-1',
            title: 'Updated entry',
            username: 'user',
            url: null,
            notes: null,
            groupPath: []
          });
        case 'keepass:createEntry':
          return Promise.resolve({
            id: 'entry-2',
            title: 'New entry',
            username: 'user',
            url: null,
            notes: null,
            groupPath: []
          });
        case 'keepass:deleteEntry':
        case 'keepass:saveDatabase':
        case 'keepass:copyPassword':
        case 'keepass:closeDatabase':
          return Promise.resolve();
        default:
          throw new Error(`Unexpected channel: ${channel}`);
      }
    });

    await expect(api.getCoreVersion()).resolves.toBe('keepass-core-mvp');
    await expect(api.chooseDatabaseFile()).resolves.toBe('/tmp/test.kdbx');
    await expect(api.openDatabase('database.kdbx', 'password')).resolves.toEqual({
      databaseId: 'db-1',
      entries: []
    });
    await expect(api.getEntry('db-1', 'entry-1')).resolves.toMatchObject({ id: 'entry-1' });
    await expect(api.updateEntry('db-1', 'entry-1', { title: 'Updated entry', username: 'user' })).resolves.toMatchObject({
      title: 'Updated entry'
    });
    await expect(api.createEntry('db-1', { title: 'New entry', username: 'user' })).resolves.toMatchObject({
      id: 'entry-2'
    });
    await expect(api.deleteEntry('db-1', 'entry-1')).resolves.toBeUndefined();
    await expect(api.saveDatabase('db-1')).resolves.toBeUndefined();
    await expect(api.copyPassword('db-1', 'entry-1')).resolves.toBeUndefined();
    await expect(api.closeDatabase('db-1')).resolves.toBeUndefined();

    expect(invoke.mock.calls).toEqual([
      ['keepass:getCoreVersion'],
      ['keepass:chooseDatabaseFile'],
      ['keepass:openDatabase', 'database.kdbx', 'password'],
      ['keepass:getEntry', 'db-1', 'entry-1'],
      ['keepass:updateEntry', 'db-1', 'entry-1', { title: 'Updated entry', username: 'user' }],
      ['keepass:createEntry', 'db-1', { title: 'New entry', username: 'user' }],
      ['keepass:deleteEntry', 'db-1', 'entry-1'],
      ['keepass:saveDatabase', 'db-1'],
      ['keepass:copyPassword', 'db-1', 'entry-1'],
      ['keepass:closeDatabase', 'db-1']
    ]);
  });
});
