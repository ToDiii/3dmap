import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['vitest.setup.ts'],
    deps: {
      inline: ['three', 'three/examples/jsm/utils/BufferGeometryUtils.js'],
    },
  }
});
