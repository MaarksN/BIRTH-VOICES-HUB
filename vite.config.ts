import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      test: {
        environment: 'node',
        setupFiles: ['./vitest.setup.ts'],
        globals: true,
        testTimeout: 15000,
        exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**', '.claude/**']
      }
    };
});
