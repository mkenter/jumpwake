import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        test: {
          name: 'engine',
          environment: 'node',
          include: ['src/engine/**/*.test.ts', 'src/rules/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/engine/**', 'src/rules/**'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
});
