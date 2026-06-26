import type { NativeCore } from './core';

export type AppLifecycleTarget = {
  on(event: 'will-quit', listener: () => void): void;
};

export function closeAllDatabasesForQuit(core: NativeCore): void {
  const closeAllDatabases = core.closeAllDatabases;
  if (!closeAllDatabases) {
    return;
  }

  try {
    closeAllDatabases.call(core);
  } catch (error) {
    console.warn('Failed to close KeePass database sessions during quit', error);
  }
}

export function registerAppLifecycleHandlers(app: AppLifecycleTarget, core: NativeCore): void {
  app.on('will-quit', () => closeAllDatabasesForQuit(core));
}
