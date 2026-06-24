import { contextBridge, ipcRenderer } from 'electron';
import type { EntryPatch, KeePassAPI } from './types';

export function createKeePassAPI(): KeePassAPI {
  return {
    getCoreVersion: () => ipcRenderer.invoke('keepass:getCoreVersion'),
    chooseDatabaseFile: () => ipcRenderer.invoke('keepass:chooseDatabaseFile'),
    openDatabase: (databasePath: string, password: string) => ipcRenderer.invoke('keepass:openDatabase', databasePath, password),
    getEntry: (databaseId: string, entryId: string) => ipcRenderer.invoke('keepass:getEntry', databaseId, entryId),
    updateEntry: (databaseId: string, entryId: string, patch: EntryPatch) =>
      ipcRenderer.invoke('keepass:updateEntry', databaseId, entryId, patch),
    createEntry: (databaseId: string, patch: EntryPatch) => ipcRenderer.invoke('keepass:createEntry', databaseId, patch),
    deleteEntry: (databaseId: string, entryId: string) => ipcRenderer.invoke('keepass:deleteEntry', databaseId, entryId),
    saveDatabase: (databaseId: string) => ipcRenderer.invoke('keepass:saveDatabase', databaseId),
    copyPassword: (databaseId: string, entryId: string) => ipcRenderer.invoke('keepass:copyPassword', databaseId, entryId)
  };
}

contextBridge.exposeInMainWorld('keepassAPI', createKeePassAPI());
