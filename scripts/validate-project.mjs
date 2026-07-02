import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const require = createRequire(import.meta.url);
const levelSchema = require(path.join(root, 'js/level-schema.js'));
const errors = [];
const warnings = [];
const WORLD_LEN = 6400;
const {
  normalizeGroundSegment,
  normalizeFloat,
  normalizePickup,
  collectEnemies
} = levelSchema;

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function stripQuery(src) {
  return src.split('?')[0];
}

function loadAssetManifest() {
  const sandbox = { window: {} };
  vm.runInNewContext(read('js/assets-manifest.js'), sandbox, { filename: 'js/assets-manifest.js' });
  vm.runInNewContext(read('js/asset-loader.js'), sandbox, { filename: 'js/asset-loader.js' });
  if (typeof sandbox.window.CAT_FLAG_ASSET_LOADER?.createAssetStore !== 'function') {
    errors.push('Asset loader does not expose createAssetStore.');
  }
  return {
    groups: sandbox.window.CAT_FLAG_ASSET_GROUPS || {},
    manifest: sandbox.window.CAT_FLAG_ASSET_MANIFEST || []
  };
}

function checkRuntimeModules() {
  const sandbox = { window: {}, console };
  for (const file of ['js/assets-manifest.js', 'js/asset-loader.js', 'js/level-schema.js', 'js/input-controller.js']) {
    vm.runInNewContext(read(file), sandbox, { filename: file });
  }

  const modules = [
    ['CAT_FLAG_ASSET_MANIFEST', Array.isArray(sandbox.window.CAT_FLAG_ASSET_MANIFEST)],
    ['CAT_FLAG_ASSET_LOADER.createAssetStore', typeof sandbox.window.CAT_FLAG_ASSET_LOADER?.createAssetStore === 'function'],
    ['CAT_FLAG_LEVEL_SCHEMA.normalizeFloat', typeof sandbox.window.CAT_FLAG_LEVEL_SCHEMA?.normalizeFloat === 'function'],
    ['CAT_FLAG_INPUT_CONTROLLER.createInputController', typeof sandbox.window.CAT_FLAG_INPUT_CONTROLLER?.createInputController === 'function']
  ];
  for (const [name, ok] of modules) {
    if (!ok) errors.push(`Runtime module API is missing: ${name}`);
  }
}

function loadLevels() {
  const sandbox = {};
  vm.runInNewContext(`${read('js/levels.js')}\nthis.LEVEL_DATA = LEVEL_DATA;`, sandbox, { filename: 'js/levels.js' });
  return sandbox.LEVEL_DATA || {};
}

function checkAssets() {
  const { groups, manifest } = loadAssetManifest();
  if (!manifest.length) errors.push('Asset manifest is empty.');

  const keys = new Set();
  const srcs = new Set();
  for (const item of manifest) {
    if (!item.key) errors.push(`Asset entry is missing key: ${JSON.stringify(item)}`);
    if (!item.src) errors.push(`Asset ${item.key || '<unknown>'} is missing src.`);
    if (keys.has(item.key)) errors.push(`Duplicate asset key: ${item.key}`);
    keys.add(item.key);
    const file = stripQuery(item.src || '');
    srcs.add(file);
    if (file.startsWith('assets/archive/')) {
      errors.push(`Runtime manifest must not reference archived source asset: ${item.key} -> ${file}`);
    }
    if (file && !fs.existsSync(path.join(root, file))) {
      errors.push(`Asset file does not exist: ${item.key} -> ${file}`);
    }
  }

  for (const [group, items] of Object.entries(groups)) {
    if (!Array.isArray(items) || items.length === 0) warnings.push(`Asset group has no entries: ${group}`);
  }

  const html = read('index.html');
  let lastScriptIndex = -1;
  for (const needed of ['js/assets-manifest.js', 'js/asset-loader.js', 'js/level-schema.js', 'js/input-controller.js', 'js/levels.js', 'js/game.js']) {
    const scriptIndex = html.indexOf(needed);
    if (scriptIndex < 0) {
      errors.push(`index.html does not load ${needed}.`);
      continue;
    }
    if (scriptIndex <= lastScriptIndex) errors.push(`index.html loads ${needed} out of order.`);
    lastScriptIndex = scriptIndex;
  }

  const assetFiles = fs.readdirSync(path.join(root, 'assets'), { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => `assets/${entry.name}`);
  const unused = assetFiles.filter(file => !srcs.has(file) && !html.includes(file) && !read('css/style.css').includes(file));
  if (unused.length) warnings.push(`Unused asset files: ${unused.join(', ')}`);
}

function checkPatrol(stage, enemy) {
  const type = enemy.type;
  const needsPatrol = type === 'patrol' || ['mousetank', 'rat', 'flameguard'].includes(type) || enemy.movement === 'patrol';
  if (!needsPatrol) return;
  if (enemy.patrolMin == null || enemy.patrolMax == null) {
    errors.push(`Stage ${stage} patrol enemy missing range: ${type}@${enemy.x}`);
    return;
  }
  if (Number(enemy.patrolMin) > Number(enemy.patrolMax)) {
    errors.push(`Stage ${stage} patrol range is inverted: ${type}@${enemy.x}`);
  }
}

function checkLevels() {
  const levels = loadLevels();
  const stageIds = Object.keys(levels).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  const enemyTypes = new Set(['stand', 'patrol', 'sniper', 'turret', 'helicopter', 'boss3', 'boss4', 'boss5', 'mousetank', 'paratrooper', 'rat', 'skyknight', 'flameguard']);
  const bossTypes = new Set(['turret', 'helicopter', 'boss3', 'boss4', 'boss5']);
  const pickupTypes = new Set(['rapid', 'spread', 'life']);

  if (stageIds.length === 0) errors.push('No level data found.');
  if (stageIds.length < 5) warnings.push(`Only ${stageIds.length} stages found.`);

  for (const stage of stageIds) {
    const data = levels[stage];
    if (!data.name) warnings.push(`Stage ${stage} has no display name.`);
    if (!data.boss) {
      errors.push(`Stage ${stage} is missing boss data.`);
    } else {
      if (!bossTypes.has(data.boss.type)) errors.push(`Stage ${stage} boss type is unknown: ${data.boss.type}`);
      if (data.boss.type === 'boss3' && data.boss.yAbs) errors.push('Stage 3 ground boss should not use absolute Y.');
      if (data.boss.type === 'boss5' && data.boss.yAbs) errors.push('Stage 5 ground boss should not use absolute Y.');
      if (['helicopter', 'boss4'].includes(data.boss.type) && (data.boss.centerY == null || data.boss.radius == null)) {
        errors.push(`Stage ${stage} flying boss is missing centerY/radius.`);
      }
    }

    const groundSources = [
      ...(data.startGround ? [data.startGround] : []),
      ...(data.groundSegments || [])
    ];
    for (const segment of groundSources.map(normalizeGroundSegment)) {
      const end = segment.end === 'end' ? WORLD_LEN : segment.end;
      if (!Number.isFinite(Number(segment.x)) || !Number.isFinite(Number(end)) || Number(end) <= Number(segment.x)) {
        errors.push(`Stage ${stage} has invalid ground segment: ${JSON.stringify(segment)}`);
      }
    }

    for (const platform of (data.floats || []).map(normalizeFloat)) {
      if (!Number.isFinite(Number(platform.x)) || !Number.isFinite(Number(platform.yOffset)) || Number(platform.w) <= 0) {
        errors.push(`Stage ${stage} has invalid floating platform: ${JSON.stringify(platform)}`);
      }
    }

    const enemies = collectEnemies(data);
    for (const enemy of enemies) {
      if (!enemyTypes.has(enemy.type)) errors.push(`Stage ${stage} has unknown enemy type: ${enemy.type}`);
      if (!Number.isFinite(Number(enemy.x))) errors.push(`Stage ${stage} enemy has invalid X: ${JSON.stringify(enemy)}`);
      checkPatrol(stage, enemy);
      if (enemy.movement === 'orbit' && (enemy.centerY == null || enemy.radius == null)) {
        errors.push(`Stage ${stage} orbit enemy is missing centerY/radius: ${enemy.type}@${enemy.x}`);
      }
    }

    for (const pickup of (data.pickups || []).map(normalizePickup)) {
      if (!pickupTypes.has(pickup.type)) errors.push(`Stage ${stage} has unknown pickup type: ${pickup.type}`);
      if (!Number.isFinite(Number(pickup.x)) || !Number.isFinite(Number(pickup.yOffset))) {
        errors.push(`Stage ${stage} pickup has invalid position: ${JSON.stringify(pickup)}`);
      }
    }
  }
}

checkRuntimeModules();
checkAssets();
checkLevels();

for (const warning of warnings) console.warn(`WARN ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

console.log(`Project validation passed with ${warnings.length} warning(s).`);
