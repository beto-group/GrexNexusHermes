import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// REACT STRATEGY
// --------------
// The Hermes GUI loader renders this component inside ITS OWN React tree, via
// window.__HERMES_PLUGIN_SDK__.React. If we ship a second React copy, the
// component's hooks bind to a null dispatcher -> "Cannot read properties of
// null (reading 'useState')". So react / react-dom / react/jsx-runtime are
// EXTERNAL and resolved at runtime from the host SDK globals (like the working
// kanban plugin does). lucide-react has NO SDK equivalent, so it is bundled —
// but its internal `import 'react'` is also external, so its icons render
// through the live host React.
//
// ALIAS
// -----
// The host embeds sibling component source (e.g. components/HermesOrchestratorEngine)
// that import bare specifiers (lucide-react). That source lives outside this
// host's node_modules tree, so alias lucide-react (and react for safety) to THIS
// host's node_modules so rollup can resolve them at build time. External config
// still wins for the output, so react is not inlined.

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  resolve: {
    alias: {
      // Resolve sibling-component bare imports to this host's node_modules.
      // (react/react-dom are also listed so resolution never fails, but they
      //  are externalized below and won't be bundled into the output.)
      'react/jsx-runtime': resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
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
      // External -> read from the host SDK at runtime, not bundled.
      external: [
        'react',
        'react/jsx-runtime',
        'react-dom',
        'react-dom/client'
      ],
      output: {
        inlineDynamicImports: true,
        // Map each external to a property on the host SDK global.
        // React 18 exposes jsx/jsxs/Fragment directly on the React object, so
        // 'react/jsx-runtime' can resolve to the same SDK React instance.
        globals: {
          react: '__HERMES_PLUGIN_SDK__.React',
          'react/jsx-runtime': '__HERMES_PLUGIN_SDK__.React',
          'react-dom': '__HERMES_PLUGIN_SDK__.ReactDOM',
          'react-dom/client': '__HERMES_PLUGIN_SDK__.ReactDOM'
        }
      }
    }
  }
});
