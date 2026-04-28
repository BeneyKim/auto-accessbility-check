import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    crx({ manifest }),
  ],
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
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: false, // ACE 엔진(ace.js)이 minify 될 때 구문 오류가 발생하는 문제 방지
    chunkSizeWarningLimit: 1000,
  },
});
