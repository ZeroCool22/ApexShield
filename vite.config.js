import { defineConfig } from 'vite';

export default defineConfig({
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    open: false,
    watch: {
      ignored: ['**/src-tauri/**']
    }
  },
  define: {
    'process.env': {},
    'process': { env: {} }
  },
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    target: 'esnext'
  }
});
