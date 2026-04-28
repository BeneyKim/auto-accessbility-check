import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@engine': path.resolve(__dirname, 'src/engine'),
      '@crawler': path.resolve(__dirname, 'src/crawler'),
      '@filter': path.resolve(__dirname, 'src/filter'),
      '@reporter': path.resolve(__dirname, 'src/reporter'),
    },
  },
});
