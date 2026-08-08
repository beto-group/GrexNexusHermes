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
// On the 99%-full workspace volume, fs.cpSync into a pre-existing (sometimes
// permission-corrupted) directory throws EACCES. Work around it by staging into
// a fresh temp dir beside the target, then atomically renaming over the target.
function syncDir(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  const parent = path.dirname(dest);
  const stage = path.join(parent, `.${path.basename(dest)}.stage-${process.pid}`);
  fs.rmSync(stage, { recursive: true, force: true });
  fs.mkdirSync(stage, { recursive: true });
  fs.cpSync(src, stage, { recursive: true });
  fs.renameSync(stage, dest);
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
