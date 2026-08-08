import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

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
// On the 99%-full workspace volume, fs.cpSync into a pre-existing (sometimes
// permission-corrupted) directory intermittently throws EACCES. Fall back to a
// shell `cp -r` (which has succeeded where fs.cpSync fails on this FS) so the
// build never fails on a copy the OS can actually perform.
function copyDir(src, dest) {
  try {
    fs.cpSync(src, dest, { recursive: true });
  } catch (err) {
    if (err && err.code === 'EACCES') {
      execFileSync('cp', ['-r', src + '/.', dest + '/'], { stdio: 'ignore' });
    } else {
      throw err;
    }
  }
}

function syncDir(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  copyDir(src, dest);
}

// 1. Local dashboard/dist (best-effort: on the 99%-full workspace volume the
//    copy can intermittently EACCES; the real artifact is dist/index.js, which
//    the installer pulls from GitHub, so a local-sync failure must not fail
//    the build).
try {
  syncDir(SRC_DIST, LOCAL_DASHBOARD_DIST);
} catch (err) {
  console.warn(`[GrexNexusHermes Deploy] Skipped local dashboard/dist sync (${err.code || err.message}). dist/index.js is intact.`);
}

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
