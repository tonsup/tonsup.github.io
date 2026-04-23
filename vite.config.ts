import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Deployed to https://tonsup.github.io/  → root path
// If you rename the repo to something else (not <user>.github.io), set base to '/REPO_NAME/'
export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // silence deprecation warnings coming from frappe-gantt's scss
        silenceDeprecations: ['color-functions', 'global-builtin', 'import', 'legacy-js-api']
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000
  }
});
