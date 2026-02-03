/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-map-gl/mapbox': path.resolve(__dirname, 'src/test/mocks/react-map-gl.ts'),
      'react-map-gl': path.resolve(__dirname, 'src/test/mocks/react-map-gl.ts'),
      'mapbox-gl/dist/mapbox-gl.css': path.resolve(__dirname, 'src/test/mocks/mapbox-gl.css.ts'),
      'mapbox-gl': path.resolve(__dirname, 'src/test/mocks/mapbox-gl.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        // Coverage thresholds - see docs/TECH_SPEC.md Section 14
        // Target is 85%, current baseline (will increase as coverage improves)
        statements: 74,
        branches: 60,
        functions: 66,
        lines: 75,
      },
    },
  },
});
