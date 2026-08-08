// Harness: load the built dashboard bundle the way the Hermes GUI loader does,
// mock window.__HERMES_PLUGIN_SDK__ with the REAL React (the loader provides
// React 18 default export + hooks), invoke the registered component, and render
// it to confirm it does NOT throw "e.jsx is not a function" / "useState is null".
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

const ROOT = __dirname + '/..';
const bundlePath = process.argv[2] || path.join(ROOT, 'dashboard/dist/grex.js');
const code = fs.readFileSync(bundlePath, 'utf8');

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  url: 'http://localhost:9119/',
});
const { window } = dom;

// Mock the Hermes plugin SDK exactly like the loader does:
//   React: React 18 default export, hooks, api, components, etc.
const captured = {};
window.__HERMES_PLUGINS__ = {
  register(name, Comp) {
    captured[name] = Comp;
    console.log('[harness] registered plugin:', name, '->', typeof Comp);
  },
  registerSlot() {},
};
window.__HERMES_PLUGIN_SDK__ = {
  sdkVersion: '1.1.0',
  React,
  hooks: {
    useState: React.useState, useEffect: React.useEffect, useCallback: React.useCallback,
    useMemo: React.useMemo, useRef: React.useRef, useContext: React.useContext, createContext: React.createContext,
  },
  api: {}, fetchJSON: async () => ({}), authedFetch: async () => ({}),
  buildWsUrl: () => '', buildWsAuthParam: () => '',
  components: {}, utils: { cn: (...a) => a.filter(Boolean).join(' '), timeAgo: () => '' },
};

// jsx-runtime shim the bundle expects (set by main.jsx at runtime)
window.__GREX_JSXRT__ = { jsx: React.createElement, jsxs: React.createElement, Fragment: React.Fragment };

// Provide globals the bundle's IIFE may reference
global.window = window;
global.document = window.document;
global.navigator = window.navigator;
global.React = React;

let threw = null;
try {
  // Execute the bundle in the jsdom window context
  const fn = new window.Function('window', 'document', 'navigator', 'globalThis', code);
  fn(window, window.document, window.navigator, window);
} catch (e) {
  threw = e;
  console.error('[harness] BUNDLE EXECUTION THREW:', e && e.message);
}

if (threw) { console.error('RESULT: FAIL (bundle threw at load)'); process.exit(1); }

const Comp = captured['grex-nexus-hermes'];
if (!Comp) { console.error('RESULT: FAIL (no component registered as grex-nexus-hermes)'); process.exit(1); }

// Now actually RENDER the component to string — this is where e.jsx / useState would throw
try {
  const html = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, {}));
  console.log('[harness] render length:', html.length);
  console.log('RESULT: PASS — component rendered without throwing');
  process.exit(0);
} catch (e) {
  console.error('[harness] RENDER THREW:', e && e.message);
  console.error('RESULT: FAIL (render threw)');
  process.exit(1);
}
