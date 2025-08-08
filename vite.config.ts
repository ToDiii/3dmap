import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: {
    include: ['three', 'three/examples/jsm/utils/BufferGeometryUtils.js'],
  },
  ssr: {
    noExternal: ['three'],
  },
});
