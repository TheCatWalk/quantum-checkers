import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@core':     resolve(__dirname, 'src/core'),
      '@config':   resolve(__dirname, 'src/config'),
      '@services': resolve(__dirname, 'src/services'),
      '@ui':       resolve(__dirname, 'src/ui'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
