import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  // L'interface React vit dans frontend/ ; le processus Electron (backend/) charge dist/.
  root: here('./frontend'),
  // Chemins relatifs : la version compilée est chargée en file:// par Electron.
  base: './',
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { outDir: here('./dist'), emptyOutDir: true },
});
