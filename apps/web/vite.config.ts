import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/packages/content/src/packs/') || id.includes('/packages/content/src/business-core.ts') || id.includes('/packages/content/src/words.ts')) return 'vocabulary';
        },
      },
    },
  },
});
