import { defineConfig } from 'electron-vite';

export default defineConfig({
  main: {
    entry: 'src/main/index.ts'
  },
  preload: {
    input: 'src/preload/index.ts'
  }
});
