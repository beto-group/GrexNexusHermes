import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIST = path.resolve(__dirname, '../dist');
const LOCAL_DASHBOARD_DIST = path.resolve(__dirname, '../dashboard/dist');
const PLUGIN_TARGET = path.resolve(__dirname, '../../../../hermes-plugin-template');
const PLUGIN_DASHBOARD_DIST = path.join(PLUGIN_TARGET, 'dashboard/dist');

console.log('[GrexNexusHermes Deploy] Syncing Mothership build...');

if (!fs.existsSync(SRC_DIST)) {
  console.error('❌ Source dist folder does not exist! Run npm run build first.');
  process.exit(1);
}

// 1. Copy to local dashboard/dist
if (!fs.existsSync(LOCAL_DASHBOARD_DIST)) {
  fs.mkdirSync(LOCAL_DASHBOARD_DIST, { recursive: true });
}
fs.cpSync(SRC_DIST, LOCAL_DASHBOARD_DIST, { recursive: true });

// 2. Copy to hermes-plugin-template if present
if (fs.existsSync(PLUGIN_TARGET)) {
  if (!fs.existsSync(PLUGIN_DASHBOARD_DIST)) {
    fs.mkdirSync(PLUGIN_DASHBOARD_DIST, { recursive: true });
  }
  fs.cpSync(SRC_DIST, PLUGIN_DASHBOARD_DIST, { recursive: true });

  const manifestYamlPath = path.join(PLUGIN_TARGET, 'plugin.yaml');
  const yamlContent = `# Hermes Plugin Manifest — Grex Nexus Mothership
name: hermes-plugin-template
version: 1.0.0
description: Grex Nexus Sovereign Mothership Host Engine & Tiling WM Dashboard for Hermes.
author: beto-group
requires_env: []
provides_tools:
  - hello_world
provides_hooks:
  - post_tool_call
`;
  fs.writeFileSync(manifestYamlPath, yamlContent, 'utf8');

  const dashManifestPath = path.join(PLUGIN_TARGET, 'dashboard/manifest.json');
  const dashManifestContent = {
    name: "hermes-plugin-template",
    label: "Grex Nexus Mothership",
    description: "Grex Nexus Sovereign Mothership Host Engine & Tiling WM Dashboard for Hermes.",
    icon: "LayoutGrid",
    version: "1.0.0",
    tab: {
      path: "/grex-nexus",
      position: "after:kanban"
    },
    entry: "dist/index.js"
  };
  fs.writeFileSync(dashManifestPath, JSON.stringify(dashManifestContent, null, 2), 'utf8');
}

console.log('✅ [GrexNexusHermes Deploy] Successfully deployed Mothership bundle!');
