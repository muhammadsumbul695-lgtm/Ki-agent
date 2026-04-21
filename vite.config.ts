import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import webExtension from 'vite-plugin-web-extension';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    webExtension({
      manifest: path.resolve(__dirname, 'manifest.json'),
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
});
