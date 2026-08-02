import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), tailwindcss()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id: string) {
              if (
                id.includes('node_modules/@xyflow/react') ||
                /node_modules\/d3-/.test(id)
              ) {
                return 'xyflow-vendor';
              }
              return undefined;
            }
          }
        }
      },
      test: {
        environment: 'node',
        setupFiles: ['./vitest.setup.ts'],
        globals: true,
        testTimeout: 15000,
        exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**', '.claude/**'],
        coverage: {
          provider: 'v8',
          reporter: ['text', 'html', 'lcov'],
          exclude: [
            '**/node_modules/**',
            '**/dist/**',
            'e2e/**',
            '.claude/**',
            '**/*.config.ts',
            '**/*.d.ts',
            'prisma/**',
            '__tests__/**'
          ],
          thresholds: {
            lines: 52,
            statements: 50,
            functions: 50,
            branches: 42
          }
        }
      }
    };
});
