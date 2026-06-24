import { describe, expect, it } from 'vitest';
import type { KeePassAPI } from './api';
import { createKeePassAPIMock } from './api.mock';

describe('KeePassAPI contract', () => {
  it('mock bridge satisfies the renderer API shape', () => {
    const api: KeePassAPI = createKeePassAPIMock();

    expect(api.getCoreVersion).toBeTypeOf('function');
    expect(api.chooseDatabaseFile).toBeTypeOf('function');
    expect(api.openDatabase).toBeTypeOf('function');
    expect(api.getEntry).toBeTypeOf('function');
    expect(api.updateEntry).toBeTypeOf('function');
    expect(api.createEntry).toBeTypeOf('function');
    expect(api.deleteEntry).toBeTypeOf('function');
    expect(api.saveDatabase).toBeTypeOf('function');
    expect(api.copyPassword).toBeTypeOf('function');
  });
});
