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

// Copy a source dir into a target dir, recreating the target cleanly first.
// (Some target dirs on the 99%-full volume can end up with broken perms;
//  rm -rf + mkdir guarantees a writable destination without failing the build.)
function syncDir(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

// 1. Local dashboard/dist
syncDir(SRC_DIST, LOCAL_DASHBOARD_DIST);

// 2. hermes-plugin-template (secondary target) — isolated so a missing or
//    unwritable target never breaks the primary build.
if (fs.existsSync(PLUGIN_TARGET)) {
  try {
    syncDir(SRC_DIST, PLUGIN_DASHBOARD_DIST);

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
  } catch (err) {
    console.warn(`⚠️  Skipped hermes-plugin-template sync (${err.message}). Primary build unaffected.`);
  }
}

console.log('✅ [GrexNexusHermes Deploy] Successfully deployed Mothership bundle!');
