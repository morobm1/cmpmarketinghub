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
        entryFileNames: 'assets/email-shop.js',
        chunkFileNames: 'assets/email-shop-[name].js',
        assetFileNames: 'assets/email-shop-[name][extname]',
      },
    },
  },
  base: '/email-shop/dist/',
});
