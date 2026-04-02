import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Content hashes in filenames ensure browsers always fetch the latest version
        // When code changes, the hash changes, busting the cache automatically
        entryFileNames: 'assets/email-shop-[hash].js',
        chunkFileNames: 'assets/email-shop-[name]-[hash].js',
        assetFileNames: 'assets/email-shop-[name]-[hash][extname]',
      },
    },
  },
  base: '/email-shop/dist/',
});
