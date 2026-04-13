import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const localeMatch = id.match(/[\\/]i18n[\\/]locales[\\/](.+)\.json$/);
          if (localeMatch) {
            return `locale-${localeMatch[1].replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          }
          if (/(?:^|[\\/])(store|firebase|league|runtimeConfig|utils|devTestApi)\.ts$/.test(id)) return 'game-core';
          if (/[\\/]components[\\/]/.test(id)) return 'ui-shell';
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('firebase')) return 'firebase';
          if (id.includes('react')) return 'react-vendor';
          if (id.includes('lucide-react')) return 'ui-icons';
          if (id.includes('canvas-confetti')) return 'effects';
          return 'vendor';
        },
      },
    },
  },
});
