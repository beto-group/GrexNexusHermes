import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// REACT STRATEGY
// --------------
// The Hermes GUI loader renders this component inside ITS OWN React tree, via
// window.__HERMES_PLUGIN_SDK__.React (= React 18 default export). Bundling a
// second React copy makes hooks bind to a null dispatcher ("useState is null").
// So `react` / `react-dom` are EXTERNAL and read from the SDK at runtime.
//
// JSX RUNTIME (the e.jsx fix)
// ---------------------------
// The SDK's React does NOT expose react/jsx-runtime. OUR source is compiled
// with the CLASSIC runtime (React.createElement -> SDK.React.createElement).
// BUT third-party code (lucide-react) is pre-compiled with the AUTOMATIC
// runtime and imports `jsx`/`jsxs` from `react/jsx-runtime`. We must NOT
// externalize that to an undefined global (that was the `e.jsx is not a
// function` bug). Instead we ALIAS `react/jsx-runtime` (and the dev variant)
// to a local shim module (src/jsx-shim.js) that is BUNDLED and delegates to
// the external SDK React via React.createElement. Result: a single React
// instance, valid jsx/jsxs, no undefined global.
//
// ALIAS (sibling component source)
// --------------------------------
// The host embeds sibling component source (components/HermesOrchestratorEngine)
// that imports bare specifiers. Alias them to THIS host's node_modules so
// rollup can resolve at build time. React is still external (not inlined).

export default defineConfig({
  plugins: [react({ jsxRuntime: 'classic' })],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  resolve: {
    alias: {
      react: resolve(__dirname, 'node_modules/react'),
      'react-dom': resolve(__dirname, 'node_modules/react-dom'),
      'lucide-react': resolve(__dirname, 'node_modules/lucide-react'),
      // THE FIX: route jsx-runtime through the bundled shim (uses external React)
      'react/jsx-runtime': resolve(__dirname, 'src/jsx-shim.js'),
      'react/jsx-dev-runtime': resolve(__dirname, 'src/jsx-shim.js')
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
      // Externalize ONLY the host-provided React/ReactDOM. Critically, do NOT
      // externalize `react/jsx-runtime`: @vitejs/plugin-react auto-externalizes
      // it for lib builds, which compiles lucide-react's `import {jsx} from
      // 'react/jsx-runtime'` into `var e = window.<global>` CAPTURED at module
      // init. If lucide initializes before the shim global is set, e is
      // undefined -> "e.jsx is not a function". By EXPLICITLY bundling
      // react/jsx-runtime (returning false here), it resolves via the
      // resolve.alias to src/jsx-shim.js, which delegates to the external host
      // React at CALL time (no capture, single instance).
      external: (id) =>
        id === 'react' ||
        id === 'react-dom' ||
        id === 'react-dom/client',
      output: {
        inlineDynamicImports: true,
        globals: {
          react: '__HERMES_PLUGIN_SDK__.React',
          'react-dom': '__HERMES_PLUGIN_SDK__.ReactDOM',
          'react-dom/client': '__HERMES_PLUGIN_SDK__.ReactDOM'
        }
      }
    }
  }
});
