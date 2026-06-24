import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export interface NativeCore {
  coreVersion(): string;
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
