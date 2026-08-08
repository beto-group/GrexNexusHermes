import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// REACT STRATEGY
// --------------
// The Hermes GUI loader renders this component inside ITS OWN React tree, via
// window.__HERMES_PLUGIN_SDK__.React (= React 18 default export). Bundling a
// second React copy makes hooks bind to a null dispatcher ("useState is null").
// So react / react-dom are EXTERNAL and read from the SDK at runtime.
//
// JSX RUNTIME
// -----------
// The SDK's React (x.default) does NOT expose jsx/jsxs (those live in
// react/jsx-runtime). So we compile OUR source with the CLASSIC runtime
// (React.createElement) — that resolves to SDK.React.createElement, which
// exists. Third-party code (lucide-react) still imports react/jsx-runtime, so
// we map that external to a shim (window.__GREX_JSXRT__) built from the SDK
// React in main.jsx (jsx/jsxs -> React.createElement, Fragment -> React.Fragment).
//
// ALIAS
// -----
// The host embeds sibling component source (components/HermesOrchestratorEngine)
// that imports bare specifiers. Alias them to THIS host's node_modules so rollup
// can resolve at build time. External config still wins for the bundle output,
// so react is not inlined.

export default defineConfig({
  plugins: [react({ jsxRuntime: 'classic' })],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  resolve: {
    alias: {
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
      external: [
        'react',
        'react/jsx-runtime',
        'react-dom',
        'react-dom/client'
      ],
      output: {
        inlineDynamicImports: true,
        globals: {
          react: '__HERMES_PLUGIN_SDK__.React',
          'react/jsx-runtime': '__GREX_JSXRT__',
          'react-dom': '__HERMES_PLUGIN_SDK__.ReactDOM',
          'react-dom/client': '__HERMES_PLUGIN_SDK__.ReactDOM'
        }
      }
    }
  }
});
