import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['playwright', 'playwright-core', 'chromium-bidi'],
    },
  },
});
