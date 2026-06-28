// ============ 喵喵突击队 - 单文件 Canvas 实现 ============
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // ---------- 游戏常量配置 ----------
  const CONFIG = {
    world: {
      groundY: H - 70,
      worldLen: 6400,
      camOffset: W * 0.45,
      camPadding: 10,
      bounds: { left: 10, right: 10 }
    },
    physics: {
      gravity: 1700,
      jumpVelocity: -740,
      maxJumps: 1,
      groundSpeed: 200,
      airSpeed: 170,
      groundAccel: 1400,
      airAccel: 700,
      fallDeathY: H + 80,
      oneWayDrop: 6
    },
    player: {
      width: 26,
      height: 44,
      crouchHeight: 34,
      proneHeight: 22,
      startX: 80,
      invulnTime: 1.6,
      respawnTime: 1.2,
      life: { easy: 7, normal: 5, hard: 3 },
      maxLife: 5
    },
    weapons: {
      speed: 720,
      spreadAngle: 0.16,
      duration: 12,
      fireCD: { normal: 0.18, rapid: 0.09, spread: 0.28 }
    },
    enemy: {
      bulletSpeed: { default: 280, turret: 320, helicopter: 260 },
      fireCD: {
        patrol: [1.3, 2.4],
        sniper: [1.4, 2.4],
        turret: [0.8, 1.3],
        helicopter: [0.7, 1.2]
      },
      hp: { sniper: 2, turret: 14, helicopter: 30 },
      score: { infantry: 100, sniper: 200, turret: 1000, helicopter: 2000, stageClear: 1000 },
      activationRange: { x: 520, y: { default: 220, helicopter: 360 } }
    },
    difficulty: {
      statMult: { easy: 0.75, normal: 1.0, hard: 1.3 },
      fireMult: { easy: 1.4, normal: 1.0, hard: 0.75 }
    },
    particles: {
      gravity: 400,
      hit: { count: 6, life: 0.3 },
      boom: { turret: 40, helicopter: 60, other: 14 },
      pickup: 12
    },
    shake: { hit: 10, enemyHit: 2, turret: 18, helicopter: 24, other: 6 },
    hud: { progressBarY: 16, progressBarW: 200, progressBarH: 6 }
  };

  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('startBtn');
  const lifeEl = document.getElementById('life');
  const scoreEl = document.getElementById('score');
  const stageEl = document.getElementById('stage');
  const coverArt = document.getElementById('coverArt');
  const helpBtn = document.getElementById('helpBtn');
  const helpPanel = document.getElementById('helpPanel');
  const helpBackdrop = document.getElementById('helpBackdrop');
  const helpClose = document.getElementById('helpClose');

  // 封面加载失败时隐藏图片
  coverArt.onerror = () => { coverArt.style.display = 'none'; };

  // 操作说明弹窗控制
  function showHelp(show) {
    helpPanel.classList.toggle('show', show);
    helpBackdrop.classList.toggle('show', show);
    helpBtn.textContent = show ? '📖 收起说明' : '📖 操作说明';
  }
  helpBtn.onclick = () => showHelp(!helpPanel.classList.contains('show'));
  helpClose.onclick = () => showHelp(false);
  helpBackdrop.onclick = () => showHelp(false);

  // ---------- 输入 ----------
  const input = {
    keys: {},
    mouse: { x: 0, y: 0, down: false },
    touch: { left: false, right: false, jump: false },
    jumpBuffer: 0,
    coyoteTime: 0
  };

  window.addEventListener('keydown', e => {
    input.keys[e.key.toLowerCase()] = true;
    if (e.key === ' ' || e.key === 'ArrowUp') input.jumpBuffer = 0.12;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    if ((e.key === 'Escape' || e.key.toLowerCase() === 'p') && gameState.running && !gameState.gameOver && !gameState.win) {
      togglePause();
    }
  });
  window.addEventListener('keyup', e => { input.keys[e.key.toLowerCase()] = false; });

  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = (e.clientX - r.left) * (W / r.width);
    input.mouse.y = (e.clientY - r.top) * (H / r.height);
  });
  canvas.addEventListener('mousedown', () => { input.mouse.down = true; });
  window.addEventListener('mouseup', () => { input.mouse.down = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // 触摸控制
  
  function updateTouchState(e) {
    input.touch.left = input.touch.right = input.touch.jump = false;
    for (const t of e.touches) {
      const r = canvas.getBoundingClientRect();
      const x = (t.clientX - r.left) * (W / r.width);
      const y = (t.clientY - r.top) * (H / r.height);
      if (x < W * 0.4 && y > H * 0.5) input.touch.left = true;
      else if (x > W * 0.6 && y > H * 0.5) input.touch.right = true;
      else if (y < H * 0.5) input.touch.jump = true;
    }
    updateTouchMouse(e);
  }
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    input.mouse.down = true;
    updateTouchState(e);
    if (input.touch.jump) input.jumpBuffer = 0.12;
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    updateTouchState(e);
  }, { passive: false });
  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    updateTouchState(e);
    if (e.touches.length === 0) input.mouse.down = false;
  }, { passive: false });
  function updateTouchMouse(e) {
    if (e.touches.length) {
      const r = canvas.getBoundingClientRect();
      const t = e.touches[0];
      input.mouse.x = (t.clientX - r.left) * (W / r.width);
      input.mouse.y = (t.clientY - r.top) * (H / r.height);
    }
  }

  // 窗口失焦或鼠标离开窗口时清空输入，防止按键/鼠标卡住
  window.addEventListener('blur', () => {
    input.keys = {};
    input.mouse.down = false;
    input.touch.left = input.touch.right = input.touch.jump = false;
    input.jumpBuffer = 0;
    input.coyoteTime = 0;
    input.jumpBuffer = 0;
    input.coyoteTime = 0;
  });
  window.addEventListener('mouseleave', () => { input.mouse.down = false; });

  // ---------- 工具 ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const aabb = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // 简单空间网格：按 x 轴分桶加速子弹-敌人碰撞
  const SPATIAL_CELL = 200;
  function buildEnemySpatialGrid(enemies) {
    const grid = new Map();
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const key = Math.floor(enemy.x / SPATIAL_CELL);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(enemy);
    }
    return grid;
  }
  function getEnemiesNear(grid, x) {
    const key = Math.floor(x / SPATIAL_CELL);
    return [
      ...(grid.get(key - 1) || []),
      ...(grid.get(key) || []),
      ...(grid.get(key + 1) || [])
    ];
  }

  // ---------- 资源 ----------
  const assets = {
    bg: new Image(),
    hero: new Image(),
    boss: new Image(),
    skyBg: new Image(),
    heliBoss: new Image(),
    cover: new Image(),
  };
  const assetMeta = [
    { key: 'bg', src: 'assets/cat_bg.jpg?v=3', required: true },
    { key: 'hero', src: 'assets/cat_hero_sheet.png?v=2', required: true },
    { key: 'boss', src: 'assets/cat_boss.png?v=2', required: false },
    { key: 'skyBg', src: 'assets/sky_bg.jpg?v=3', required: false },
    { key: 'heliBoss', src: 'assets/heli_boss.png?v=1', required: false },
    { key: 'cover', src: 'assets/cover.jpg?v=3', required: false },
  ];
  let assetsReady = false;
  function loadAssets(onProgress, cb) {
    let loaded = 0;
    let errors = 0;
    const total = assetMeta.length;
    const onDone = () => {
      if (onProgress) onProgress((loaded + errors) / total);
      if (loaded + errors === total) {
        assetsReady = loaded > 0;
        if (errors > 0) console.warn('[喵喵突击队] 资源加载完成，' + errors + '/' + total + ' 个失败');
        if (cb) cb();
      }
    };
    for (const meta of assetMeta) {
      const img = assets[meta.key];
      img.onload = () => { loaded++; onDone(); };
      img.onerror = () => { errors++; onDone(); };
      img.src = meta.src;
    }
  }

  // ---------- 世界 ----------
  const GROUND_Y = CONFIG.world.groundY;
  const WORLD_LEN = CONFIG.world.worldLen;
  const gameState = {
    camX: 0, stage: 1, score: 0, highScore: 0,
    gameOver: false, win: false, shake: 0, stageTimeout: null,
    running: false, paused: false, rafId: null, last: 0, difficulty: 'easy',
    stageMessage: null,
    accumulator: 0
  };
  try {
    const save = JSON.parse(localStorage.getItem('catFlagSquadSave') || '{}');
    if (save && save.version === 1) gameState.highScore = parseInt(save.highScore, 10) || 0;
  } catch (e) {}
  const world = {
    platforms: [], enemies: [], bullets: [], enemyBullets: [], particles: [], pickups: []
  };

  function buildLevel() {
    world.platforms = [];
    world.enemies = [];
    world.bullets = []; world.enemyBullets = []; world.particles = []; world.pickups = [];
    const statMult = enemyStatMult();
    const fireMult = enemyFireMult();
    const data = LEVEL_DATA[gameState.stage];
    if (!data) return;

    // 地面平台
    if (data.startGround) {
      world.platforms.push({ x: data.startGround[0], y: GROUND_Y, w: data.startGround[1], h: 120, type: 'ground' });
    }
    for (const [a, b] of data.groundSegments || []) {
      const endX = b === 'end' ? WORLD_LEN : b;
      world.platforms.push({ x: a, y: GROUND_Y, w: endX - a, h: 120, type: 'ground' });
    }
    // 浮空平台
    for (const [x, yOff, w] of data.floats || []) {
      world.platforms.push({ x, y: GROUND_Y + yOff, w, h: 22, type: 'plat' });
    }

    // 普通敌人
    for (const e of data.infantry || []) {
      const en = makeEnemy(e[0], GROUND_Y - 40, e[1]);
      if (e[1] === 'patrol') { en.patrolMin = e[2]; en.patrolMax = e[3]; }
      world.enemies.push(en);
    }
    // 狙击手
    for (const [x, yOff] of data.snipers || []) {
      world.enemies.push(makeEnemy(x, GROUND_Y + yOff, 'sniper'));
    }
    // 平台敌人
    for (const e of data.platformEnemies || []) {
      const [px, pyOff, type, min, max] = e;
      const y = type === 'sniper' ? GROUND_Y + pyOff - 38 : GROUND_Y + pyOff - 40;
      const en = makeEnemy(px, y, type);
      if (type === 'patrol') { en.patrolMin = min; en.patrolMax = max; }
      world.enemies.push(en);
    }

    // Boss
    const bx = data.boss.x < 0 ? WORLD_LEN + data.boss.x : data.boss.x;
    const by = data.boss.type === 'helicopter' ? data.boss.y : GROUND_Y + data.boss.y;
    const boss = makeEnemy(bx, by, data.boss.type);
    boss.w = data.boss.w; boss.h = data.boss.h;
    boss.hp = Math.max(1, Math.round(CONFIG.enemy.hp[data.boss.type] * statMult));
    boss.maxhp = boss.hp;
    boss.fireCD = data.boss.fireCD * fireMult;
    if (data.boss.type === 'helicopter') {
      boss.phase = 0; boss.centerX = bx; boss.centerY = data.boss.centerY; boss.radius = data.boss.radius;
    }
    world.enemies.push(boss);

    // 拾取物
    world.pickups = [];
    for (const [x, yOff, type] of data.pickups || []) {
      world.pickups.push({ x, y: GROUND_Y + yOff, type });
    }
  }

  const ENEMY_TYPES = {
    stand:   { w: 30, h: 40, hpBase: 1,       speed: 0,   fireCD: [0.8, 1.8] },
    patrol:  { w: 30, h: 40, hpBase: 1,       speed: -40, fireCD: [0.8, 1.8] },
    sniper:  { w: 28, h: 38, hpKey: 'sniper',  speed: 0,   fireCD: [1.2, 2.2] },
    turret:  { w: 30, h: 40, hpKey: 'turret',  speed: 0,   fireCD: [0.8, 1.3] },
    helicopter: { w: 30, h: 40, hpKey: 'helicopter', speed: 0, fireCD: [0.7, 1.2] }
  };

  function makeEnemy(x, y, type) {
    const statMult = enemyStatMult();
    const fireMult = enemyFireMult();
    const cfg = ENEMY_TYPES[type] || ENEMY_TYPES.stand;
    const hpSource = cfg.hpKey || type;
    const hpBase = cfg.hpKey ? CONFIG.enemy.hp[cfg.hpKey] : cfg.hpBase;
    const hp = Math.max(1, Math.round(hpBase * statMult));
    const base = {
      x, y, w: cfg.w, h: cfg.h, vx: 0, vy: 0, type, dir: -1,
      fireCD: rand(...cfg.fireCD) * fireMult, hp, maxhp: hp,
      dead: false, onGround: false, anim: 0
    };
    if (cfg.speed) base.vx = cfg.speed * statMult;
    return base;
  }

  // ---------- 玩家 ----------
  const player = {
    x: CONFIG.player.startX, y: GROUND_Y - CONFIG.player.height, w: CONFIG.player.width, h: CONFIG.player.height,
    vx: 0, vy: 0, onGround: true, dir: 1,
    life: 5, fireCD: 0, weapon: 'normal', weaponTimer: 0,
    invuln: 0, crouch: false, prone: false, anim: 0, dead: false, respawn: 0, aim: 'side', jumpLock: false, jumpsLeft: 1,
  };

  function resetPlayer(full) {
    let targetX = Math.max(80, gameState.camX + 120);
    // 找到重生点下方最高的平台，避免第二关悬空重生直接掉落
    let py = null;
    for (const p of world.platforms) {
      if (targetX + player.w > p.x && targetX < p.x + p.w) {
        if (py === null || p.y < py) py = p.y;
      }
    }
    if (py === null) {
      // 没有平台时回到关卡起点
      targetX = 80;
      for (const p of world.platforms) {
        if (targetX + player.w > p.x && targetX < p.x + p.w) {
          if (py === null || p.y < py) py = p.y;
        }
      }
    }
    if (py === null) py = GROUND_Y;
    player.x = targetX;
    player.y = py - player.h;
    player.vx = 0; player.vy = 0;
    player.onGround = true; player.dir = 1;
    player.invuln = CONFIG.player.invulnTime;
    player.crouch = false; player.prone = false;
    player.jumpLock = false; player.jumpsLeft = 1;
    if (full) { player.weapon = 'normal'; player.weaponTimer = 0; }
  }

  // ---------- 射击 ----------
  function playerShoot() {
    if (player.fireCD > 0 || player.dead) return;
    const speed = CONFIG.weapons.speed;
    const dir = player.dir;
    const aim = player.aim; // 'side' | 'up' | 'down' | 'diagup' | 'diagdown'
    // 起点 & 弹道方向
    let x = dir > 0 ? player.x + player.w : player.x;
    let y = player.y + (player.prone ? 24 : (player.crouch ? 18 : 18));
    let bvx = dir * speed, bvy = 0;
    if (aim === 'up') { x = player.x + player.w / 2 - 5; y = player.y - 4; bvx = 0; bvy = -speed; }
    else if (aim === 'down') { x = player.x + player.w / 2 - 5; y = player.y + player.h - 4; bvx = 0; bvy = speed; }
    else if (aim === 'diagup') {
      x = dir > 0 ? player.x + player.w : player.x;
      y = player.y + 6;
      bvx = dir * speed * Math.SQRT1_2; bvy = -speed * Math.SQRT1_2;
    }
    else if (aim === 'diagdown') {
      x = dir > 0 ? player.x + player.w : player.x;
      y = player.y + player.h - 6;
      bvx = dir * speed * Math.SQRT1_2; bvy = speed * Math.SQRT1_2;
    }
    const base = { x, y, w: 10, h: 4, vx: bvx, vy: bvy, life: 1.0, owner: 'p' };
    if (player.weapon === 'normal') {
      world.bullets.push({ ...base });
      player.fireCD = CONFIG.weapons.fireCD.normal;
    } else if (player.weapon === 'rapid') {
      world.bullets.push({ ...base, vx: bvx + rand(-20, 20), vy: bvy + rand(-20, 20) });
      player.fireCD = CONFIG.weapons.fireCD.rapid;
    } else if (player.weapon === 'spread') {
      // 散射：以瞄准方向为中心扇形扩散
      const ang0 = Math.atan2(bvy, bvx);
      for (let i = -2; i <= 2; i++) {
        const ang = ang0 + i * CONFIG.weapons.spreadAngle;
        world.bullets.push({ ...base, vx: speed * Math.cos(ang), vy: speed * Math.sin(ang) });
      }
      player.fireCD = CONFIG.weapons.fireCD.spread;
    }
    // 枪口火花（沿射击方向）
    const sgnx = bvx === 0 ? 0 : Math.sign(bvx);
    const sgny = bvy === 0 ? 0 : Math.sign(bvy);
    for (let i = 0; i < 4; i++) world.particles.push({ x: x + 4, y, vx: sgnx * rand(40, 120), vy: sgny * rand(40, 120), life: 0.12, c: '#ffd24a' });
  }

  function enemyShoot(e) {
    const dx = (player.x + player.w / 2) - (e.x + e.w / 2);
    const dy = (player.y + player.h / 2) - (e.y + e.h / 2);
    const d = Math.hypot(dx, dy) || 1;
    const sp = CONFIG.enemy.bulletSpeed[e.type] || CONFIG.enemy.bulletSpeed.default;
    let bx = e.dir > 0 ? e.x + e.w : e.x;
    if (e.type === 'turret') { bx = e.x + e.w / 2; }
    if (e.type === 'helicopter') { bx = e.x + e.w / 2; }
    world.enemyBullets.push({
      x: bx, y: e.y + e.h * 0.4, w: 8, h: 8,
      vx: dx / d * sp, vy: dy / d * sp, life: 2.5
    });
  }

  // ---------- 更新 ----------
  function update(dt) {
    if (gameState.gameOver || gameState.win) return;
    if (player.dead) {
      player.respawn -= dt;
      if (player.respawn <= 0) {
        if (player.life <= 0) { endGame(false); return; }
        player.dead = false;
        resetPlayer(true);
      }
      return;
    }

    // 输入移动
    const left = input.keys['a'] || input.keys['arrowleft'] || input.touch.left;
    const right = input.keys['d'] || input.keys['arrowright'] || input.touch.right;
    const up = input.keys['w'] || input.keys['arrowup'];
    const down = input.keys['s'] || input.keys['arrowdown'];
    const jumpNow = input.keys[' '] || input.touch.jump;
    const shootKey = input.keys['j'] || input.mouse.down;
    const proneKey = input.keys['k'];

    // 跳跃按键触发一次（含缓冲）
    let jumpPressed = false;
    if (jumpNow) { jumpPressed = true; input.jumpBuffer = Math.max(input.jumpBuffer, 0.08); }
    if (input.jumpBuffer > 0) jumpPressed = true;

    // 八方向瞄准：由 W/A/S/D 组合决定射击方向
    // dir(朝向) 取水平移动方向；无水平输入时用上次朝向
    let ax = 0, ay = 0;
    if (left) ax -= 1;
    if (right) ax += 1;
    if (up) ay -= 1;
    if (down) ay += 1;
    // 水平朝向：有水平输入则更新 dir
    if (ax !== 0) player.dir = ax;
    // aim 用方向码表示：side/up/down/diagup/diagdown
    // 优先级：对角 > 纯垂直 > 水平
    let aim = 'side';
    if (ay < 0 && ax !== 0) aim = 'diagup';
    else if (ay > 0 && ax !== 0) aim = 'diagdown';
    else if (ay < 0) aim = 'up';
    else if (ay > 0) aim = 'down';
    player.aim = aim;

    // 蹲下：仅按 S 且无水平移动、站立地面、非卧倒
    player.crouch = down && ax === 0 && player.onGround && !proneKey;
    // 趴下：按住 K 且在地面上；趴下时强制水平瞄准，忽略 W/S
    player.prone = proneKey && player.onGround;
    if (player.prone) player.aim = 'side';

    // 根据姿态调整碰撞框高度，保持脚底位置不变
    const targetH = player.prone ? CONFIG.player.proneHeight : (player.crouch ? CONFIG.player.crouchHeight : CONFIG.player.height);
    if (targetH !== player.h) {
      const bottom = player.y + player.h;
      player.h = targetH;
      player.y = bottom - player.h;
    }

    let move = 0;
    if (!player.prone) {
      if (left) move -= 1;
      if (right) move += 1;
    }
    // 瞄准纯上/下时停止水平移动（保持定点射击手感）
    if (aim === 'up' || aim === 'down') move = 0;

    // 地面/空中可控移动：空中也能变向，跳得更远
    const targetVx = move * (player.onGround ? CONFIG.physics.groundSpeed : CONFIG.physics.airSpeed);
    const accel = player.onGround ? CONFIG.physics.groundAccel : CONFIG.physics.airAccel;
    if (player.vx < targetVx) player.vx = Math.min(targetVx, player.vx + accel * dt);
    else if (player.vx > targetVx) player.vx = Math.max(targetVx, player.vx - accel * dt);
    if (move !== 0) player.dir = move;

    // 跳跃与二段跳 / 趴下从平台落下
    let onOneWayPlatform = false;
    if (player.onGround) {
      for (const p of world.platforms) {
        if (p.type !== 'ground' && player.x + player.w > p.x + 4 && player.x < p.x + p.w - 4 && player.y + player.h >= p.y - 2 && player.y + player.h <= p.y + p.h + 16) {
          onOneWayPlatform = true; break;
        }
      }
    }

    // 更新土狼时间和跳跃缓冲
    if (player.onGround) {
      input.coyoteTime = 0.08;
    } else {
      input.coyoteTime = Math.max(0, input.coyoteTime - dt);
    }
    if (input.jumpBuffer > 0) input.jumpBuffer = Math.max(0, input.jumpBuffer - dt);

    if (jumpPressed && input.jumpBuffer > 0) {
      const canGroundJump = (player.onGround || input.coyoteTime > 0) && !proneKey;
      if (canGroundJump) {
        if (proneKey && onOneWayPlatform) {
          // 趴在浮空平台上按空格：落下来
          player.y += CONFIG.physics.oneWayDrop;
          player.vy = 0;
          player.onGround = false;
          player.jumpsLeft = 1;
        } else {
          player.vy = CONFIG.physics.jumpVelocity;
          player.onGround = false;
          player.jumpsLeft = 1;
        }
        input.jumpBuffer = 0;
        input.coyoteTime = 0;
      } else if (player.jumpsLeft > 0) {
        player.vy = CONFIG.physics.jumpVelocity;
        player.jumpsLeft--;
        input.jumpBuffer = 0;
      }
    }

    // 重力（稍弱，抛物线更平更远）
    player.vy += CONFIG.physics.gravity * dt;
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    // 地面平台侧向碰撞，防止穿墙/从坑底穿进下一段地面
    const prevX = player.x - player.vx * dt;
    for (const p of world.platforms) {
      if (p.type !== 'ground') continue;
      if (player.y + player.h <= p.y || player.y >= p.y + p.h) continue;
      if (prevX + player.w <= p.x && player.x + player.w > p.x) {
        player.x = p.x - player.w; player.vx = 0;
      } else if (prevX >= p.x + p.w && player.x < p.x + p.w) {
        player.x = p.x + p.w; player.vx = 0;
      }
    }

    // 平台碰撞
    let wasOnGround = player.onGround;
    player.onGround = false;
    for (const p of world.platforms) {
      if (p.type === 'ground') {
        if (player.x + player.w > p.x && player.x < p.x + p.w) {
          if (player.y + player.h > p.y && player.y + player.h < p.y + 60 && player.vy >= 0) {
            player.y = p.y - player.h; player.vy = 0; player.onGround = true;
          }
        }
      } else {
        // 单向平台：从上方落下时踩上
        if (player.x + player.w > p.x + 4 && player.x < p.x + p.w - 4) {
          if (player.vy >= 0 && player.y + player.h > p.y && player.y + player.h < p.y + p.h + 14 && !(down && !jumpPressed) && !(proneKey && jumpPressed)) {
            player.y = p.y - player.h; player.vy = 0; player.onGround = true;
          }
        }
      }
    }
    // 落地重置二段跳
    if (player.onGround && !wasOnGround) player.jumpsLeft = 1;

    // 世界边界 & 镜头
    player.x = clamp(player.x, gameState.camX + CONFIG.world.bounds.left, gameState.camX + W - CONFIG.world.bounds.right - player.w);
    if (player.x > gameState.camX + CONFIG.world.camOffset) gameState.camX = player.x - CONFIG.world.camOffset;
    gameState.camX = clamp(gameState.camX, 0, WORLD_LEN - W);

    // 掉落死亡
    if (player.y > CONFIG.physics.fallDeathY) hitPlayer(true);

    // 射击
    if (shootKey) playerShoot();
    player.fireCD = Math.max(0, player.fireCD - dt);
    if (player.invuln > 0) player.invuln -= dt;
    if (player.weaponTimer > 0) {
      player.weaponTimer -= dt;
      if (player.weaponTimer <= 0) player.weapon = 'normal';
    }
    player.anim += dt;

    // 敌人
    for (const e of world.enemies) {
      if (e.dead) continue;
      e.anim += dt;
      e.fireCD -= dt;
      // 朝向玩家
      e.dir = (player.x + player.w / 2) < (e.x + e.w / 2) ? -1 : 1;
      // 巡逻 / 飞行
      if (e.type === 'patrol') {
        e.x += e.vx * dt;
        if (e.x < e.patrolMin) { e.x = e.patrolMin; e.vx = Math.abs(e.vx); }
        if (e.x > e.patrolMax) { e.x = e.patrolMax; e.vx = -Math.abs(e.vx); }
      }
      // 直升机 Boss 运动：绕中心盘旋
      if (e.type === 'helicopter') {
        e.phase += dt * 0.8;
        e.x = e.centerX + Math.cos(e.phase) * e.radius;
        e.y = e.centerY + Math.sin(e.phase * 1.3) * 60;
        e.dir = (player.x + player.w / 2) < (e.x + e.w / 2) ? -1 : 1;
      }
      // 射击：仅在玩家在镜头内 & 一定距离
      const dxp = (player.x + player.w / 2) - (e.x + e.w / 2);
      const dist = Math.abs(dxp);
      const verticalOK = Math.abs(player.y - e.y) < CONFIG.enemy.activationRange.y[e.type] || CONFIG.enemy.activationRange.y.default;
      if (e.fireCD <= 0 && dist < CONFIG.enemy.activationRange.x && verticalOK) {
        // 只在镜头附近
        if (e.x > gameState.camX - 60 && e.x < gameState.camX + W + 60) {
          enemyShoot(e);
          e.fireCD = rand(...CONFIG.enemy.fireCD[e.type] || CONFIG.enemy.fireCD.patrol);
        }
      }
      // 炮台受击晃动
      if (e.type === 'turret') e.y = GROUND_Y - e.h;
    }

    // 玩家子弹
    const enemyGrid = buildEnemySpatialGrid(world.enemies);
    for (const b of world.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      // 命中敌人（仅检测相邻空间网格）
      for (const e of getEnemiesNear(enemyGrid, b.x)) {
        if (e.dead) continue;
        if (aabb(b, e)) {
          b.life = 0;
          e.hp -= 1;
          for (let i = 0; i < CONFIG.particles.hit.count; i++) world.particles.push({ x: b.x, y: b.y, vx: rand(-120, 120), vy: rand(-120, 60), life: 0.3, c: '#ff7a3a' });
          if (e.hp <= 0) {
            e.dead = true;
            gameState.score += CONFIG.enemy.score[e.type] || CONFIG.enemy.score.infantry;
            if (e.type === 'turret' || e.type === 'helicopter') {
              // Boss 被击败
              if (gameState.stage === 1 && e.type === 'turret') {
                // 进入第二关
                gameState.score += CONFIG.enemy.score.stageClear;
                gameState.stageTimeout = setTimeout(() => startNextStage(), 1500);
              } else {
                gameState.win = true;
                endGame(true);
              }
            }
            // 爆炸
            const boomCount = CONFIG.particles.boom[e.type] || CONFIG.particles.boom.other;
            for (let i = 0; i < boomCount; i++) {
              world.particles.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: rand(-200, 200), vy: rand(-260, 60), life: rand(0.4, 0.9), c: i % 2 ? '#ffce5a' : '#ff5a1f' });
            }
            gameState.shake = CONFIG.shake[e.type] || CONFIG.shake.other;
          } else { gameState.shake = CONFIG.shake.enemyHit; }
          break; // 一颗子弹只命中一个敌人
        }
      }
    }
    world.bullets = world.bullets.filter(b => b.life > 0 && b.x > gameState.camX - 40 && b.x < gameState.camX + W + 40 && b.y > -20 && b.y < H + 20);

    // 敌人子弹
    for (const b of world.enemyBullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (!player.dead && player.invuln <= 0 && aabb(b, player)) {
        b.life = 0;
        hitPlayer(false);
      }
    }
    world.enemyBullets = world.enemyBullets.filter(b => b.life > 0 && b.x > gameState.camX - 40 && b.x < gameState.camX + W + 40 && b.y > -20 && b.y < H + 40);

    // 敌人接触伤害
    if (player.invuln <= 0 && !player.dead) {
      for (const e of world.enemies) {
        if (e.dead) continue;
        if (aabb(player, e)) { hitPlayer(false); break; }
      }
    }

    // 拾取物
    for (const p of world.pickups) {
      if (p.taken) continue;
      const pb = { x: p.x, y: p.y, w: 20, h: 20 };
      if (aabb(player, pb)) {
        p.taken = true;
        if (p.type === 'rapid') { player.weapon = 'rapid'; player.weaponTimer = CONFIG.weapons.duration; }
        else if (p.type === 'spread') { player.weapon = 'spread'; player.weaponTimer = 12; }
        else if (p.type === 'life') { player.life = Math.min(CONFIG.player.maxLife, player.life + 1); }
        gameState.score += 50;
        for (let i = 0; i < CONFIG.particles.pickup; i++) world.particles.push({ x: p.x + 10, y: p.y + 10, vx: rand(-100, 100), vy: rand(-120, 20), life: 0.5, c: p.type === 'life' ? '#ff5a5a' : '#5affff' });
      }
    }

    // 粒子
    for (const pa of world.particles) { pa.x += pa.vx * dt; pa.y += pa.vy * dt; pa.vy += CONFIG.particles.gravity * dt; pa.life -= dt; }
    world.particles = world.particles.filter(p => p.life > 0);

    gameState.shake = Math.max(0, gameState.shake - dt * 30);
    updateHUD();
  }

  function hitPlayer(fall) {
    if (player.invuln > 0 || player.dead) return;
    player.life -= 1;
    for (let i = 0; i < CONFIG.particles.hit.count * 3; i++) world.particles.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, vx: rand(-180, 180), vy: rand(-200, 40), life: rand(0.3, 0.7), c: '#ff4a4a' });
    gameState.shake = CONFIG.shake.hit;
    if (player.life <= 0 || fall) {
      player.dead = true; player.respawn = CONFIG.player.respawnTime;
      if (player.life <= 0) endGame(false);
      else if (fall) { /* respawn */ }
    } else {
      player.invuln = 1.6;
    }
  }

  // ---------- 渲染 ----------
  function drawSky() {
    const useSky = gameState.stage === 2;
    const bgImg = useSky ? assets.skyBg : assets.bg;
    if (assetsReady && bgImg.complete && bgImg.naturalWidth > 0) {
      // 视差滚动背景：比镜头慢 0.3 倍移动，循环铺砖
      const imgW = bgImg.naturalWidth;
      const imgH = bgImg.naturalHeight;
      const drawH = H; // 背景图高度铺满
      const drawW = imgW * (drawH / imgH);
      const parallaxX = gameState.camX * 0.25;
      const start = -((parallaxX % drawW) + drawW) % drawW;
      for (let x = start; x < W; x += drawW) {
        ctx.drawImage(bgImg, x, 0, drawW, drawH);
      }
      // 暗角覆盖，让背景不抢戏
      ctx.fillStyle = useSky ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, W, H);
      return;
    }

    // 加载前的回退背景
    const g = ctx.createLinearGradient(0, 0, 0, H);
    if (useSky) {
      g.addColorStop(0, '#3a7ad8');
      g.addColorStop(0.5, '#7ab8ff');
      g.addColorStop(1, '#d8f0ff');
    } else {
      g.addColorStop(0, '#1a0a2a');
      g.addColorStop(0.5, '#3a1020');
      g.addColorStop(1, '#5a1a10');
    }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 远山
    ctx.fillStyle = '#2a1530';
    for (let i = 0; i < 6; i++) {
      const period = W + 240;
      const mx = (((i * 240 - gameState.camX * 0.2) % period) + period) % period - 240;
      ctx.beginPath();
      ctx.moveTo(mx, GROUND_Y);
      ctx.lineTo(mx + 120, GROUND_Y - 160);
      ctx.lineTo(mx + 240, GROUND_Y);
      ctx.fill();
    }
    ctx.fillStyle = '#3a1838';
    for (let i = 0; i < 6; i++) {
      const period = W + 200;
      const mx = (((i * 200 - gameState.camX * 0.35) % period) + period) % period - 200;
      ctx.beginPath();
      ctx.moveTo(mx, GROUND_Y);
      ctx.lineTo(mx + 100, GROUND_Y - 110);
      ctx.lineTo(mx + 200, GROUND_Y);
      ctx.fill();
    }
    // 月亮
    ctx.fillStyle = 'rgba(255,230,180,0.5)';
    ctx.beginPath(); ctx.arc(W - 130, 90, 38, 0, Math.PI * 2); ctx.fill();
  }

  function drawPlatforms() {
    for (const p of world.platforms) {
      const sx = p.x - gameState.camX;
      if (sx + p.w < 0 || sx > W) continue;
      if (p.type === 'ground') {
        // 土地
        ctx.fillStyle = '#2a1a0e';
        ctx.fillRect(sx, p.y, p.w, p.h);
        // 草层
        ctx.fillStyle = '#1f5a1f';
        ctx.fillRect(sx, p.y, p.w, 8);
        ctx.fillStyle = '#2f7a2f';
        for (let i = 0; i < p.w; i += 14) ctx.fillRect(sx + i, p.y, 8, 4);
        // 纹理点
        ctx.fillStyle = '#3a2516';
        for (let i = 0; i < p.w; i += 22) for (let j = 16; j < p.h; j += 26) ctx.fillRect(sx + i + (j % 2 ? 6 : 0), p.y + j, 5, 4);
      } else {
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(sx, p.y, p.w, p.h);
        ctx.fillStyle = '#7a5a2a';
        ctx.fillRect(sx, p.y, p.w, 5);
        ctx.fillStyle = '#3a2510';
        ctx.fillRect(sx, p.y + p.h - 4, p.w, 4);
      }
    }
  }

  function drawPlayer() {
    if (player.dead) return;
    const sx = player.x - gameState.camX;
    const sy = player.y;
    if (player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0) return;

    // 夺旗猫精灵图：9 帧横向排列，等宽裁剪后
    // 0:idle 1:run1 2:run2 3:jump 4:shoot_h 5:shoot_up 6:crouch 7:prone 8:flag
    if (assetsReady && assets.hero.complete && assets.hero.naturalWidth > 0) {
      const frameCount = 9;
      const fw = assets.hero.width / frameCount;
      const fh = assets.hero.height;
      let frame = 0;
      if (player.prone) frame = 7;
      else if (!player.onGround) frame = 3;
      else if (player.crouch) frame = 6;
      else if (player.aim === 'up' || player.aim === 'diagup') frame = 5;
      else if (player.fireCD > 0.12) frame = 4;
      else if (Math.abs(player.vx) > 1) frame = 1 + Math.floor(player.anim * 10) % 2;

      const imgH = 64;
      const imgW = fw * (imgH / fh);
      ctx.save();
      ctx.translate(sx + player.w / 2, sy + player.h);
      if (player.dir < 0) ctx.scale(-1, 1);
      // 启用邻近插值保持像素锐利
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(assets.hero, frame * fw, 0, fw, fh, -imgW / 2, -imgH, imgW, imgH);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(sx + player.w / 2, sy);
    if (player.dir < 0) ctx.scale(-1, 1);
    const walk = Math.sin(player.anim * 12) * (Math.abs(player.vx) > 1 ? 1 : 0);
    const h = player.prone ? 22 : (player.crouch ? 34 : 44);
    // 腿
    ctx.fillStyle = '#2a4a8a';
    if (player.prone) {
      ctx.fillRect(-12, 12, 24, 8);
    } else if (player.crouch) {
      ctx.fillRect(-8, 24, 7, 10); ctx.fillRect(2, 24, 7, 10);
    } else {
      ctx.fillRect(-7, 30 + walk * 2, 6, 14 - walk * 2);
      ctx.fillRect(2, 30 - walk * 2, 6, 14 + walk * 2);
    }
    // 身体
    ctx.fillStyle = '#c83030';
    if (player.prone) ctx.fillRect(-13, 4, 26, 12);
    else ctx.fillRect(-9, h - 32, 18, 18);
    // 头
    ctx.fillStyle = '#e8b878';
    ctx.fillRect(-7, h - 44, 14, 14);
    // 头巾
    ctx.fillStyle = '#1a8a3a';
    ctx.fillRect(-7, h - 44, 14, 4);
    // 枪（随瞄准方向）
    ctx.fillStyle = '#444';
    if (player.prone) {
      ctx.fillRect(8, 6, 16, 4);
    } else if (player.aim === 'up') {
      // 竖直向上
      ctx.fillRect(-2, h - 52, 4, 22);
    } else if (player.aim === 'down') {
      // 竖直向下
      ctx.fillRect(-2, h - 18, 4, 22);
    } else if (player.aim === 'diagup') {
      // 45 度斜上
      ctx.save();
      ctx.translate(4, h - 26);
      ctx.rotate(-Math.PI / 4);
      ctx.fillRect(0, -2, 22, 4);
      ctx.restore();
    } else if (player.aim === 'diagdown') {
      // 45 度斜下
      ctx.save();
      ctx.translate(4, h - 18);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(0, -2, 22, 4);
      ctx.restore();
    } else {
      ctx.fillRect(6, h - 26, 18, 4);
    }
    ctx.restore();
  }

  function drawEnemy(e) {
    if (e.dead) return;
    const sx = e.x - gameState.camX;
    if (sx + e.w < 0 || sx > W) return;
    ctx.save();
    ctx.translate(sx + e.w / 2, e.y);
    if (e.dir < 0) ctx.scale(-1, 1);

    if (e.type === 'turret') {
      if (assetsReady && assets.boss.complete && assets.boss.naturalWidth > 0) {
        const imgW = e.w * 3.5;
        const imgH = e.h * 2.6;
        ctx.save();
        // 让图片底部坐在地面上（e.y + e.h）
        ctx.translate(0, e.h - imgH);
        if (e.dir < 0) ctx.scale(-1, 1);
        ctx.drawImage(assets.boss, -imgW / 2, 0, imgW, imgH);
        ctx.restore();
      } else {
        // 回退：方块炮台
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(-35, e.h - 30, 70, 30);
        ctx.fillStyle = '#666';
        ctx.fillRect(-30, e.h - 40, 60, 12);
        ctx.fillStyle = '#888';
        ctx.fillRect(-22, e.h - 70, 44, 32);
        ctx.fillStyle = '#aaa';
        ctx.fillRect(-16, e.h - 78, 32, 12);
        ctx.fillStyle = '#222';
        ctx.fillRect(10, e.h - 60, 34, 10);
      }
      // 血条
      ctx.fillStyle = '#300';
      ctx.fillRect(-30, e.h - 92, 60, 6);
      ctx.fillStyle = '#ff4040';
      ctx.fillRect(-30, e.h - 92, 60 * (e.hp / e.maxhp), 6);
      // 警示灯
      ctx.fillStyle = Math.floor(e.anim * 4) % 2 ? '#ff2020' : '#600';
      ctx.beginPath(); ctx.arc(0, e.h - 74, 4, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'helicopter') {
      const imgW = e.w * 5;
      const imgH = e.h * 5.2;
      if (assetsReady && assets.heliBoss.complete && assets.heliBoss.naturalWidth > 0) {
        ctx.save();
        ctx.translate(0, e.h / 2 - imgH / 2);
        if (e.dir < 0) ctx.scale(-1, 1);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(assets.heliBoss, -imgW / 2, 0, imgW, imgH);
        ctx.restore();
      } else {
        // 回退：方块直升机
        ctx.fillStyle = '#4a5a3a';
        ctx.fillRect(-60, 10, 120, 40);
        ctx.fillStyle = '#888';
        ctx.fillRect(-80, 25, 160, 4);
      }
      // 血条
      ctx.fillStyle = '#300';
      ctx.fillRect(-60, -24, 120, 6);
      ctx.fillStyle = '#ff4040';
      ctx.fillRect(-60, -24, 120 * (e.hp / e.maxhp), 6);
      // 螺旋桨动画
      ctx.strokeStyle = 'rgba(200,200,200,0.6)';
      ctx.lineWidth = 3;
      const blade = Math.sin(e.anim * 25) * 60;
      const bladeY = (assetsReady && assets.heliBoss.complete && assets.heliBoss.naturalWidth > 0) ? -imgH / 2 + 10 : -30;
      ctx.beginPath();
      ctx.moveTo(-blade, bladeY);
      ctx.lineTo(blade, bladeY);
      ctx.stroke();
    } else {
      const bob = Math.sin(e.anim * 8) * 1;
      const catColor = e.type === 'sniper' ? '#8a5a2a' : '#4a4a4a';
      // 猫耳朵
      ctx.fillStyle = catColor;
      ctx.beginPath();
      ctx.moveTo(-8, 2 + bob); ctx.lineTo(-10, -6 + bob); ctx.lineTo(-2, 0 + bob);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(8, 2 + bob); ctx.lineTo(10, -6 + bob); ctx.lineTo(2, 0 + bob);
      ctx.fill();
      // 腿
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(-7, 28, 5, 12); ctx.fillRect(2, 28, 5, 12);
      // 身体
      ctx.fillStyle = catColor;
      ctx.fillRect(-9, 14 + bob, 18, 16);
      // 肚皮
      ctx.fillStyle = '#d8b898';
      ctx.fillRect(-5, 20 + bob, 10, 8);
      // 头
      ctx.fillStyle = catColor;
      ctx.fillRect(-8, 2 + bob, 16, 14);
      // 眼睛
      ctx.fillStyle = '#ff4a4a';
      ctx.fillRect(-4, 7 + bob, 2, 2); ctx.fillRect(2, 7 + bob, 2, 2);
      // 枪
      ctx.fillStyle = '#222';
      ctx.fillRect(6, 18 + bob, e.type === 'sniper' ? 22 : 14, 3);
      // 尾巴
      ctx.strokeStyle = catColor; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-9, 22 + bob);
      ctx.quadraticCurveTo(-18, 18 + bob - Math.sin(e.anim * 12) * 4, -16, 8 + bob);
      ctx.stroke();
      // 血条（狙击手）
      if (e.type === 'sniper' && e.hp < e.maxhp) {
        ctx.fillStyle = '#300'; ctx.fillRect(-10, -4, 20, 3);
        ctx.fillStyle = '#ff4040'; ctx.fillRect(-10, -4, 20 * (e.hp / e.maxhp), 3);
      }
    }
    ctx.restore();
  }

  function drawBullets() {
    for (const b of world.bullets) {
      const ang = Math.atan2(b.vy, b.vx);
      const cx = b.x - gameState.camX + b.w / 2;
      const cy = b.y + b.h / 2;
      // 拖尾
      ctx.fillStyle = 'rgba(255,226,74,0.35)';
      ctx.save();
      ctx.translate(cx - b.vx * 0.02, cy - b.vy * 0.02);
      ctx.rotate(ang);
      ctx.fillRect(-b.w, -b.h / 2, b.w, b.h);
      ctx.restore();
      // 弹头
      ctx.fillStyle = '#ffe24a';
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
    }
    for (const b of world.enemyBullets) {
      const sx = b.x - gameState.camX;
      ctx.fillStyle = '#ff4a4a';
      ctx.beginPath(); ctx.arc(sx + 4, b.y + 4, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,74,74,0.3)';
      ctx.beginPath(); ctx.arc(sx + 4 - b.vx * 0.012, b.y + 4 - b.vy * 0.012, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawPickups() {
    for (const p of world.pickups) {
      if (p.taken) continue;
      const sx = p.x - gameState.camX;
      if (sx < -20 || sx > W + 20) continue;
      const bob = Math.sin(performance.now() / 300 + p.x) * 3;
      const y = p.y + bob;
      const col = p.type === 'rapid' ? '#5aff8a' : p.type === 'spread' ? '#5affff' : '#ff5a5a';
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(sx, y + 22, 20, 3);
      ctx.fillStyle = col;
      ctx.fillRect(sx + 2, y, 16, 18);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      const t = p.type === 'rapid' ? 'R' : p.type === 'spread' ? 'S' : '+';
      ctx.fillText(t, sx + 10, y + 13);
      ctx.textAlign = 'left';
    }
  }

  function drawParticles() {
    for (const p of world.particles) {
      ctx.globalAlpha = clamp(p.life * 2, 0, 1);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x - gameState.camX - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  function drawHUDBars() {
    // 武器指示
    if (player.weapon !== 'normal') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(12, H - 34, 140, 22);
      ctx.fillStyle = player.weapon === 'rapid' ? '#5aff8a' : '#5affff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('WEAPON: ' + player.weapon.toUpperCase(), 18, H - 18);
      ctx.fillStyle = '#fff';
      ctx.fillRect(108, H - 22, 38 * (player.weaponTimer / 12), 6);
    }
  }

  function render() {
    ctx.save();
    if (gameState.shake > 0) ctx.translate(rand(-gameState.shake, gameState.shake), rand(-gameState.shake, gameState.shake));
    drawSky();
    drawPlatforms();
    drawPickups();
    for (const e of world.enemies) drawEnemy(e);
    drawPlayer();
    drawBullets();
    drawParticles();
    drawHUDBars();
    ctx.restore();

    // 进度条
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(W / 2 - CONFIG.hud.progressBarW / 2, H - CONFIG.hud.progressBarY, CONFIG.hud.progressBarW, CONFIG.hud.progressBarH);
    ctx.fillStyle = '#ff5a1f';
    ctx.fillRect(W / 2 - CONFIG.hud.progressBarW / 2, H - CONFIG.hud.progressBarY, CONFIG.hud.progressBarW * clamp((player.x) / WORLD_LEN, 0, 1), CONFIG.hud.progressBarH);

    // 移动端触摸区域视觉反馈
    if ('ontouchstart' in window && (input.touch.left || input.touch.right || input.touch.jump)) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      if (input.touch.left) ctx.fillRect(0, H * 0.5, W * 0.4, H * 0.5);
      if (input.touch.right) ctx.fillRect(W * 0.6, H * 0.5, W * 0.4, H * 0.5);
      if (input.touch.jump) ctx.fillRect(W * 0.4, 0, W * 0.2, H * 0.5);
    }
  }

  function updateHUD() {
    lifeEl.textContent = player.life;
    scoreEl.textContent = gameState.score;
    stageEl.textContent = gameState.stage;
  }

  // ---------- 结束 ----------
  function endGame(victory) {
    gameState.gameOver = true;
    gameState.running = false;
    if (gameState.stageTimeout) { clearTimeout(gameState.stageTimeout); gameState.stageTimeout = null; }
    gameState.win = victory;
    if (gameState.score > gameState.highScore) {
      gameState.highScore = gameState.score;
      try { localStorage.setItem('catFlagSquadSave', JSON.stringify({ version: 1, highScore: gameState.highScore })); } catch (e) {}
    }
    overlay.style.display = 'flex';
    const title = victory ? '任务完成' : '游戏结束';
    const color = victory ? '#5ad7ff' : '#ff4a4a';
    const sub = victory ? '喵喵突击队胜利！' : '英雄已倒下…';
    const desc = victory
      ? '你成功击败了黑猫军团，天空与大地重归和平！'
      : '敌军火力凶猛，再试一次吧！';
    overlay.innerHTML = `
      <div class="card">
        <div class="logo-wrap">
          <div class="cat-icon">${victory ? '🏆' : '😿'}</div>
          <h1 style="font-size:42px;background:linear-gradient(90deg,#ff9a4a,#ffd75a,#7ad7ff,#ff9a4a);background-size:300% 100%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 4s linear infinite;">${title}</h1>
        </div>
        <h2 style="color:${color};margin-bottom:10px;">${sub}</h2>
        <div class="final" style="font-size:26px;margin:10px 0 18px;">得分: ${gameState.score}</div>
        <p class="tagline">${desc}</p>
        <button class="btn" id="restartBtn">${victory ? '再玩一次' : '重新挑战'}</button>
      </div>
    `;
    document.getElementById('restartBtn').onclick = () => startGame(gameState.difficulty);
  }

  function startNextStage() {
    if (gameState.gameOver || gameState.win) return;
    if (gameState.stageMessage) { gameState.stageMessage.remove(); gameState.stageMessage = null; }
    gameState.stage = 2;
    gameState.camX = 0;
    player.weapon = 'normal'; player.weaponTimer = 0;
    buildLevel();
    resetPlayer(true);
    updateHUD();
    // 显示关卡过渡提示
    const msg = document.createElement('div');
    msg.textContent = '第二关 - 天空直升机';
    msg.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:28px;color:#5ad7ff;letter-spacing:4px;text-shadow:0 0 10px #000;pointer-events:none;z-index:10;';
    document.getElementById('wrap').appendChild(msg);
    gameState.stageMessage = msg;
    setTimeout(() => {
      if (gameState.stageMessage === msg) gameState.stageMessage = null;
      msg.remove();
    }, 2000);
  }

  // ---------- 主循环 ----------
  const TIME_STEP = 1 / 60;
  function loop(t) {
    if (!gameState.running) return;
    gameState.rafId = requestAnimationFrame(loop);
    if (gameState.paused) return;
    const dt = Math.min(0.1, (t - gameState.last) / 1000 || 0);
    gameState.last = t;
    gameState.accumulator += dt;
    while (gameState.accumulator >= TIME_STEP) {
      update(TIME_STEP);
      gameState.accumulator -= TIME_STEP;
    }
    render();
  }

  function togglePause() {
    gameState.paused = !gameState.paused;
    const pauseOverlay = document.getElementById('pauseOverlay');
    if (gameState.paused) {
      pauseOverlay.style.display = 'flex';
    } else {
      pauseOverlay.style.display = 'none';
      gameState.last = performance.now();
    }
  }



  function enemyStatMult() {
    return gameState.difficulty === 'easy' ? 0.75 : gameState.difficulty === 'hard' ? 1.3 : 1.0;
  }
  function enemyFireMult() {
    return gameState.difficulty === 'easy' ? 1.4 : gameState.difficulty === 'hard' ? 0.75 : 1.0;
  }

  startBtn.onclick = () => startGame(gameState.difficulty);

  // 难度选择
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      gameState.difficulty = btn.dataset.diff;
    };
  });

  // 暂停菜单按钮
  document.getElementById('resumeBtn').onclick = () => togglePause();
  document.getElementById('pauseRestartBtn').onclick = () => startGame(gameState.difficulty);

  function startGame(diff) {
    if (gameState.stageMessage) { gameState.stageMessage.remove(); gameState.stageMessage = null; }
    if (gameState.stageTimeout) { clearTimeout(gameState.stageTimeout); gameState.stageTimeout = null; }
    if (gameState.rafId) cancelAnimationFrame(gameState.rafId);
    gameState.running = false;
    gameState.paused = false;
    document.getElementById('pauseOverlay').style.display = 'none';
    gameState.camX = 0; gameState.score = 0; gameState.stage = 1; gameState.shake = 0;
    buildLevel();
    player.life = CONFIG.player.life[diff] || CONFIG.player.life.normal;
    player.weapon = 'normal'; player.weaponTimer = 0;
    resetPlayer(true);
    // 清空输入状态，防止用空格/回车点击按钮时触发跳跃/射击
    input.keys = {};
    input.mouse.down = false;
    input.touch.left = input.touch.right = input.touch.jump = false;
    player.jumpLock = true;
    gameState.gameOver = false; gameState.win = false;
    overlay.style.display = 'none';
    updateHUD();
    gameState.running = true;
    gameState.last = performance.now();
    gameState.rafId = requestAnimationFrame(loop);
  }

  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingBar = document.getElementById('loadingBar');
  const loadingText = document.getElementById('loadingText');

  // 加载资源，完成后显示开始界面
  startBtn.textContent = '加载中...';
  startBtn.disabled = true;
  loadAssets(
    (progress) => {
      const pct = Math.floor(progress * 100);
      loadingBar.style.width = pct + '%';
      loadingText.textContent = '加载中 ' + pct + '%';
    },
    () => {
      loadingOverlay.classList.add('hide');
      startBtn.textContent = '开始游戏';
      startBtn.disabled = false;
      buildLevel();
      render();
    }
  );

  // 初始渲染一帧背景（资源未加载完成时的占位）
  buildLevel(); render();
})();