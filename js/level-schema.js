(function(root) {
  function normalizeGroundSegment(item) {
    return Array.isArray(item) ? { x: item[0], end: item[1] } : { x: item.x ?? item.start, end: item.end };
  }

  function normalizeFloat(item) {
    return Array.isArray(item)
      ? { x: item[0], yOffset: item[1], w: item[2] }
      : { x: item.x, yOffset: item.yOffset ?? item.y, w: item.w ?? item.width };
  }

  function normalizeInfantry(item) {
    return Array.isArray(item)
      ? { x: item[0], type: item[1], patrolMin: item[2], patrolMax: item[3] }
      : { x: item.x, type: item.type, patrolMin: item.patrolMin, patrolMax: item.patrolMax };
  }

  function normalizeSniper(item) {
    return Array.isArray(item) ? { x: item[0], yOffset: item[1] } : { x: item.x, yOffset: item.yOffset ?? item.y };
  }

  function normalizePlatformEnemy(item) {
    return Array.isArray(item)
      ? { x: item[0], yOffset: item[1], type: item[2], patrolMin: item[3], patrolMax: item[4] }
      : { x: item.x, yOffset: item.yOffset ?? item.y, type: item.type, patrolMin: item.patrolMin, patrolMax: item.patrolMax };
  }

  function normalizeSpecialEnemy(item) {
    if (!Array.isArray(item)) return item;
    if (item.length === 5) {
      return { x: item[0], yAbs: item[1], centerY: item[2], radius: item[3], type: item[4], movement: 'orbit' };
    }
    return { x: item[0], type: item[1], patrolMin: item[2], patrolMax: item[3], movement: 'patrol' };
  }

  function normalizePickup(item) {
    return Array.isArray(item) ? { x: item[0], yOffset: item[1], type: item[2] } : { x: item.x, yOffset: item.yOffset ?? item.y, type: item.type };
  }

  function normalizeBoss(item) {
    return item || null;
  }

  function collectEnemies(data) {
    return [
      ...(data.infantry || []).map(normalizeInfantry),
      ...(data.platformEnemies || []).map(normalizePlatformEnemy),
      ...(data.specialEnemies || []).map(normalizeSpecialEnemy),
      ...(data.snipers || []).map(item => ({ ...normalizeSniper(item), type: 'sniper' }))
    ];
  }

  const schema = {
    normalizeGroundSegment,
    normalizeFloat,
    normalizeInfantry,
    normalizeSniper,
    normalizePlatformEnemy,
    normalizeSpecialEnemy,
    normalizePickup,
    normalizeBoss,
    collectEnemies
  };

  if (typeof module === 'object' && module.exports) module.exports = schema;
  root.CAT_FLAG_LEVEL_SCHEMA = schema;
})(typeof window !== 'undefined' ? window : globalThis);
