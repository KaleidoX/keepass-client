import { describe, expect, it } from 'vitest';
import { loadCore } from '../src/main/core';

describe('loadCore', () => {
  it('falls back to the MVP version string when addon is absent', () => {
    expect(loadCore().coreVersion()).toBe('keepass-core-mvp');
  });
});
