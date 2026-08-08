// jsx-shim.js
// ===========
// Hermes GUI dashboard plugins share the HOST's React instance
// (window.__HERMES_PLUGIN_SDK__.React). The host exposes only the default
// React export — it does NOT expose `react/jsx-runtime`. Third-party
// components compiled with the AUTOMATIC JSX runtime (e.g. lucide-react)
// import `jsx`/`jsxs` from `react/jsx-runtime`.
//
// This shim is aliased to `react/jsx-runtime` (and `react/jsx-dev-runtime`)
// at build time, so those imports resolve to a module that uses the EXTERNAL
// host React via React.createElement. Result: a single React instance, no
// `e.jsx is not a function`, no `useState is null`.

import React from 'react';

// React 18's automatic runtime signature:
//   jsx(type, props, key?)  and  jsxs(type, props, key?)
// For classic createElement, `key` is just a regular prop, so fold it in.
function jsx(type, props, key) {
  if (key !== undefined) {
    return React.createElement(type, { ...props, key });
  }
  return React.createElement(type, props);
}

export const jsxs = jsx;
export const jsxDEV = jsx;
export const Fragment = React.Fragment;
export { jsx };
