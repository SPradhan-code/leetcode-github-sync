import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'es2022',
    lib: {
      entry: 'src/content/index.ts',
      formats: ['iife'],
      name: 'LeetCodeSyncContent',
      fileName: () => 'content.js',
    },
  },
});