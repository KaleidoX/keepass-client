import { describe, expect, it, vi } from 'vitest';
import type { NativeCore } from '../src/main/core';
import { closeAllDatabasesForQuit, registerAppLifecycleHandlers } from '../src/main/lifecycle';

describe('main lifecycle handlers', () => {
  it('registers a will-quit cleanup handler', () => {
    const app = { on: vi.fn() };
    const closeAllDatabases = vi.fn(() => 2);
    const core: NativeCore = {
      coreVersion: () => 'test-core',
      closeAllDatabases
    };

    registerAppLifecycleHandlers(app, core);

    expect(app.on).toHaveBeenCalledWith('will-quit', expect.any(Function));
    const handler = app.on.mock.calls[0][1] as () => void;
    handler();
    expect(closeAllDatabases).toHaveBeenCalledTimes(1);
  });

  it('closes all database sessions during quit when the native core supports it', () => {
    const closeAllDatabases = vi.fn(() => 2);
    const core: NativeCore = {
      coreVersion: () => 'test-core',
      closeAllDatabases
    };

    closeAllDatabasesForQuit(core);

    expect(closeAllDatabases).toHaveBeenCalledTimes(1);
  });

  it('does nothing during quit when the native core has no closeAllDatabases operation', () => {
    const core: NativeCore = { coreVersion: () => 'test-core' };

    expect(() => closeAllDatabasesForQuit(core)).not.toThrow();
  });
});
