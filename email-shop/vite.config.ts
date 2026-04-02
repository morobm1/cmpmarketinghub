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
        // Stable filenames so creative_studio.html can reference them directly.
        // Cache-busting is handled by HTTP headers (no-cache, must-revalidate)
        // which forces browsers to revalidate on every page load via ETag/304.
        entryFileNames: 'assets/email-shop.js',
        chunkFileNames: 'assets/email-shop-[name].js',
        assetFileNames: 'assets/email-shop-[name][extname]',
      },
    },
  },
  base: '/email-shop/dist/',
});
