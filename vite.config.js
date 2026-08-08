import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  resolve: {
    alias: {
      // The host embeds sibling component source (Ordo / HermesOrchestratorEngine)
      // that import bare specifiers (react, react-dom, lucide-react). They live
      // in THIS host's node_modules, so alias them here for the bundle step.
      // Component source is left untouched.
      react: resolve(__dirname, 'node_modules/react'),
      'react-dom': resolve(__dirname, 'node_modules/react-dom'),
      'lucide-react': resolve(__dirname, 'node_modules/lucide-react')
    }
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
    lib: {
      entry: resolve(__dirname, 'src/main.jsx'),
      name: 'GrexNexusHermes',
      fileName: () => 'index.js',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  }
});
