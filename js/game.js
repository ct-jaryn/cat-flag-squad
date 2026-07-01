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
      bounds: { left: 10, right: 10 },
      respawnCamOffset: 120,
      parallax: { bg: 0.25, far: 0.2, near: 0.35 },
      groundHeight: 120,
      platHeight: 22
    },
    physics: {
      gravity: 1700,
      jumpVelocity: -740,
      airJumps: 1,
      groundSpeed: 200,
      airSpeed: 170,
      groundAccel: 1400,
      airAccel: 700,
      fallDeathY: H + 80,
      oneWayDrop: 6,
      collision: {
        oneWay: { topMargin: 2, bottomMargin: 16, sideMargin: 4, verticalThreshold: 14 },
        groundLandingWindow: 60
      }
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
      maxLife: 5,
      shootOffsets: { prone: 24, crouch: 18, stand: 18, upX: -5, upY: -4, diagY: 6, diagDownY: -6 }
    },
    weapons: {
      speed: 720,
      spreadAngle: 0.16,
      duration: 12,
      fireCD: { normal: 0.18, rapid: 0.09, spread: 0.28 },
      rapidSpread: 20,
      spreadCount: 2
    },
    enemy: {
      spawnOffset: { infantry: 40, platform: { default: 40, sniper: 38 } },
      helicopterAmplitude: 60,
      helicopterPhaseSpeed: 0.8,
      helicopterYPhaseMult: 1.3,
      bossDeathDelay: 1500,
      bulletSpeed: { default: 280, turret: 320, helicopter: 260 },
      fireCD: {
        stand: [0.8, 1.8],
        patrol: [0.8, 1.8],
        sniper: [1.2, 2.2],
        turret: [0.8, 1.3],
        helicopter: [0.7, 1.2]
      },
      hp: { sniper: 2, turret: 14, helicopter: 30 },
      score: { infantry: 100, sniper: 200, turret: 1000, helicopter: 2000, boss3: 2200, boss4: 2600, boss5: 4000, stageClear: 1000 },
      activationRange: { x: 520, y: { default: 220, helicopter: 360 }, margin: 60 },
      warningTime: { default: 0.35, boss: 0.55 }
    },
    difficulty: {
      statMult: { easy: 0.75, normal: 1.0, hard: 1.3 },
      fireMult: { easy: 1.4, normal: 1.0, hard: 0.75 }
    },
    particles: {
      gravity: 400,
      muzzleFlash: { count: 4, life: 0.12, offset: 4, vx: [40, 120], vy: [40, 120] },
      hit: { count: 6, life: 0.3, vx: [-120, 120], vy: [-120, 60] },
      boom: { turret: 40, helicopter: 60, other: 14, vx: [-200, 200], vy: [-260, 60], life: [0.4, 0.9] },
      pickup: 12,
      playerHit: 20
    },
    shake: { hit: 10, enemyHit: 2, turret: 18, helicopter: 24, other: 6, decay: 30 },
    input: { jumpBuffer: 0.12, coyoteTime: 0.08, touchAim: { range: 560, yRange: 280, minVertical: 24 } },
    hud: {
      progressBarY: 16,
      progressBarW: 200,
      progressBarH: 6,
      weaponBar: { x: 106, w: 50, h: 6 },
      bossBar: { w: 360, h: 12, y: 46 }
    },
    pickup: { w: 20, h: 20, score: 50, box: { x: 12, y: 34, w: 158, h: 22 } },
    render: {
      background: { seamOverlap: 1 },
      imageScale: { turret: { w: 3.5, h: 2.6 }, helicopter: { w: 5, h: 5.2 }, boss3: { w: 3.8, h: 2.6 }, boss4: { w: 3.0, h: 2.2 }, boss5: { w: 3.6, h: 2.6 }, infantry: { w: 1.55, h: 1.35 }, sniper: { w: 1.75, h: 1.35 }, enemy1: { w: 1.55, h: 1.25 }, enemy2: { w: 1.45, h: 1.35 }, enemy3: { w: 1.5, h: 1.25 }, enemy4: { w: 1.5, h: 1.35 }, enemy5: { w: 1.5, h: 1.25 } },
      bladeAmplitude: 60,
      offscreenMargin: 40,
      trailFactor: { player: 0.02, enemy: 0.012 },
      bullet: { player: { w: 10, h: 4 }, enemy: { w: 8, h: 8, spawnY: 0.4 } },
      particle: { size: 4 },
      pickup: { drawW: 16, drawH: 18, shadowH: 3, labelOffset: 13, bobFreq: 3.33, bobAmp: 3 },
      player: { spriteH: 64, fireFrameThreshold: 0.12, blinkFreq: 12, walkFreq: 12 },
      enemy: { bobFreq: 8, tailFreq: 12, bladeFreq: 25, lightFreq: 4 }
    },
    timing: {
      timeStep: 1 / 60,
      enemyBulletLife: 2.5,
      stageMessageDuration: 2000
    },
    audio: { enabled: true, masterVolume: 0.25 },
    spatialCell: 200,
    colors: {
      skyFallbackDay: { top: '#3a7ad8', mid: '#7ab8ff', bottom: '#d8f0ff' },
      skyFallbackCave: { top: '#1a0a2a', mid: '#3a1020', bottom: '#5a1a10' },
      farMountain: '#2a1530', nearMountain: '#3a1838', moon: 'rgba(255,230,180,0.5)',
      skyDarken: 'rgba(0,0,0,0.08)', caveDarken: 'rgba(0,0,0,0.18)',
      groundBody: '#2a1a0e', groundGrass: '#1f5a1f', groundGrassHighlight: '#2f7a2f', groundTexture: '#3a2516',
      platformBody: '#5a3a1a', platformTop: '#7a5a2a', platformBottom: '#3a2510',
      playerLegs: '#2a4a8a', playerBody: '#c83030', playerHead: '#e8b878', playerScarf: '#1a8a3a', playerGun: '#444',
      turretBase: '#4a4a4a', turretMid: '#666', turretTop: '#888', turretTopLine: '#aaa', turretBarrel: '#222',
      heliBodyFallback: '#4a5a3a', heliBladeMountFallback: '#888',
      infantrySniper: '#8a5a2a', infantryDefault: '#4a4a4a', infantryLegs: '#2a2a2a', infantryBelly: '#d8b898',
      infantryEyes: '#ff4a4a', infantryGun: '#222',
      enemyBloodBg: '#300', enemyBloodFill: '#ff4040', enemyAlertLightOn: '#ff2020', enemyAlertLightOff: '#600',
      heliBladeStroke: 'rgba(200,200,200,0.6)',
      playerBulletTrail: 'rgba(255,226,74,0.35)', playerBullet: '#ffe24a',
      enemyBullet: '#ff4a4a', enemyBulletTrail: 'rgba(255,74,74,0.3)',
      enemyWarning: 'rgba(255,206,90,0.88)', enemyWarningDanger: 'rgba(255,74,74,0.95)',
      pickupRapid: '#5aff8a', pickupSpread: '#5affff', pickupLife: '#ff5a5a',
      pickupShadow: 'rgba(0,0,0,0.4)', pickupLabel: '#000',
      particleMuzzle: '#ffd24a', particleHit: '#ff7a3a', particleBoomA: '#ffce5a', particleBoomB: '#ff5a1f',
      particlePickupLife: '#ff5a5a', particlePickupWeapon: '#5affff', particlePlayerHit: '#ff4a4a',
      hudBarBg: 'rgba(0,0,0,0.5)', hudProgressFill: '#ff5a1f',
      hudWeaponRapid: '#5aff8a', hudWeaponSpread: '#5affff', hudWeaponText: '#fff',
      bossBarBg: 'rgba(0,0,0,0.68)', bossBarFill: '#ff4a4a', bossBarArmor: '#ffce5a',
      endVictory: '#5ad7ff', endDefeat: '#ff4a4a', endShadow: '#000', endHighScore: '#ccc',
      endGradient1: '#ff9a4a', endGradient2: '#ffd75a', endGradient3: '#7ad7ff'
    },

    art: {
      sky: {
        farMountains: { count: 6, spacing: 240, peak: { x: 120, y: -160 } },
        nearMountains: { count: 6, spacing: 200, peak: { x: 100, y: -110 } },
        moon: { x: -130, y: 90, r: 38 }
      },
      platform: {
        grassH: 8,
        grassStrip: { w: 8, h: 4, spacing: 14 },
        texture: { spacingX: 22, spacingY: 26, oddOffset: 6, w: 5, h: 4 },
        topH: 5,
        bottomH: 4
      },
      hud: {
        font: 'bold 12px monospace',
        weaponText: { x: 18, yOffset: 18 }
      },
      player: {
        fallback: {
          legProne: { x: -12, y: 12, w: 24, h: 8 },
          legCrouch: [{ x: -8, y: 24, w: 7, h: 10 }, { x: 2, y: 24, w: 7, h: 10 }],
          legStand: [{ x: -7, y: 30, w: 6, h: 14 }, { x: 2, y: 30, w: 6, h: 14 }],
          bodyProne: { x: -13, y: 4, w: 26, h: 12 },
          bodyStand: { x: -9, bottom: 32, w: 18, h: 18 },
          head: { x: -7, bottom: 44, w: 14, h: 14 },
          scarf: { x: -7, bottom: 44, w: 14, h: 4 },
          gunProne: { x: 8, y: 6, w: 16, h: 4 },
          gunUp: { x: -2, bottom: 52, w: 4, h: 22 },
          gunDown: { x: -2, bottom: 18, w: 4, h: 22 },
          gunDiag: { transX: 4, len: 22 },
          gunSide: { x: 6, bottom: 26, w: 18, h: 4 }
        }
      },
      enemy: {
        fallback: {
          turret: {
            base: { x: -35, bottom: 30, w: 70, h: 30, color: '#4a4a4a' },
            mid: { x: -30, bottom: 40, w: 60, h: 12, color: '#666' },
            top: { x: -22, bottom: 70, w: 44, h: 32, color: '#888' },
            topLine: { x: -16, bottom: 78, w: 32, h: 12, color: '#aaa' },
            barrel: { x: 10, bottom: 60, w: 34, h: 10, color: '#222' },
            bloodBar: { x: -30, bottom: 92, w: 60, h: 6 },
            light: { bottom: 74, r: 4 }
          },
          helicopter: {
            body: { x: -60, y: 10, w: 120, h: 40, color: '#4a5a3a' },
            bladeMount: { x: -80, y: 25, w: 160, h: 4, color: '#888' },
            bloodBar: { x: -60, y: -24, w: 120, h: 6 },
            bladeYFallback: -30
          },
          infantry: {
            ears: [[-8, 2, -10, -6, -2, 0], [8, 2, 10, -6, 2, 0]],
            legs: [{ x: -7, y: 28, w: 5, h: 12 }, { x: 2, y: 28, w: 5, h: 12 }],
            body: { x: -9, y: 14, w: 18, h: 16 },
            belly: { x: -5, y: 20, w: 10, h: 8 },
            head: { x: -8, y: 2, w: 16, h: 14 },
            eyes: [{ x: -4, y: 7 }, { x: 2, y: 7 }],
            gun: { x: 6, y: 18, h: 3, wSniper: 22, wDefault: 14 },
            tail: { startX: -9, startY: 22, cpX: -18, cpY: 18, endX: -16, endY: 8, waveAmp: 4 },
            sniperBloodBar: { x: -10, y: -4, w: 20, h: 3 }
          }
        }
      }
    }
  };

  // CONFIG 初始化完成后，把回退造型颜色绑定到 colors 配置，避免在对象字面量内产生 TDZ 引用
  (() => {
    const fb = CONFIG.art.enemy.fallback;
    fb.turret.base.color = CONFIG.colors.turretBase;
    fb.turret.mid.color = CONFIG.colors.turretMid;
    fb.turret.top.color = CONFIG.colors.turretTop;
    fb.turret.topLine.color = CONFIG.colors.turretTopLine;
    fb.turret.barrel.color = CONFIG.colors.turretBarrel;
    fb.helicopter.body.color = CONFIG.colors.heliBodyFallback;
    fb.helicopter.bladeMount.color = CONFIG.colors.heliBladeMountFallback;
  })();

  const overlay = document.getElementById('overlay');
  const menuCard = overlay.querySelector('.card');
  let endCard = null;
  const startBtn = document.getElementById('startBtn');
  const lifeEl = document.getElementById('life');
  const scoreEl = document.getElementById('score');
  const highScoreEl = document.getElementById('highScore');
  const stageEl = document.getElementById('stage');
  const coverArt = document.getElementById('coverArt');
  const helpBtn = document.getElementById('helpBtn');
  const helpPanel = document.getElementById('helpPanel');
  const helpBackdrop = document.getElementById('helpBackdrop');
  const helpClose = document.getElementById('helpClose');
  const difficultySummary = document.getElementById('difficultySummary');
  const diffButtons = Array.from(document.querySelectorAll('.diff-btn'));
  const pauseOverlay = document.getElementById('pauseOverlay');
  const pauseStatus = document.getElementById('pauseStatus');
  const pauseStageNote = document.getElementById('pauseStageNote');
  const difficultyLabels = {
    easy: '简单',
    normal: '普通',
    hard: '困难'
  };
  const difficultySummaries = {
    easy: '敌人韧性较低，弹幕更稀疏，适合首轮推进。',
    normal: '标准生命与火力，推荐完整体验。',
    hard: '敌人更耐打且开火更快，适合挑战通关节奏。'
  };

  // 封面加载失败时隐藏图片
  coverArt.onerror = () => { coverArt.style.display = 'none'; };

  // 操作说明弹窗控制
  function showHelp(show) {
    helpPanel.classList.toggle('show', show);
    helpBackdrop.classList.toggle('show', show);
    helpPanel.setAttribute('aria-hidden', String(!show));
    helpBtn.setAttribute('aria-expanded', String(show));
    helpBtn.textContent = show ? '关闭说明' : '操作说明';
    if (show) {
      helpClose.focus({ preventScroll: true });
    } else if (helpPanel.contains(document.activeElement)) {
      helpBtn.focus({ preventScroll: true });
    }
  }
  helpBtn.onclick = () => showHelp(!helpPanel.classList.contains('show'));
  helpClose.onclick = () => showHelp(false);
  helpBackdrop.onclick = () => showHelp(false);

  // ---------- 输入 ----------
  const input = {
    keys: {},
    mouse: { x: 0, y: 0, down: false },
    touch: { left: false, right: false, up: false, down: false, jump: false, fire: false },
    jumpBuffer: 0,
    coyoteTime: 0,
    jumpHeld: false
  };

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && helpPanel.classList.contains('show')) {
      showHelp(false);
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter' && !gameState.running && overlay.style.display !== 'none' && menuCard && !menuCard.hidden && !startBtn.disabled && document.activeElement === document.body) {
      startBtn.click();
      e.preventDefault();
      return;
    }
    input.keys[e.key.toLowerCase()] = true;
    if ((e.key === ' ' || e.key === 'ArrowUp') && !input.jumpHeld) {
      input.jumpHeld = true;
      input.jumpBuffer = CONFIG.input.jumpBuffer;
    }
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    if ((e.key === 'Escape' || e.key.toLowerCase() === 'p') && gameState.running && !gameState.gameOver && !gameState.win) {
      togglePause();
    }
  });
  window.addEventListener('keyup', e => {
    input.keys[e.key.toLowerCase()] = false;
    if (e.key === ' ' || e.key === 'ArrowUp') input.jumpHeld = false;
  });

  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = (e.clientX - r.left) * (W / r.width);
    input.mouse.y = (e.clientY - r.top) * (H / r.height);
  });
  canvas.addEventListener('mousedown', () => { input.mouse.down = true; });
  window.addEventListener('mouseup', () => { input.mouse.down = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // 移动端可视化虚拟按键
  const mobileControls = document.getElementById('mobileControls');
  const btnLeft = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');
  const btnUp = document.getElementById('btnUp');
  const btnDown = document.getElementById('btnDown');
  const btnJump = document.getElementById('btnJump');
  const btnFire = document.getElementById('btnFire');
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    mobileControls.classList.add('show');
  }
  function setMobileControlsActive(active) {
    mobileControls.classList.toggle('active', active && mobileControls.classList.contains('show'));
  }
  function bindMobileButton(btn, stateKey, opts = {}) {
    const set = (active) => {
      input.touch[stateKey] = active;
      btn.classList.toggle('active', active);
      if (active && opts.jump) input.jumpBuffer = CONFIG.input.jumpBuffer;
    };
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); set(true); if (opts.fire) input.mouse.down = true; audio.resume(); }, { passive: false });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); set(false); if (opts.fire && !input.touch.fire) input.mouse.down = false; }, { passive: false });
    btn.addEventListener('touchcancel', (e) => { e.preventDefault(); set(false); if (opts.fire) input.mouse.down = false; }, { passive: false });
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); set(true); if (opts.fire) input.mouse.down = true; });
    btn.addEventListener('mouseup', (e) => { e.preventDefault(); set(false); if (opts.fire) input.mouse.down = false; });
    btn.addEventListener('mouseleave', () => { set(false); if (opts.fire) input.mouse.down = false; });
  }
  bindMobileButton(btnLeft, 'left');
  bindMobileButton(btnRight, 'right');
  bindMobileButton(btnUp, 'up');
  bindMobileButton(btnDown, 'down');
  bindMobileButton(btnJump, 'jump', { jump: true });
  bindMobileButton(btnFire, 'fire', { fire: true });

  // 窗口失焦时清空输入并自动暂停
  window.addEventListener('blur', () => {
    input.keys = {};
    input.mouse.down = false;
    input.touch.left = input.touch.right = input.touch.up = input.touch.down = input.touch.jump = input.touch.fire = false;
    input.jumpBuffer = 0;
    input.coyoteTime = 0;
    input.jumpHeld = false;
    if (gameState.running && !gameState.gameOver && !gameState.win && !gameState.paused) togglePause();
  });
  window.addEventListener('mouseleave', () => { input.mouse.down = false; });

  // ---------- 工具 ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const aabb = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const bulletHitPlatform = b => false; // 子弹可穿透平台等所有障碍物
  const imageReady = img => img.complete && img.naturalWidth > 0;
  const enemyDirToPlayer = e => (player.x + player.w / 2) < (e.x + e.w / 2) ? -1 : 1;

  // ---------- Web Audio 合成音效 ----------
  const audio = {
    ctx: null, master: null, enabled: CONFIG.audio.enabled,
    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = CONFIG.audio.masterVolume;
      this.master.connect(this.ctx.destination);
    },
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    noiseBuffer(duration) {
      const samples = Math.ceil(this.ctx.sampleRate * duration);
      const buf = this.ctx.createBuffer(1, samples, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < samples; i++) d[i] = Math.random() * 2 - 1;
      return buf;
    },
    play(type) {
      if (!this.enabled || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.master);
      switch (type) {
        case 'shoot':
          osc.type = 'square';
          osc.frequency.setValueAtTime(880, t);
          osc.frequency.exponentialRampToValueAtTime(220, t + 0.08);
          gain.gain.setValueAtTime(0.12, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          osc.start(t); osc.stop(t + 0.08);
          break;
        case 'enemyShoot':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(320, t);
          osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);
          gain.gain.setValueAtTime(0.1, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          osc.start(t); osc.stop(t + 0.12);
          break;
        case 'hit':
          osc.type = 'square';
          osc.frequency.setValueAtTime(1200, t);
          osc.frequency.exponentialRampToValueAtTime(600, t + 0.05);
          gain.gain.setValueAtTime(0.08, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
          osc.start(t); osc.stop(t + 0.05);
          break;
        case 'explosion': {
          const dur = 0.3;
          const src = this.ctx.createBufferSource();
          src.buffer = this.noiseBuffer(dur);
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.22, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + dur);
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(800, t);
          filter.frequency.exponentialRampToValueAtTime(100, t + dur);
          src.connect(filter);
          filter.connect(g);
          g.connect(this.master);
          src.start(t); src.stop(t + dur);
          break;
        }
        case 'pickup':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(660, t);
          osc.frequency.setValueAtTime(880, t + 0.05);
          gain.gain.setValueAtTime(0.12, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.15);
          osc.start(t); osc.stop(t + 0.15);
          break;
        case 'playerHit':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(200, t);
          osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
          gain.gain.setValueAtTime(0.18, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
          osc.start(t); osc.stop(t + 0.2);
          break;
        case 'jump':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(300, t);
          osc.frequency.linearRampToValueAtTime(600, t + 0.1);
          gain.gain.setValueAtTime(0.08, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.1);
          osc.start(t); osc.stop(t + 0.1);
          break;
      }
    }
  };

  // 简单空间网格：按 x 轴分桶加速子弹-敌人碰撞
  function buildEnemySpatialGrid(enemies) {
    const grid = new Map();
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const cell = CONFIG.spatialCell;
      const box = enemyHurtBox(enemy);
      const minKey = Math.floor(box.x / cell);
      const maxKey = Math.floor((box.x + box.w) / cell);
      for (let key = minKey; key <= maxKey; key++) {
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(enemy);
      }
    }
    return grid;
  }
  function getEnemiesNear(grid, x) {
    const cell = CONFIG.spatialCell;
    const key = Math.floor(x / cell);
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
    boss3: new Image(),
    boss4: new Image(),
    boss5: new Image(),
    bg3: new Image(),
    bg4: new Image(),
    bg5: new Image(),
    infantry: new Image(),
    enemy1: new Image(),
    enemy2: new Image(),
    enemy3: new Image(),
    enemy4: new Image(),
    enemy5: new Image()
  };
  const assetMeta = [
    { key: 'bg', src: 'assets/cat_bg.jpg?v=4', required: true },
    { key: 'hero', src: 'assets/cat_hero_sheet.png?v=3', required: true },
    { key: 'boss', src: 'assets/cat_boss.png?v=3', required: false },
    { key: 'skyBg', src: 'assets/sky_bg.jpg?v=4', required: false },
    { key: 'heliBoss', src: 'assets/heli_boss.png?v=3', required: false },
    { key: 'boss3', src: 'assets/boss3_mech.png?v=2', required: false },
    { key: 'boss4', src: 'assets/boss4_airship.png?v=2', required: false },
    { key: 'boss5', src: 'assets/boss5_tank.png?v=2', required: false },
    { key: 'bg3', src: 'assets/bg3_city.jpg?v=2', required: false },
    { key: 'bg4', src: 'assets/bg4_fortress.jpg?v=2', required: false },
    { key: 'bg5', src: 'assets/bg5_lava.jpg?v=2', required: false },
    { key: 'infantry', src: 'assets/enemy_infantry.png?v=1', required: false },
    { key: 'enemy1', src: 'assets/enemy1_mousetank.png?v=2', required: false },
    { key: 'enemy2', src: 'assets/enemy2_paratrooper.png?v=2', required: false },
    { key: 'enemy3', src: 'assets/enemy3_rat.png?v=2', required: false },
    { key: 'enemy4', src: 'assets/enemy4_skyknight.png?v=2', required: false },
    { key: 'enemy5', src: 'assets/enemy5_flameguard.png?v=2', required: false },
  ];
  function loadAssets(onProgress, cb) {
    let loaded = 0, errors = 0, requiredDone = 0;
    const total = assetMeta.length;
    const requiredTotal = assetMeta.filter(m => m.required).length;
    let readyNotified = false;
    const onDone = () => {
      if (onProgress) onProgress(requiredTotal === 0 ? 1 : requiredDone / requiredTotal);
      if (!readyNotified && requiredDone >= requiredTotal) {
        readyNotified = true;
        if (cb) cb();
      }
      if (loaded + errors === total && errors > 0) console.warn('[喵喵突击队] 资源加载完成，' + errors + '/' + total + ' 个失败');
    };
    for (const meta of assetMeta) {
      const img = assets[meta.key];
      img.onload = () => { loaded++; if (meta.required) requiredDone++; onDone(); };
      img.onerror = () => { errors++; if (meta.required) requiredDone++; onDone(); };
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
    accumulator: 0, totalTime: 0,
    stats: freshRunStats()
  };
  function freshRunStats() {
    return {
      shots: 0,
      hits: 0,
      kills: 0,
      bosses: 0,
      pickups: 0,
      damageTaken: 0,
      falls: 0,
      elapsed: 0
    };
  }
  try {
    const save = JSON.parse(localStorage.getItem('catFlagSquadSave') || '{}');
    if (save && save.version === 1) gameState.highScore = parseInt(save.highScore, 10) || 0;
  } catch (e) {}
  const world = {
    platforms: [], enemies: [], bullets: [], enemyBullets: [], particles: [], pickups: []
  };
  const LEVELS = (typeof LEVEL_DATA === 'object' && LEVEL_DATA) ? LEVEL_DATA : {};
  const LEVEL_IDS = Object.keys(LEVELS).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  const FIRST_STAGE = LEVEL_IDS[0] || 1;
  const LAST_STAGE = LEVEL_IDS[LEVEL_IDS.length - 1] || 1;
  const STAGE_NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const BOSS_NAMES = {
    turret: '钢铁炮台',
    helicopter: '旋翼堡垒',
    boss3: '重装机甲',
    boss4: '天空飞艇',
    boss5: '熔岩坦克王'
  };
  const stageLabel = stage => STAGE_NUMERALS[stage - 1] || String(stage);
  function clampStage(stage) {
    const requested = Number(stage) || FIRST_STAGE;
    if (LEVEL_IDS.length === 0) return FIRST_STAGE;
    if (LEVEL_IDS.includes(requested)) return requested;
    if (requested <= FIRST_STAGE) return FIRST_STAGE;
    if (requested >= LAST_STAGE) return LAST_STAGE;
    return LEVEL_IDS.find(id => id >= requested) || LAST_STAGE;
  }
  function nextStageAfter(stage) {
    const current = clampStage(stage);
    const idx = LEVEL_IDS.indexOf(current);
    return LEVEL_IDS[idx + 1] || current;
  }

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

  function validateLevelData() {
    const warnings = [];
    for (const stage of LEVEL_IDS) {
      const data = LEVELS[stage];
      if (!data) {
        warnings.push(`第${stage}关缺少关卡数据`);
        continue;
      }
      const boss = normalizeBoss(data.boss);
      if (!boss) warnings.push(`第${stage}关缺少 Boss`);
      else if (!ENEMY_TYPES[boss.type]) warnings.push(`第${stage}关 Boss 类型未知: ${boss.type}`);
      if (boss && ENEMY_TYPES[boss.type]?.movement === 'orbit' && (boss.centerY == null || boss.radius == null)) {
        warnings.push(`第${stage}关飞行 Boss 缺少 centerY/radius: ${boss.type}`);
      }

      const enemyGroups = [
        ...(data.infantry || []).map(normalizeInfantry),
        ...(data.platformEnemies || []).map(normalizePlatformEnemy),
        ...(data.specialEnemies || []).map(normalizeSpecialEnemy),
        ...(data.snipers || []).map(e => ({ ...normalizeSniper(e), type: 'sniper' }))
      ];
      for (const enemy of enemyGroups) {
        if (!ENEMY_TYPES[enemy.type]) warnings.push(`第${stage}关敌人类型未知: ${enemy.type}`);
        if (enemy.movement === 'patrol' || ENEMY_TYPES[enemy.type]?.movement === 'patrol') {
          if (enemy.patrolMin == null || enemy.patrolMax == null) warnings.push(`第${stage}关巡逻敌人缺少巡逻范围: ${enemy.type}@${enemy.x}`);
        }
      }
    }
    if (warnings.length) console.warn('[喵喵突击队] 关卡数据检查：\n' + warnings.join('\n'));
  }

  function buildLevel() {
    world.platforms = [];
    world.enemies = [];
    world.bullets = []; world.enemyBullets = []; world.particles = []; world.pickups = [];
    const fireMult = enemyFireMult();
    const data = LEVELS[gameState.stage];
    if (!data) return;

    // 地面平台
    if (data.startGround) {
      const startGround = normalizeGroundSegment({ x: data.startGround[0], end: data.startGround[1] });
      world.platforms.push({ x: startGround.x, y: GROUND_Y, w: startGround.end, h: CONFIG.world.groundHeight, type: 'ground' });
    }
    for (const item of data.groundSegments || []) {
      const segment = normalizeGroundSegment(item);
      const endX = segment.end === 'end' ? WORLD_LEN : segment.end;
      world.platforms.push({ x: segment.x, y: GROUND_Y, w: endX - segment.x, h: CONFIG.world.groundHeight, type: 'ground' });
    }
    // 浮空平台
    for (const item of data.floats || []) {
      const p = normalizeFloat(item);
      world.platforms.push({ x: p.x, y: GROUND_Y + p.yOffset, w: p.w, h: CONFIG.world.platHeight, type: 'plat' });
    }

    // 找到某x坐标下方最高实体平台/地面的顶部Y（用于避免敌人悬空）
    function groundYAt(x, w) {
      const cx = x + (w || 38) / 2;
      let bestY = GROUND_Y;
      for (const p of world.platforms) {
        if (cx >= p.x && cx <= p.x + p.w && p.y < bestY) bestY = p.y;
      }
      return bestY;
    }
    // 把巡逻范围限制在当前站立的平台上，防止走出平台边缘掉落
    function clampPatrolToGround(en) {
      const cx = en.x + en.w / 2;
      for (const p of world.platforms) {
        if (cx >= p.x && cx <= p.x + p.w) {
          en.patrolMin = Math.max(en.patrolMin == null ? p.x : en.patrolMin, p.x);
          en.patrolMax = Math.min(en.patrolMax == null ? p.x + p.w : en.patrolMax, p.x + p.w - en.w);
          return;
        }
      }
    }

    // 普通敌人
    for (const item of data.infantry || []) {
      const e = normalizeInfantry(item);
      const type = e.type;
      const gw = groundYAt(e.x, enemyConfig(type).w);
      const en = makeEnemy(e.x, gw - CONFIG.enemy.spawnOffset.infantry, type);
      if (enemyMovement(en) === 'patrol') { en.patrolMin = e.patrolMin; en.patrolMax = e.patrolMax; clampPatrolToGround(en); }
      world.enemies.push(en);
    }
    // 狙击手
    for (const item of data.snipers || []) {
      const e = normalizeSniper(item);
      const gw = groundYAt(e.x, ENEMY_TYPES.sniper.w);
      world.enemies.push(makeEnemy(e.x, gw - CONFIG.enemy.spawnOffset.platform.sniper, 'sniper'));
    }
    // 平台敌人
    for (const item of data.platformEnemies || []) {
      const e = normalizePlatformEnemy(item);
      const { x: px, yOffset: pyOff, type, patrolMin: min, patrolMax: max } = e;
      const off = CONFIG.enemy.spawnOffset.platform;
      const y = GROUND_Y + pyOff - (type === 'sniper' ? off.sniper : off.default);
      const en = makeEnemy(px, y, type);
      if (enemyMovement(en) === 'patrol') { en.patrolMin = min; en.patrolMax = max; clampPatrolToGround(en); }
      world.enemies.push(en);
    }
    // 关卡特色怪物
    for (const item of data.specialEnemies || []) {
      const e = normalizeSpecialEnemy(item);
      if (e.movement === 'orbit' || enemyConfig(e.type).movement === 'orbit') {
        const centerY = e.yAbs ? e.centerY : GROUND_Y + e.centerY;
        const en = makeEnemy(e.x, centerY, e.type);
        en.phase = 0; en.centerX = e.x; en.centerY = centerY; en.radius = e.radius || 0;
        world.enemies.push(en);
      } else {
        const gw = groundYAt(e.x, enemyConfig(e.type).w);
        const en = makeEnemy(e.x, gw - CONFIG.enemy.spawnOffset.infantry, e.type);
        en.patrolMin = e.patrolMin; en.patrolMax = e.patrolMax;
        clampPatrolToGround(en);
        world.enemies.push(en);
      }
    }

    // Boss
    const bossData = normalizeBoss(data.boss);
    if (!bossData) return;
    const bx = bossData.x < 0 ? WORLD_LEN + bossData.x : bossData.x;
    const by = bossData.yAbs ? bossData.y : GROUND_Y + bossData.y;
    const boss = makeEnemy(bx, by, bossData.type);
    boss.isBoss = true;
    boss.w = bossData.w ?? boss.w;
    boss.h = bossData.h ?? boss.h;
    const bossHpMult = bossData.hpMult || 1;
    boss.hp = Math.max(1, Math.round(boss.hp * bossHpMult));
    boss.maxhp = boss.hp;
    if (bossData.fireCD != null) boss.fireCD = bossData.fireCD * fireMult;
    if (bossData.centerY != null || enemyMovement(boss) === 'orbit') {
      const centerY = bossData.centerY == null ? by : (bossData.yAbs ? bossData.centerY : GROUND_Y + bossData.centerY);
      boss.phase = 0; boss.centerX = bx; boss.centerY = centerY; boss.radius = bossData.radius || 0;
    }
    world.enemies.push(boss);

    // 拾取物
    world.pickups = [];
    for (const item of data.pickups || []) {
      const p = normalizePickup(item);
      world.pickups.push({ x: p.x, y: GROUND_Y + p.yOffset, type: p.type });
    }
  }

  const ENEMY_TYPES = {
    stand:      { w: 38, h: 42, hpBase: 1,       speed: 0,   fireCD: CONFIG.enemy.fireCD.stand, movement: 'static', attack: 'single', score: CONFIG.enemy.score.infantry },
    patrol:     { w: 38, h: 42, hpBase: 1,       speed: -40, fireCD: CONFIG.enemy.fireCD.patrol, movement: 'patrol', attack: 'single', score: CONFIG.enemy.score.infantry },
    sniper:     { w: 38, h: 42, hpKey: 'sniper',  speed: 0,   fireCD: CONFIG.enemy.fireCD.sniper, movement: 'static', attack: 'single', score: CONFIG.enemy.score.sniper },
    turret:     { w: 30, h: 40, hpKey: 'turret',  speed: 0,   fireCD: CONFIG.enemy.fireCD.turret, movement: 'groundLocked', attack: 'single', score: CONFIG.enemy.score.turret, centerFire: true, hurtBoxScale: { w: 2.2, h: 2.0 } },
    helicopter: { w: 30, h: 40, hpKey: 'helicopter', speed: 0, fireCD: CONFIG.enemy.fireCD.helicopter, movement: 'orbit', attack: 'single', score: CONFIG.enemy.score.helicopter, centerFire: true, assetFacing: -1, hurtBoxScale: { w: 3.8, h: 3.2 } },
    boss3:      { w: 80, h: 100, hpKey: 'turret', speed: 0, fireCD: CONFIG.enemy.fireCD.turret, movement: 'groundLocked', attack: 'single', boss: true, score: CONFIG.enemy.score.boss3, centerFire: true, assetFacing: -1, hurtBoxScale: { w: 2.8, h: 2.0 } },
    boss4:      { w: 170, h: 100, hpKey: 'helicopter', speed: 0, fireCD: CONFIG.enemy.fireCD.helicopter, movement: 'orbit', attack: 'single', boss: true, score: CONFIG.enemy.score.boss4, centerFire: true, assetFacing: -1, hurtBoxScale: { w: 2.4, h: 1.8 } },
    boss5:      { w: 90, h: 110, hpKey: 'turret', speed: 0, fireCD: CONFIG.enemy.fireCD.turret, movement: 'groundLocked', attack: 'boss5Phase', boss: true, score: CONFIG.enemy.score.boss5, centerFire: true, assetFacing: 1, hurtBoxScale: { w: 2.8, h: 2.2 } },
    mousetank:  { w: 38, h: 42, hpBase: 4,       speed: -25, fireCD: CONFIG.enemy.fireCD.patrol, movement: 'patrol', groundLocked: true, attack: 'single', score: 180, centerFire: true, hurtBoxScale: { w: 1.25, h: 1.1 } },
    paratrooper:{ w: 38, h: 42, hpBase: 2,       speed: 0,   fireCD: CONFIG.enemy.fireCD.stand, movement: 'orbit', attack: 'single', score: 150, hurtBoxScale: { w: 1.2, h: 1.15 } },
    rat:        { w: 38, h: 42, hpBase: 3,       speed: -90, fireCD: CONFIG.enemy.fireCD.patrol, movement: 'patrol', groundLocked: true, attack: 'single', score: 160, hurtBoxScale: { w: 1.25, h: 1.1 } },
    skyknight:  { w: 38, h: 42, hpBase: 3,       speed: 0,   fireCD: CONFIG.enemy.fireCD.sniper, movement: 'orbit', attack: 'single', score: 220, hurtBoxScale: { w: 1.25, h: 1.15 } },
    flameguard: { w: 38, h: 42, hpBase: 5,       speed: -30, fireCD: CONFIG.enemy.fireCD.stand, movement: 'patrol', groundLocked: true, attack: 'flameSpread', score: 260, centerFire: true, hurtBoxScale: { w: 1.25, h: 1.1 } }
  };

  function enemyConfig(type) {
    return ENEMY_TYPES[type] || ENEMY_TYPES.stand;
  }
  function enemyMovement(enemyOrType) {
    const type = typeof enemyOrType === 'string' ? enemyOrType : enemyOrType.type;
    return enemyConfig(type).movement || 'static';
  }
  function enemyAttack(enemyOrType) {
    const type = typeof enemyOrType === 'string' ? enemyOrType : enemyOrType.type;
    return enemyConfig(type).attack || 'single';
  }
  function applyEnemyFacing(e) {
    // assetFacing 表示素材原图朝向：1 向右，-1 向左。
    const assetFacing = enemyConfig(e.type).assetFacing || 1;
    if (e.dir !== assetFacing) ctx.scale(-1, 1);
  }
  function isBossEnemy(e) {
    return !!e.isBoss || !!enemyConfig(e.type).boss;
  }
  function enemyScore(e) {
    return enemyConfig(e.type).score ?? CONFIG.enemy.score[e.type] ?? CONFIG.enemy.score.infantry;
  }
  function enemyBoomCount(e) {
    return enemyConfig(e.type).boomCount ?? CONFIG.particles.boom[e.type] ?? CONFIG.particles.boom.other;
  }
  function enemyShake(e) {
    return enemyConfig(e.type).shake ?? CONFIG.shake[e.type] ?? CONFIG.shake.other;
  }
  function enemyBulletSpeed(e) {
    return enemyConfig(e.type).bulletSpeed ?? CONFIG.enemy.bulletSpeed[e.type] ?? CONFIG.enemy.bulletSpeed.default;
  }
  function enemyActivationY(e) {
    return enemyConfig(e.type).activationY ?? CONFIG.enemy.activationRange.y[e.type] ?? CONFIG.enemy.activationRange.y.default;
  }
  function enemyHurtBox(e) {
    const cfg = enemyConfig(e.type);
    const scale = cfg.hurtBoxScale || { w: 1, h: 1 };
    const w = e.w * scale.w;
    const h = e.h * scale.h;
    const x = e.x + e.w / 2 - w / 2;
    const bottomAligned = enemyMovement(e) === 'groundLocked' || cfg.groundLocked;
    const y = bottomAligned ? e.y + e.h - h : e.y + e.h / 2 - h / 2;
    return { x, y, w, h };
  }
  function enemyPlayerFireInfo(e) {
    const dxp = (player.x + player.w / 2) - (e.x + e.w / 2);
    const dyp = (player.y + player.h / 2) - (e.y + e.h / 2);
    const dist = Math.abs(dxp);
    const verticalOK = Math.abs(player.y - e.y) < enemyActivationY(e);
    const onScreen = e.x > gameState.camX - CONFIG.enemy.activationRange.margin && e.x < gameState.camX + W + CONFIG.enemy.activationRange.margin;
    return {
      dxp,
      dyp,
      baseAng: Math.atan2(dyp, dxp),
      active: dist < CONFIG.enemy.activationRange.x && verticalOK && onScreen
    };
  }
  function enemyWarningDuration(e) {
    return isBossEnemy(e) ? CONFIG.enemy.warningTime.boss : CONFIG.enemy.warningTime.default;
  }
  function enemyMuzzlePoint(e) {
    const centerFire = !!enemyConfig(e.type).centerFire;
    const attack = enemyAttack(e);
    return {
      x: centerFire ? e.x + e.w / 2 : (e.dir > 0 ? e.x + e.w : e.x),
      y: e.y + e.h * (attack === 'boss5Phase' ? 0.35 : CONFIG.render.bullet.enemy.spawnY)
    };
  }
  function enemyWarningAngles(e, baseAng) {
    const attack = enemyAttack(e);
    if (attack === 'flameSpread') return [-0.18, 0, 0.18].map(offset => baseAng + offset);
    if (attack === 'boss5Phase') {
      const hpRatio = e.hp / e.maxhp;
      if (hpRatio > 0.6) return [-0.15, 0, 0.15].map(offset => baseAng + offset);
      if (hpRatio > 0.3) return [-0.24, -0.12, 0, 0.12, 0.24].map(offset => baseAng + offset);
      return [-0.36, -0.24, -0.12, 0, 0.12, 0.24, 0.36].map(offset => baseAng + offset);
    }
    return [baseAng];
  }
  function currentBoss() {
    return world.enemies.find(e => {
      if (e.dead || !isBossEnemy(e)) return false;
      const nearScreen = e.x + e.w > gameState.camX - 160 && e.x < gameState.camX + W + 220;
      const nearPlayer = player.x > e.x - W * 0.85;
      return nearScreen || nearPlayer;
    }) || null;
  }
  function bossDisplayName(e) {
    return BOSS_NAMES[e.type] || '黑猫头目';
  }
  function bossPhaseText(e) {
    const ratio = e.hp / e.maxhp;
    if (enemyAttack(e) === 'boss5Phase') {
      if (ratio > 0.6) return '阶段一';
      if (ratio > 0.3) return '阶段二';
      return '暴走阶段';
    }
    if (ratio <= 0.35) return '狂暴';
    if (ratio <= 0.65) return '破甲';
    return '交战';
  }
  function findTouchAimTarget(ax) {
    const cfg = CONFIG.input.touchAim;
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const facing = ax || player.dir || 1;
    let best = null;
    let bestScore = Infinity;
    for (const e of world.enemies) {
      if (e.dead) continue;
      const box = enemyHurtBox(e);
      const ex = box.x + box.w / 2;
      const ey = box.y + box.h / 2;
      const dx = ex - px;
      const dy = ey - py;
      if (dx * facing < -28) continue;
      if (Math.abs(dx) > cfg.range || Math.abs(dy) > cfg.yRange) continue;
      const sx = ex - gameState.camX;
      if (sx < -80 || sx > W + 80) continue;
      const score = Math.abs(dx) + Math.abs(dy) * 0.7 - (isBossEnemy(e) ? 100 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = { enemy: e, dy };
      }
    }
    return best;
  }
  function touchAimAssistAim(ax, explicitVertical) {
    if (!input.touch.fire || explicitVertical || player.prone) return null;
    const target = findTouchAimTarget(ax);
    if (!target) return null;
    if (Math.abs(target.dy) < CONFIG.input.touchAim.minVertical) return 'side';
    return target.dy < 0 ? 'diagup' : 'diagdown';
  }
  validateLevelData();

  function makeEnemy(x, y, type) {
    const statMult = enemyStatMult();
    const fireMult = enemyFireMult();
    const cfg = enemyConfig(type);
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
    life: CONFIG.player.life.normal, fireCD: 0, weapon: 'normal', weaponTimer: 0,
    invuln: 0, crouch: false, prone: false, anim: 0, dead: false, respawn: 0, aim: 'side', jumpsLeft: CONFIG.physics.airJumps,
    maxLife: CONFIG.player.life.normal,
  };

  function resetPlayer(full) {
    let targetX = Math.max(CONFIG.player.startX, gameState.camX + CONFIG.world.respawnCamOffset);
    // 找到重生点下方最高的平台，避免第二关悬空重生直接掉落
    let py = null;
    for (const p of world.platforms) {
      if (targetX + player.w > p.x && targetX < p.x + p.w) {
        if (py === null || p.y < py) py = p.y;
      }
    }
    if (py === null) {
      // 没有平台时回到关卡起点
      targetX = CONFIG.player.startX;
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
    player.jumpsLeft = CONFIG.physics.airJumps;
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
    const so = CONFIG.player.shootOffsets;
    let y = player.y + (player.prone ? so.prone : (player.crouch ? so.crouch : so.stand));
    let bvx = dir * speed, bvy = 0;
    if (aim === 'up') { x = player.x + player.w / 2 + so.upX; y = player.y + so.upY; bvx = 0; bvy = -speed; }
    else if (aim === 'down') { x = player.x + player.w / 2 + so.upX; y = player.y + player.h + so.upY; bvx = 0; bvy = speed; }
    else if (aim === 'diagup') {
      x = dir > 0 ? player.x + player.w : player.x;
      y = player.y + so.diagY;
      bvx = dir * speed * Math.SQRT1_2; bvy = -speed * Math.SQRT1_2;
    }
    else if (aim === 'diagdown') {
      x = dir > 0 ? player.x + player.w : player.x;
      y = player.y + player.h - so.diagY;
      bvx = dir * speed * Math.SQRT1_2; bvy = speed * Math.SQRT1_2;
    }
    const pbb = CONFIG.render.bullet.player;
    const base = { x, y, w: pbb.w, h: pbb.h, vx: bvx, vy: bvy, life: 1.0, owner: 'p' };
    let fired = 0;
    if (player.weapon === 'normal') {
      world.bullets.push({ ...base });
      fired = 1;
      player.fireCD = CONFIG.weapons.fireCD.normal;
    } else if (player.weapon === 'rapid') {
      const rs = CONFIG.weapons.rapidSpread;
      world.bullets.push({ ...base, vx: bvx + rand(-rs, rs), vy: bvy + rand(-rs, rs) });
      fired = 1;
      player.fireCD = CONFIG.weapons.fireCD.rapid;
    } else if (player.weapon === 'spread') {
      // 散射：以瞄准方向为中心扇形扩散
      const ang0 = Math.atan2(bvy, bvx);
      const sc = CONFIG.weapons.spreadCount;
      for (let i = -sc; i <= sc; i++) {
        const ang = ang0 + i * CONFIG.weapons.spreadAngle;
        world.bullets.push({ ...base, vx: speed * Math.cos(ang), vy: speed * Math.sin(ang) });
        fired++;
      }
      player.fireCD = CONFIG.weapons.fireCD.spread;
    }
    gameState.stats.shots += fired;
    audio.play('shoot');
    // 枪口火花（沿射击方向）
    const sgnx = bvx === 0 ? 0 : Math.sign(bvx);
    const sgny = bvy === 0 ? 0 : Math.sign(bvy);
    const mv = CONFIG.particles.muzzleFlash;
    for (let i = 0; i < mv.count; i++) world.particles.push({ x: x + mv.offset, y, vx: sgnx * rand(mv.vx[0], mv.vx[1]), vy: sgny * rand(mv.vy[0], mv.vy[1]), life: mv.life, c: CONFIG.colors.particleMuzzle });
  }

  function enemyShoot(e, opts) {
    const o = opts || {};
    const dx = (player.x + player.w / 2) - (e.x + e.w / 2);
    const dy = (player.y + player.h / 2) - (e.y + e.h / 2);
    const baseAng = o.angle != null ? o.angle : Math.atan2(dy, dx);
    const d = Math.hypot(dx, dy) || 1;
    const sp = o.speed != null ? o.speed : enemyBulletSpeed(e);
    const centerFire = !!enemyConfig(e.type).centerFire;
    let bx = centerFire ? e.x + e.w / 2 : (e.dir > 0 ? e.x + e.w : e.x);
    const by = o.spawnY != null ? e.y + o.spawnY : e.y + e.h * CONFIG.render.bullet.enemy.spawnY;
    const ebb = CONFIG.render.bullet.enemy;
    world.enemyBullets.push({
      x: bx, y: by, w: ebb.w, h: ebb.h,
      vx: Math.cos(baseAng) * sp, vy: Math.sin(baseAng) * sp, life: o.life != null ? o.life : CONFIG.timing.enemyBulletLife
    });
    if (!o.silent) audio.play('enemyShoot');
  }

  // ---------- 更新 ----------
  function update(dt) {
    if (gameState.gameOver || gameState.win) return;
    if (player.dead) {
      player.respawn -= dt;
      if (player.respawn <= 0) {
        if (player.life <= 0) { endGame(false); return; }
        player.dead = false;
        world.bullets = []; world.enemyBullets = [];
        resetPlayer(true);
      }
      return;
    }

    // 输入移动
    const left = input.keys['a'] || input.keys['arrowleft'] || input.touch.left;
    const right = input.keys['d'] || input.keys['arrowright'] || input.touch.right;
    const up = input.keys['w'] || input.keys['arrowup'] || input.touch.up;
    const down = input.keys['s'] || input.keys['arrowdown'] || input.touch.down;
    const shootKey = input.keys['j'] || input.mouse.down || input.touch.fire;

    // 跳跃按键触发一次（含缓冲）
    let jumpPressed = input.jumpBuffer > 0;

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
    const assistedAim = touchAimAssistAim(ax, ay !== 0);
    if (assistedAim) aim = assistedAim;
    player.aim = aim;

    let proneKey = input.keys['k'];
    if (input.touch.down && shootKey && player.onGround && ax === 0) proneKey = true;
    // 蹲下：仅按 S/下瞄准且无水平移动、站立地面、非卧倒
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
    const pc = CONFIG.physics.collision.oneWay;
    let onOneWayPlatform = false;
    if (player.onGround) {
      for (const p of world.platforms) {
        if (p.type !== 'ground' && player.x + player.w > p.x + pc.sideMargin && player.x < p.x + p.w - pc.sideMargin && player.y + player.h >= p.y - pc.topMargin && player.y + player.h <= p.y + p.h + pc.bottomMargin) {
          onOneWayPlatform = true; break;
        }
      }
    }

    // 更新土狼时间和跳跃缓冲
    if (player.onGround) {
      input.coyoteTime = CONFIG.input.coyoteTime;
    } else {
      input.coyoteTime = Math.max(0, input.coyoteTime - dt);
    }
    if (input.jumpBuffer > 0) input.jumpBuffer = Math.max(0, input.jumpBuffer - dt);

    const wantsPlatformDrop = (proneKey || input.touch.down) && onOneWayPlatform;
    if (jumpPressed && input.jumpBuffer > 0 && wantsPlatformDrop) {
      player.y += CONFIG.physics.oneWayDrop;
      player.vy = 0;
      player.onGround = false;
      player.jumpsLeft = CONFIG.physics.airJumps;
      input.jumpBuffer = 0;
    } else if (jumpPressed && input.jumpBuffer > 0 && !proneKey) {
      const canGroundJump = player.onGround || input.coyoteTime > 0;
      if (canGroundJump) {
        audio.play('jump');
        player.vy = CONFIG.physics.jumpVelocity;
        player.onGround = false;
        player.jumpsLeft = CONFIG.physics.airJumps;
        input.jumpBuffer = 0;
        input.coyoteTime = 0;
      } else if (player.jumpsLeft > 0) {
        audio.play('jump');
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
          if (player.y + player.h > p.y && player.y + player.h < p.y + CONFIG.physics.collision.groundLandingWindow && player.vy >= 0) {
            player.y = p.y - player.h; player.vy = 0; player.onGround = true;
          }
        }
      } else {
        // 单向平台：从上方落下时踩上
        if (player.x + player.w > p.x + pc.sideMargin && player.x < p.x + p.w - pc.sideMargin) {
          if (player.vy >= 0 && player.y + player.h > p.y && player.y + player.h < p.y + p.h + pc.verticalThreshold && !(down && !jumpPressed) && !(proneKey && jumpPressed)) {
            player.y = p.y - player.h; player.vy = 0; player.onGround = true;
          }
        }
      }
    }
    // 落地重置二段跳
    if (player.onGround && !wasOnGround) player.jumpsLeft = CONFIG.physics.airJumps;

    // 世界边界 & 镜头
    player.x = clamp(player.x, gameState.camX + CONFIG.world.bounds.left, gameState.camX + W - CONFIG.world.bounds.right - player.w);
    if (player.x > gameState.camX + CONFIG.world.camOffset) gameState.camX = player.x - CONFIG.world.camOffset;
    gameState.camX = clamp(gameState.camX, 0, WORLD_LEN - W);

    // 掉落死亡
    if (player.y > CONFIG.physics.fallDeathY) { hitPlayer(true); if (player.dead) return; }

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
      e.dir = enemyDirToPlayer(e);
      const movement = enemyMovement(e);
      // 巡逻 / 飞行
      if (movement === 'patrol') {
        e.x += e.vx * dt;
        if (e.x < e.patrolMin) { e.x = e.patrolMin; e.vx = Math.abs(e.vx); }
        if (e.x > e.patrolMax) { e.x = e.patrolMax; e.vx = -Math.abs(e.vx); }
      }
      // 直升机/飞艇Boss/空降兵/天空骑士运动：绕中心盘旋或漂浮
      if (movement === 'orbit') {
        e.phase += dt * CONFIG.enemy.helicopterPhaseSpeed;
        e.x = e.centerX + Math.cos(e.phase) * e.radius;
        e.y = e.centerY + Math.sin(e.phase * CONFIG.enemy.helicopterYPhaseMult) * CONFIG.enemy.helicopterAmplitude;
        e.dir = enemyDirToPlayer(e);
      }
      // 炮台/机甲/坦克Boss/地面特色怪物固定在地面上
      if (movement === 'groundLocked' || enemyConfig(e.type).groundLocked) e.y = GROUND_Y - e.h;
      // 射击：仅在玩家在镜头内 & 一定距离
      const fireInfo = enemyPlayerFireInfo(e);
      if (e.fireCD <= 0 && fireInfo.active) {
        const eCfg = enemyConfig(e.type);
        let nextCD = rand(...eCfg.fireCD) * enemyFireMult();
        const attack = enemyAttack(e);
        if (attack === 'flameSpread') {
          // 火焰喷射：发射3发散射火焰弹
          const baseAng = fireInfo.baseAng;
          for (let i = -1; i <= 1; i++) {
            const ang = baseAng + i * 0.18;
            const sp = CONFIG.enemy.bulletSpeed.default * 0.7;
            const ebb = CONFIG.render.bullet.enemy;
            world.enemyBullets.push({
              x: e.x + e.w / 2, y: e.y + e.h * ebb.spawnY, w: ebb.w, h: ebb.h,
              vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: CONFIG.timing.enemyBulletLife * 0.7
            });
          }
          audio.play('enemyShoot');
          e.fireCD = nextCD;
        } else if (attack === 'boss5Phase') {
          // 坦克王多阶段攻击：血量越低越凶猛
          const hpRatio = e.hp / e.maxhp;
          const baseAng = fireInfo.baseAng;
          const muzzleY = e.y + e.h * 0.35;
          const fastSp = CONFIG.enemy.bulletSpeed.default * 1.1;
          if (hpRatio > 0.6) {
            // 阶段1：3发散射
            for (let i = -1; i <= 1; i++) enemyShoot(e, { angle: baseAng + i * 0.15, speed: fastSp, spawnY: muzzleY - e.y, silent: true });
          } else if (hpRatio > 0.3) {
            // 阶段2：5发散射 + 1发追踪
            for (let i = -2; i <= 2; i++) enemyShoot(e, { angle: baseAng + i * 0.12, speed: fastSp, spawnY: muzzleY - e.y, silent: true });
            enemyShoot(e, { angle: baseAng, speed: CONFIG.enemy.bulletSpeed.default * 0.85, spawnY: muzzleY - e.y, silent: true });
          } else {
            // 阶段3：扇形7发 + 上下两路齐射
            for (let i = -3; i <= 3; i++) enemyShoot(e, { angle: baseAng + i * 0.12, speed: fastSp, spawnY: muzzleY - e.y, silent: true });
            enemyShoot(e, { angle: baseAng - 0.35, speed: fastSp, spawnY: muzzleY - e.y, silent: true });
            enemyShoot(e, { angle: baseAng + 0.35, speed: fastSp, spawnY: muzzleY - e.y, silent: true });
            nextCD *= 0.75;
          }
          audio.play('enemyShoot');
          e.fireCD = nextCD;
        } else {
          enemyShoot(e);
          e.fireCD = nextCD;
        }
      }
    }

    // 玩家子弹
    const enemyGrid = buildEnemySpatialGrid(world.enemies);
    for (const b of world.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (bulletHitPlatform(b)) { b.life = 0; continue; }
      // 命中敌人（仅检测相邻空间网格）
      for (const e of getEnemiesNear(enemyGrid, b.x)) {
        if (e.dead) continue;
        if (aabb(b, enemyHurtBox(e))) {
          b.life = 0;
          gameState.stats.hits++;
          e.hp -= 1;
          audio.play('hit');
          const hit = CONFIG.particles.hit;
          for (let i = 0; i < hit.count; i++) world.particles.push({ x: b.x, y: b.y, vx: rand(hit.vx[0], hit.vx[1]), vy: rand(hit.vy[0], hit.vy[1]), life: hit.life, c: CONFIG.colors.particleHit });
          if (e.hp <= 0) {
            e.dead = true;
            gameState.stats.kills++;
            gameState.score += enemyScore(e);
            if (isBossEnemy(e)) {
              gameState.stats.bosses++;
              // Boss 被击败
              if (nextStageAfter(gameState.stage) !== gameState.stage) {
                // 进入下一关
                gameState.score += CONFIG.enemy.score.stageClear;
                gameState.stageTimeout = setTimeout(() => startNextStage(), CONFIG.enemy.bossDeathDelay);
              } else {
                // 最终关通关
                gameState.win = true;
                endGame(true);
              }
            }
            // 爆炸
            audio.play('explosion');
            const boom = CONFIG.particles.boom;
            const boomCount = enemyBoomCount(e);
            for (let i = 0; i < boomCount; i++) {
              world.particles.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: rand(boom.vx[0], boom.vx[1]), vy: rand(boom.vy[0], boom.vy[1]), life: rand(boom.life[0], boom.life[1]), c: i % 2 ? CONFIG.colors.particleBoomA : CONFIG.colors.particleBoomB });
            }
            gameState.shake = enemyShake(e);
          } else { gameState.shake = CONFIG.shake.enemyHit; }
          break; // 一颗子弹只命中一个敌人
        }
      }
    }
    const mr = CONFIG.render.offscreenMargin;
    world.bullets = world.bullets.filter(b => b.life > 0 && b.x > gameState.camX - mr && b.x < gameState.camX + W + mr && b.y > -mr / 2 && b.y < H + mr / 2);

    // 敌人子弹
    for (const b of world.enemyBullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (bulletHitPlatform(b)) { b.life = 0; continue; }
      if (!player.dead && player.invuln <= 0 && aabb(b, player)) {
        b.life = 0;
        hitPlayer(false);
        if (player.dead) return;
      }
    }
    world.enemyBullets = world.enemyBullets.filter(b => b.life > 0 && b.x > gameState.camX - mr && b.x < gameState.camX + W + mr && b.y > -mr / 2 && b.y < H + mr);

    // 敌人接触伤害
    if (player.invuln <= 0 && !player.dead) {
      for (const e of world.enemies) {
        if (e.dead) continue;
        if (aabb(player, enemyHurtBox(e))) { hitPlayer(false); if (player.dead) return; break; }
      }
    }

    // 拾取物
    for (const p of world.pickups) {
      if (p.taken) continue;
      const pb = { x: p.x, y: p.y, w: CONFIG.pickup.w, h: CONFIG.pickup.h };
      if (aabb(player, pb)) {
        p.taken = true;
        gameState.stats.pickups++;
        if (p.type === 'rapid') { player.weapon = 'rapid'; player.weaponTimer = CONFIG.weapons.duration; }
        else if (p.type === 'spread') { player.weapon = 'spread'; player.weaponTimer = CONFIG.weapons.duration; }
        else if (p.type === 'life') { player.life = Math.min(player.maxLife, player.life + 1); }
        audio.play('pickup');
        gameState.score += CONFIG.pickup.score;
        for (let i = 0; i < CONFIG.particles.pickup; i++) world.particles.push({ x: p.x + 10, y: p.y + 10, vx: rand(-100, 100), vy: rand(-120, 20), life: 0.5, c: p.type === 'life' ? CONFIG.colors.particlePickupLife : CONFIG.colors.particlePickupWeapon });
      }
    }

    // 粒子
    for (const pa of world.particles) { pa.x += pa.vx * dt; pa.y += pa.vy * dt; pa.vy += CONFIG.particles.gravity * dt; pa.life -= dt; }
    world.particles = world.particles.filter(p => p.life > 0);

    gameState.shake = Math.max(0, gameState.shake - dt * CONFIG.shake.decay);
    updateHUD();
  }

  function hitPlayer(fall) {
    if (player.dead) return;
    if (!fall && player.invuln > 0) return;
    player.life -= 1;
    gameState.stats.damageTaken++;
    if (fall) gameState.stats.falls++;
    audio.play('playerHit');
    for (let i = 0; i < CONFIG.particles.playerHit; i++) world.particles.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, vx: rand(-180, 180), vy: rand(-200, 40), life: rand(0.3, 0.7), c: CONFIG.colors.particlePlayerHit });
    gameState.shake = CONFIG.shake.hit;
    if (player.life <= 0 || fall) {
      player.dead = true; player.respawn = CONFIG.player.respawnTime;
      if (player.life <= 0) endGame(false);
      else if (fall) { /* respawn */ }
    } else {
      player.invuln = CONFIG.player.invulnTime;
    }
  }

  // ---------- 渲染 ----------
  function drawBackgroundTile(img, x, y, w, h, mirrored, overlap) {
    ctx.save();
    if (mirrored) {
      ctx.translate(x + w + overlap, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w + overlap, h);
    } else {
      ctx.drawImage(img, x, y, w + overlap, h);
    }
    ctx.restore();
  }

  function drawSky() {
    const stage = gameState.stage;
    let bgImg;
    if (stage === 3) bgImg = assets.bg3;
    else if (stage === 4) bgImg = assets.bg4;
    else if (stage === 5) bgImg = assets.bg5;
    else bgImg = (stage % 2 === 0) ? assets.skyBg : assets.bg;
    if (imageReady(bgImg)) {
      // 视差滚动背景：交替镜像铺砖，让相邻 tile 在接缝处使用同一侧边缘像素。
      const imgW = bgImg.naturalWidth;
      const imgH = bgImg.naturalHeight;
      const drawH = H; // 背景图高度铺满
      const drawW = Math.ceil(imgW * (drawH / imgH));
      const parallaxX = gameState.camX * CONFIG.world.parallax.bg;
      const firstTile = Math.floor(parallaxX / drawW);
      const start = firstTile * drawW - parallaxX;
      const overlap = CONFIG.render.background.seamOverlap;
      for (let tile = firstTile, x = start; x < W; tile++, x += drawW) {
        drawBackgroundTile(bgImg, x, 0, drawW, drawH, Math.abs(tile) % 2 === 1, overlap);
      }
      // 暗角覆盖，让背景不抢戏
      const useSky = stage === 2 || stage === 4;
      ctx.fillStyle = useSky ? CONFIG.colors.skyDarken : CONFIG.colors.caveDarken;
      ctx.fillRect(0, 0, W, H);
      return;
    }

    // 加载前的回退背景
    const g = ctx.createLinearGradient(0, 0, 0, H);
    const useSky = stage === 2 || stage === 4;
    if (useSky) {
      g.addColorStop(0, CONFIG.colors.skyFallbackDay.top);
      g.addColorStop(0.5, CONFIG.colors.skyFallbackDay.mid);
      g.addColorStop(1, CONFIG.colors.skyFallbackDay.bottom);
    } else {
      g.addColorStop(0, CONFIG.colors.skyFallbackCave.top);
      g.addColorStop(0.5, CONFIG.colors.skyFallbackCave.mid);
      g.addColorStop(1, CONFIG.colors.skyFallbackCave.bottom);
    }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 远山
    const SK = CONFIG.art.sky;
    ctx.fillStyle = CONFIG.colors.farMountain;
    for (let i = 0; i < SK.farMountains.count; i++) {
      const period = W + SK.farMountains.spacing;
      const mx = (((i * SK.farMountains.spacing - gameState.camX * CONFIG.world.parallax.far) % period) + period) % period - SK.farMountains.spacing;
      ctx.beginPath();
      ctx.moveTo(mx, GROUND_Y);
      ctx.lineTo(mx + SK.farMountains.peak.x, GROUND_Y + SK.farMountains.peak.y);
      ctx.lineTo(mx + SK.farMountains.spacing, GROUND_Y);
      ctx.fill();
    }
    ctx.fillStyle = CONFIG.colors.nearMountain;
    for (let i = 0; i < SK.nearMountains.count; i++) {
      const period = W + SK.nearMountains.spacing;
      const mx = (((i * SK.nearMountains.spacing - gameState.camX * CONFIG.world.parallax.near) % period) + period) % period - SK.nearMountains.spacing;
      ctx.beginPath();
      ctx.moveTo(mx, GROUND_Y);
      ctx.lineTo(mx + SK.nearMountains.peak.x, GROUND_Y + SK.nearMountains.peak.y);
      ctx.lineTo(mx + SK.nearMountains.spacing, GROUND_Y);
      ctx.fill();
    }
    // 月亮
    ctx.fillStyle = CONFIG.colors.moon;
    ctx.beginPath(); ctx.arc(W + SK.moon.x, SK.moon.y, SK.moon.r, 0, Math.PI * 2); ctx.fill();
  }

  function drawPlatforms() {
    const PL = CONFIG.art.platform;
    for (const p of world.platforms) {
      const sx = p.x - gameState.camX;
      if (sx + p.w < 0 || sx > W) continue;
      if (p.type === 'ground') {
        // 土地
        ctx.fillStyle = CONFIG.colors.groundBody;
        ctx.fillRect(sx, p.y, p.w, p.h);
        // 草层
        ctx.fillStyle = CONFIG.colors.groundGrass;
        ctx.fillRect(sx, p.y, p.w, PL.grassH);
        ctx.fillStyle = CONFIG.colors.groundGrassHighlight;
        for (let i = 0; i < p.w; i += PL.grassStrip.spacing) ctx.fillRect(sx + i, p.y, PL.grassStrip.w, PL.grassStrip.h);
        // 纹理点
        ctx.fillStyle = CONFIG.colors.groundTexture;
        for (let i = 0; i < p.w; i += PL.texture.spacingX) for (let j = 16; j < p.h; j += PL.texture.spacingY) ctx.fillRect(sx + i + (j % 2 ? PL.texture.oddOffset : 0), p.y + j, PL.texture.w, PL.texture.h);
      } else {
        ctx.fillStyle = CONFIG.colors.platformBody;
        ctx.fillRect(sx, p.y, p.w, p.h);
        ctx.fillStyle = CONFIG.colors.platformTop;
        ctx.fillRect(sx, p.y, p.w, PL.topH);
        ctx.fillStyle = CONFIG.colors.platformBottom;
        ctx.fillRect(sx, p.y + p.h - PL.bottomH, p.w, PL.bottomH);
      }
    }
  }

  function drawPlayer() {
    if (player.dead) return;
    const sx = player.x - gameState.camX;
    const sy = player.y;
    if (player.invuln > 0 && Math.floor(player.invuln * CONFIG.render.player.blinkFreq) % 2 === 0) return;

    // 夺旗猫精灵图：9 帧横向排列，等宽裁剪后
    // 0:idle 1:run1 2:run2 3:jump 4:shoot_h 5:shoot_up 6:crouch 7:prone 8:flag
    if (imageReady(assets.hero)) {
      const frameCount = 9;
      const fw = assets.hero.width / frameCount;
      const fh = assets.hero.height;
      let frame = 0;
      if (player.prone) frame = 7;
      else if (!player.onGround) frame = 3;
      else if (player.crouch) frame = 6;
      else if (player.aim === 'up' || player.aim === 'diagup') frame = 5;
      else if (player.fireCD > CONFIG.render.player.fireFrameThreshold) frame = 4;
      else if (Math.abs(player.vx) > 1) frame = 1 + Math.floor(player.anim * 10) % 2;

      const imgH = CONFIG.render.player.spriteH;
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
    const P = CONFIG.art.player.fallback;
    const walk = Math.sin(player.anim * CONFIG.render.player.walkFreq) * (Math.abs(player.vx) > 1 ? 1 : 0);
    const h = player.prone ? CONFIG.player.proneHeight : (player.crouch ? CONFIG.player.crouchHeight : CONFIG.player.height);
    // 腿
    ctx.fillStyle = CONFIG.colors.playerLegs;
    if (player.prone) {
      ctx.fillRect(P.legProne.x, P.legProne.y, P.legProne.w, P.legProne.h);
    } else if (player.crouch) {
      for (const r of P.legCrouch) ctx.fillRect(r.x, r.y, r.w, r.h);
    } else {
      const [l, r] = P.legStand;
      ctx.fillRect(l.x, l.y + walk * 2, l.w, l.h - walk * 2);
      ctx.fillRect(r.x, r.y - walk * 2, r.w, r.h + walk * 2);
    }
    // 身体
    ctx.fillStyle = CONFIG.colors.playerBody;
    if (player.prone) ctx.fillRect(P.bodyProne.x, P.bodyProne.y, P.bodyProne.w, P.bodyProne.h);
    else ctx.fillRect(P.bodyStand.x, h - P.bodyStand.bottom, P.bodyStand.w, P.bodyStand.h);
    // 头
    ctx.fillStyle = CONFIG.colors.playerHead;
    ctx.fillRect(P.head.x, h - P.head.bottom, P.head.w, P.head.h);
    // 头巾
    ctx.fillStyle = CONFIG.colors.playerScarf;
    ctx.fillRect(P.scarf.x, h - P.scarf.bottom, P.scarf.w, P.scarf.h);
    // 枪（随瞄准方向）
    ctx.fillStyle = CONFIG.colors.playerGun;
    if (player.prone) {
      ctx.fillRect(P.gunProne.x, P.gunProne.y, P.gunProne.w, P.gunProne.h);
    } else if (player.aim === 'up') {
      ctx.fillRect(P.gunUp.x, h - P.gunUp.bottom, P.gunUp.w, P.gunUp.h);
    } else if (player.aim === 'down') {
      ctx.fillRect(P.gunDown.x, h - P.gunDown.bottom, P.gunDown.w, P.gunDown.h);
    } else if (player.aim === 'diagup' || player.aim === 'diagdown') {
      const gd = P.gunDiag;
      const bottom = player.aim === 'diagup' ? 26 : 18;
      ctx.save();
      ctx.translate(gd.transX, h - bottom);
      ctx.rotate(player.aim === 'diagup' ? -Math.PI / 4 : Math.PI / 4);
      ctx.fillRect(0, -2, gd.len, 4);
      ctx.restore();
    } else {
      ctx.fillRect(P.gunSide.x, h - P.gunSide.bottom, P.gunSide.w, P.gunSide.h);
    }
    ctx.restore();
  }

  function drawEnemy(e) {
    if (e.dead) return;
    const sx = e.x - gameState.camX;
    // 估算图片实际显示宽度用于裁剪判断（加载完成后用缩放后尺寸）
    let renderW = e.w;
    let renderH = e.h;
    if (e.type === 'turret') {
      renderW = e.w * CONFIG.render.imageScale.turret.w;
      renderH = e.h * CONFIG.render.imageScale.turret.h;
    } else if (e.type === 'helicopter') {
      renderW = e.w * CONFIG.render.imageScale.helicopter.w;
      renderH = e.h * CONFIG.render.imageScale.helicopter.h;
    } else if (e.type === 'boss3' || e.type === 'boss4' || e.type === 'boss5') {
      const bs = CONFIG.render.imageScale[e.type];
      renderW = e.w * bs.w; renderH = e.h * bs.h;
    } else if (['mousetank','paratrooper','rat','skyknight','flameguard'].includes(e.type)) {
      const assetMap = { mousetank: 'enemy1', paratrooper: 'enemy2', rat: 'enemy3', skyknight: 'enemy4', flameguard: 'enemy5' };
      const es = CONFIG.render.imageScale[assetMap[e.type]];
      renderW = e.w * es.w; renderH = e.h * es.h;
    } else if ((e.type === 'stand' || e.type === 'patrol' || e.type === 'sniper') && imageReady(assets.infantry)) {
      const es = CONFIG.render.imageScale[e.type === 'sniper' ? 'sniper' : 'infantry'];
      renderW = e.w * es.w; renderH = e.h * es.h;
    }
    if (sx + renderW / 2 < 0 || sx - renderW / 2 > W) return;
    ctx.save();
    ctx.translate(sx + e.w / 2, e.y);
    applyEnemyFacing(e);

    if (e.type === 'turret') {
      if (imageReady(assets.boss)) {
        const ts = CONFIG.render.imageScale.turret;
        const imgW = e.w * ts.w;
        const imgH = e.h * ts.h;
        ctx.save();
        // 让图片底部坐在地面上（e.y + e.h）
        ctx.translate(0, e.h - imgH);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(assets.boss, -imgW / 2, 0, imgW, imgH);
        ctx.restore();
      } else {
        // 回退：方块炮台
        const T = CONFIG.art.enemy.fallback.turret;
        ctx.fillStyle = T.base.color; ctx.fillRect(T.base.x, e.h - T.base.bottom, T.base.w, T.base.h);
        ctx.fillStyle = T.mid.color; ctx.fillRect(T.mid.x, e.h - T.mid.bottom, T.mid.w, T.mid.h);
        ctx.fillStyle = T.top.color; ctx.fillRect(T.top.x, e.h - T.top.bottom, T.top.w, T.top.h);
        ctx.fillStyle = T.topLine.color; ctx.fillRect(T.topLine.x, e.h - T.topLine.bottom, T.topLine.w, T.topLine.h);
        ctx.fillStyle = T.barrel.color; ctx.fillRect(T.barrel.x, e.h - T.barrel.bottom, T.barrel.w, T.barrel.h);
      }
      // 血条
      const Tb = CONFIG.art.enemy.fallback.turret.bloodBar;
      ctx.fillStyle = CONFIG.colors.enemyBloodBg;
      ctx.fillRect(Tb.x, e.h - Tb.bottom, Tb.w, Tb.h);
      ctx.fillStyle = CONFIG.colors.enemyBloodFill;
      ctx.fillRect(Tb.x, e.h - Tb.bottom, Tb.w * (e.hp / e.maxhp), Tb.h);
      // 警示灯
      const Tl = CONFIG.art.enemy.fallback.turret.light;
      ctx.fillStyle = Math.floor(e.anim * CONFIG.render.enemy.lightFreq) % 2 ? CONFIG.colors.enemyAlertLightOn : CONFIG.colors.enemyAlertLightOff;
      ctx.beginPath(); ctx.arc(0, e.h - Tl.bottom, Tl.r, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'helicopter') {
      const hs = CONFIG.render.imageScale.helicopter;
      const imgW = e.w * hs.w;
      const imgH = e.h * hs.h;
      if (imageReady(assets.heliBoss)) {
        ctx.save();
        ctx.translate(0, e.h / 2 - imgH / 2);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(assets.heliBoss, -imgW / 2, 0, imgW, imgH);
        ctx.restore();
      } else {
        // 回退：方块直升机
        const H = CONFIG.art.enemy.fallback.helicopter;
        ctx.fillStyle = H.body.color; ctx.fillRect(H.body.x, H.body.y, H.body.w, H.body.h);
        ctx.fillStyle = H.bladeMount.color; ctx.fillRect(H.bladeMount.x, H.bladeMount.y, H.bladeMount.w, H.bladeMount.h);
      }
      // 血条
      const Hb = CONFIG.art.enemy.fallback.helicopter.bloodBar;
      ctx.fillStyle = CONFIG.colors.enemyBloodBg;
      ctx.fillRect(Hb.x, Hb.y, Hb.w, Hb.h);
      ctx.fillStyle = CONFIG.colors.enemyBloodFill;
      ctx.fillRect(Hb.x, Hb.y, Hb.w * (e.hp / e.maxhp), Hb.h);
      // 螺旋桨动画
      ctx.strokeStyle = CONFIG.colors.heliBladeStroke;
      ctx.lineWidth = 3;
      const blade = Math.sin(e.anim * CONFIG.render.enemy.bladeFreq) * CONFIG.render.bladeAmplitude;
      const bladeY = imageReady(assets.heliBoss) ? -imgH / 2 + 10 : CONFIG.art.enemy.fallback.helicopter.bladeYFallback;
      ctx.beginPath();
      ctx.moveTo(-blade, bladeY);
      ctx.lineTo(blade, bladeY);
      ctx.stroke();
    } else if (e.type === 'boss3' || e.type === 'boss4' || e.type === 'boss5') {
      const key = e.type;
      const bs = CONFIG.render.imageScale[key];
      const imgW = e.w * bs.w;
      const imgH = e.h * bs.h;
      const assetKey = key;
      if (imageReady(assets[assetKey])) {
        ctx.save();
        // 地面 Boss 的大型图片按底部对齐，避免比碰撞盒更高的素材沉到地面下。
        const shouldBottomAlign = enemyMovement(e) === 'groundLocked' || enemyConfig(e.type).groundLocked;
        const yOffset = shouldBottomAlign ? e.h - imgH : e.h / 2 - imgH / 2;
        ctx.translate(0, yOffset);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(assets[assetKey], -imgW / 2, 0, imgW, imgH);
        ctx.restore();
      } else {
        // 回退：明显的大方块 + Boss 字样，方便调试
        ctx.fillStyle = '#b03030';
        ctx.fillRect(-e.w / 2, 0, e.w, e.h);
        ctx.fillStyle = '#fff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', 0, e.h / 2);
      }
      // 血条
      const Hb = CONFIG.art.enemy.fallback.helicopter.bloodBar;
      ctx.fillStyle = CONFIG.colors.enemyBloodBg;
      ctx.fillRect(Hb.x, Hb.y, Hb.w, Hb.h);
      ctx.fillStyle = CONFIG.colors.enemyBloodFill;
      ctx.fillRect(Hb.x, Hb.y, Hb.w * (e.hp / e.maxhp), Hb.h);
    } else if (e.type === 'mousetank' || e.type === 'paratrooper' || e.type === 'rat' || e.type === 'skyknight' || e.type === 'flameguard') {
      const key = e.type;
      const assetMap = { mousetank: 'enemy1', paratrooper: 'enemy2', rat: 'enemy3', skyknight: 'enemy4', flameguard: 'enemy5' };
      const assetKey = assetMap[key];
      const es = CONFIG.render.imageScale[assetKey];
      const imgW = e.w * es.w;
      const imgH = e.h * es.h;
      if (imageReady(assets[assetKey])) {
        ctx.save();
        ctx.translate(0, e.h / 2 - imgH / 2);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(assets[assetKey], -imgW / 2, 0, imgW, imgH);
        ctx.restore();
      } else {
        ctx.fillStyle = '#888';
        ctx.fillRect(-e.w / 2, 0, e.w, e.h);
      }
      // 血条
      const Hb = CONFIG.art.enemy.fallback.helicopter.bloodBar;
      ctx.fillStyle = CONFIG.colors.enemyBloodBg;
      ctx.fillRect(Hb.x, Hb.y, Hb.w, Hb.h);
      ctx.fillStyle = CONFIG.colors.enemyBloodFill;
      ctx.fillRect(Hb.x, Hb.y, Hb.w * (e.hp / e.maxhp), Hb.h);
    } else {
      const I = CONFIG.art.enemy.fallback.infantry;
      const bob = Math.sin(e.anim * CONFIG.render.enemy.bobFreq);
      const usesInfantryAsset = (e.type === 'stand' || e.type === 'patrol' || e.type === 'sniper') && imageReady(assets.infantry);
      if (usesInfantryAsset) {
        const scaleKey = e.type === 'sniper' ? 'sniper' : 'infantry';
        const es = CONFIG.render.imageScale[scaleKey];
        const imgW = e.w * es.w;
        const imgH = e.h * es.h;
        ctx.save();
        ctx.translate(0, e.h - imgH + bob * 0.45);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(assets.infantry, -imgW / 2, 0, imgW, imgH);
        if (e.type === 'sniper') {
          ctx.fillStyle = 'rgba(122,215,255,0.9)';
          ctx.fillRect(imgW * 0.16, imgH * 0.42, 7, 2);
        }
        ctx.restore();
      } else {
        const catColor = e.type === 'sniper' ? CONFIG.colors.infantrySniper : CONFIG.colors.infantryDefault;
        // 猫耳朵
        ctx.fillStyle = catColor;
        for (const ear of I.ears) {
          ctx.beginPath();
          ctx.moveTo(ear[0], ear[1] + bob); ctx.lineTo(ear[2], ear[3] + bob); ctx.lineTo(ear[4], ear[5] + bob);
          ctx.fill();
        }
        // 腿
        ctx.fillStyle = CONFIG.colors.infantryLegs;
        for (const r of I.legs) ctx.fillRect(r.x, r.y, r.w, r.h);
        // 身体
        ctx.fillStyle = catColor;
        ctx.fillRect(I.body.x, I.body.y + bob, I.body.w, I.body.h);
        // 肚皮
        ctx.fillStyle = CONFIG.colors.infantryBelly;
        ctx.fillRect(I.belly.x, I.belly.y + bob, I.belly.w, I.belly.h);
        // 头
        ctx.fillStyle = catColor;
        ctx.fillRect(I.head.x, I.head.y + bob, I.head.w, I.head.h);
        // 眼睛
        ctx.fillStyle = CONFIG.colors.infantryEyes;
        for (const eye of I.eyes) ctx.fillRect(eye.x, eye.y + bob, 2, 2);
        // 枪
        ctx.fillStyle = CONFIG.colors.infantryGun;
        ctx.fillRect(I.gun.x, I.gun.y + bob, e.type === 'sniper' ? I.gun.wSniper : I.gun.wDefault, I.gun.h);
        // 尾巴
        ctx.strokeStyle = catColor; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(I.tail.startX, I.tail.startY + bob);
        ctx.quadraticCurveTo(I.tail.cpX, I.tail.cpY + bob - Math.sin(e.anim * CONFIG.render.enemy.tailFreq) * I.tail.waveAmp, I.tail.endX, I.tail.endY + bob);
        ctx.stroke();
      }
      // 血条（狙击手）
      if (e.type === 'sniper' && e.hp < e.maxhp) {
        const b = I.sniperBloodBar;
        ctx.fillStyle = CONFIG.colors.enemyBloodBg; ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = CONFIG.colors.enemyBloodFill; ctx.fillRect(b.x, b.y, b.w * (e.hp / e.maxhp), b.h);
      }
    }
    ctx.restore();
  }

  function drawEnemyWarnings() {
    for (const e of world.enemies) {
      if (e.dead || e.fireCD <= 0) continue;
      const warningTime = enemyWarningDuration(e);
      if (e.fireCD > warningTime) continue;
      const fireInfo = enemyPlayerFireInfo(e);
      if (!fireInfo.active) continue;
      const muzzle = enemyMuzzlePoint(e);
      const sx = muzzle.x - gameState.camX;
      if (sx < -80 || sx > W + 80) continue;
      const ratio = clamp(1 - e.fireCD / warningTime, 0, 1);
      const pulse = 0.5 + Math.sin((gameState.totalTime || 0) * 24) * 0.5;
      const angles = enemyWarningAngles(e, fireInfo.baseAng);
      ctx.save();
      ctx.globalAlpha = 0.24 + ratio * 0.48 + pulse * 0.12;
      ctx.strokeStyle = ratio > 0.68 ? CONFIG.colors.enemyWarningDanger : CONFIG.colors.enemyWarning;
      ctx.lineWidth = isBossEnemy(e) ? 3 : 2;
      if (ctx.setLineDash) ctx.setLineDash([8, 7]);
      const len = isBossEnemy(e) ? 560 : 420;
      for (const ang of angles) {
        ctx.beginPath();
        ctx.moveTo(sx, muzzle.y);
        ctx.lineTo(sx + Math.cos(ang) * len, muzzle.y + Math.sin(ang) * len);
        ctx.stroke();
      }
      if (ctx.setLineDash) ctx.setLineDash([]);
      ctx.fillStyle = CONFIG.colors.enemyWarningDanger;
      ctx.beginPath();
      ctx.arc(sx, muzzle.y, 3 + ratio * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawBullets() {
    for (const b of world.bullets) {
      const ang = Math.atan2(b.vy, b.vx);
      const cx = b.x - gameState.camX + b.w / 2;
      const cy = b.y + b.h / 2;
      // 拖尾
      ctx.fillStyle = CONFIG.colors.playerBulletTrail;
      ctx.save();
      ctx.translate(cx - b.vx * CONFIG.render.trailFactor.player, cy - b.vy * CONFIG.render.trailFactor.player);
      ctx.rotate(ang);
      ctx.fillRect(-b.w, -b.h / 2, b.w, b.h);
      ctx.restore();
      // 弹头
      ctx.fillStyle = CONFIG.colors.playerBullet;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
    }
    for (const b of world.enemyBullets) {
      const sx = b.x - gameState.camX;
      ctx.fillStyle = CONFIG.colors.enemyBullet;
      ctx.beginPath(); ctx.arc(sx + 4, b.y + 4, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = CONFIG.colors.enemyBulletTrail;
      ctx.beginPath(); ctx.arc(sx + 4 - b.vx * CONFIG.render.trailFactor.enemy, b.y + 4 - b.vy * CONFIG.render.trailFactor.enemy, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawPickups() {
    for (const p of world.pickups) {
      if (p.taken) continue;
      const sx = p.x - gameState.camX;
      const pm = CONFIG.render.offscreenMargin;
      if (sx < -pm / 2 || sx > W + pm / 2) continue;
      const bob = Math.sin((gameState.totalTime || 0) * CONFIG.render.pickup.bobFreq + p.x) * CONFIG.render.pickup.bobAmp;
      const y = p.y + bob;
      const col = p.type === 'rapid' ? CONFIG.colors.pickupRapid : p.type === 'spread' ? CONFIG.colors.pickupSpread : CONFIG.colors.pickupLife;
      ctx.fillStyle = CONFIG.colors.pickupShadow;
      ctx.fillRect(sx, y + CONFIG.pickup.h + CONFIG.render.pickup.shadowH, CONFIG.pickup.w, CONFIG.render.pickup.shadowH);
      ctx.fillStyle = col;
      ctx.fillRect(sx + 2, y, CONFIG.render.pickup.drawW, CONFIG.render.pickup.drawH);
      ctx.fillStyle = CONFIG.colors.pickupLabel;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      const t = p.type === 'rapid' ? 'R' : p.type === 'spread' ? 'S' : '+';
      ctx.fillText(t, sx + CONFIG.pickup.w / 2, y + CONFIG.render.pickup.labelOffset);
      ctx.textAlign = 'left';
    }
  }

  function drawParticles() {
    for (const p of world.particles) {
      ctx.globalAlpha = clamp(p.life * 2, 0, 1);
      ctx.fillStyle = p.c;
      const ps = CONFIG.render.particle.size;
      ctx.fillRect(p.x - gameState.camX - ps / 2, p.y - ps / 2, ps, ps);
    }
    ctx.globalAlpha = 1;
  }

  function drawBossHUD() {
    const boss = currentBoss();
    if (!boss) return;
    const cfg = CONFIG.hud.bossBar;
    const barW = Math.min(cfg.w, W - 80);
    const barH = cfg.h;
    const x = W / 2 - barW / 2;
    const y = cfg.y;
    const ratio = clamp(boss.hp / boss.maxhp, 0, 1);
    ctx.save();
    ctx.fillStyle = CONFIG.colors.bossBarBg;
    ctx.fillRect(x - 10, y - 20, barW + 20, 42);
    ctx.font = CONFIG.art.hud.font;
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.colors.hudWeaponText;
    ctx.fillText('BOSS ' + bossDisplayName(boss) + ' / ' + bossPhaseText(boss), W / 2, y - 6);
    ctx.fillStyle = CONFIG.colors.enemyBloodBg;
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = ratio <= 0.3 ? CONFIG.colors.bossBarArmor : CONFIG.colors.bossBarFill;
    ctx.fillRect(x, y, barW * ratio, barH);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x + barW * 0.3, y, 1, barH);
    ctx.fillRect(x + barW * 0.6, y, 1, barH);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawHUDBars() {
    drawBossHUD();
    // 武器指示
    if (player.weapon !== 'normal') {
      ctx.fillStyle = CONFIG.colors.hudBarBg;
      const pbox = CONFIG.pickup.box;
      ctx.fillRect(pbox.x, H - pbox.y, pbox.w, pbox.h);
      const weaponColor = player.weapon === 'rapid' ? CONFIG.colors.hudWeaponRapid : CONFIG.colors.hudWeaponSpread;
      const label = player.weapon === 'rapid' ? '速射' : '散射';
      const seconds = Math.ceil(Math.max(0, player.weaponTimer));
      ctx.font = CONFIG.art.hud.font;
      const ht = CONFIG.art.hud.weaponText;
      ctx.fillStyle = CONFIG.colors.hudWeaponText;
      ctx.fillText('武器: ' + label + ' ' + seconds + '秒', ht.x, H - ht.yOffset);
      const wb = CONFIG.hud.weaponBar;
      ctx.fillStyle = weaponColor;
      ctx.fillRect(wb.x, H - 22, wb.w * clamp(player.weaponTimer / CONFIG.weapons.duration, 0, 1), wb.h);
    }
  }

  function render() {
    ctx.save();
    if (gameState.shake > 0) ctx.translate(rand(-gameState.shake, gameState.shake), rand(-gameState.shake, gameState.shake));
    drawSky();
    drawPlatforms();
    drawPickups();
    for (const e of world.enemies) drawEnemy(e);
    drawEnemyWarnings();
    drawPlayer();
    drawBullets();
    drawParticles();
    ctx.restore();

    drawHUDBars();
    // 进度条
    ctx.fillStyle = CONFIG.colors.hudBarBg;
    ctx.fillRect(W / 2 - CONFIG.hud.progressBarW / 2, H - CONFIG.hud.progressBarY, CONFIG.hud.progressBarW, CONFIG.hud.progressBarH);
    ctx.fillStyle = CONFIG.colors.hudProgressFill;
    ctx.fillRect(W / 2 - CONFIG.hud.progressBarW / 2, H - CONFIG.hud.progressBarY, CONFIG.hud.progressBarW * clamp((player.x) / WORLD_LEN, 0, 1), CONFIG.hud.progressBarH);


  }

  function updateHUD() {
    lifeEl.textContent = player.life;
    scoreEl.textContent = gameState.score;
    highScoreEl.textContent = gameState.highScore;
    stageEl.textContent = gameState.stage;
  }

  function createTextEl(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = text;
    return node;
  }

  function formatRunTime(seconds) {
    const total = Math.max(0, Math.floor(seconds || 0));
    const minutes = Math.floor(total / 60);
    const rest = String(total % 60).padStart(2, '0');
    return minutes + ':' + rest;
  }

  function createEndStat(label, value) {
    const item = document.createElement('div');
    item.className = 'end-stat';
    item.append(
      createTextEl('div', 'end-stat-label', label),
      createTextEl('div', 'end-stat-value', String(value))
    );
    return item;
  }

  function createEndStatsGrid() {
    const stats = gameState.stats || freshRunStats();
    const accuracy = stats.shots > 0 ? Math.round((stats.hits / stats.shots) * 100) + '%' : '0%';
    const grid = document.createElement('div');
    grid.className = 'end-stats';
    grid.append(
      createEndStat('用时', formatRunTime(stats.elapsed || gameState.totalTime)),
      createEndStat('命中率', accuracy),
      createEndStat('击败', stats.kills),
      createEndStat('Boss', stats.bosses),
      createEndStat('拾取', stats.pickups),
      createEndStat('受伤', stats.damageTaken)
    );
    return grid;
  }

  function showEndOverlay(victory, title, subtitle, description) {
    if (!endCard) {
      endCard = document.createElement('div');
      endCard.className = 'card end-card';
      overlay.appendChild(endCard);
    }
    const logoWrap = document.createElement('div');
    logoWrap.className = 'logo-wrap';
    logoWrap.append(
      createTextEl('div', 'cat-icon', victory ? '🏆' : '😿'),
      createTextEl('h1', 'end-title', title)
    );

    const restartBtn = createTextEl('button', 'btn', victory ? '再玩一次' : '重新挑战');
    restartBtn.id = 'restartBtn';
    restartBtn.onclick = () => { audio.init(); audio.resume(); startGame(gameState.difficulty); };

    const subtitleClass = victory ? 'end-subtitle end-victory' : 'end-subtitle end-defeat';
    endCard.replaceChildren(
      logoWrap,
      createTextEl('h2', subtitleClass, subtitle),
      createTextEl('div', 'final final-score', '得分: ' + gameState.score),
      createTextEl('div', 'final-high-score', '最高分: ' + gameState.highScore),
      createEndStatsGrid(),
      createTextEl('p', 'tagline', description),
      restartBtn
    );
    if (menuCard) menuCard.hidden = true;
    endCard.hidden = false;
    overlay.style.display = 'flex';
  }

  // ---------- 结束 ----------
  function endGame(victory) {
    gameState.gameOver = true;
    gameState.running = false;
    setMobileControlsActive(false);
    if (gameState.stageTimeout) { clearTimeout(gameState.stageTimeout); gameState.stageTimeout = null; }
    gameState.win = victory;
    gameState.stats.elapsed = gameState.totalTime;
    if (gameState.score > gameState.highScore) {
      gameState.highScore = gameState.score;
      try { localStorage.setItem('catFlagSquadSave', JSON.stringify({ version: 1, highScore: gameState.highScore })); } catch (e) {}
    }
    const title = victory ? '任务完成' : '游戏结束';
    const sub = victory ? '喵喵突击队胜利！' : '英雄已倒下…';
    const desc = victory
      ? '你成功击败了黑猫军团，天空与大地重归和平！'
      : '敌军火力凶猛，再试一次吧！';
    showEndOverlay(victory, title, sub, desc);
  }

  function startNextStage() {
    if (gameState.gameOver || gameState.win) return;
    if (gameState.stageMessage) { gameState.stageMessage.remove(); gameState.stageMessage = null; }
    const nextStage = nextStageAfter(gameState.stage);
    if (nextStage === gameState.stage) { endGame(true); return; }
    gameState.stage = nextStage;
    gameState.camX = 0;
    player.weapon = 'normal'; player.weaponTimer = 0;
    buildLevel();
    resetPlayer(true);
    updateHUD();
    // 显示关卡过渡提示
    const data = LEVELS[gameState.stage];
    const stageName = data ? data.name : '';
    const msg = document.createElement('div');
    msg.className = 'stage-message';
    msg.textContent = `第${stageLabel(gameState.stage)}关 - ${stageName}`;
    document.getElementById('wrap').appendChild(msg);
    gameState.stageMessage = msg;
    setTimeout(() => {
      if (gameState.stageMessage === msg) gameState.stageMessage = null;
      msg.remove();
    }, CONFIG.timing.stageMessageDuration);
  }

  // ---------- 主循环 ----------
  const TIME_STEP = CONFIG.timing.timeStep;
  function loop(t) {
    if (!gameState.running) return;
    gameState.rafId = requestAnimationFrame(loop);
    if (gameState.paused) return;
    const dt = Math.min(0.1, (t - gameState.last) / 1000 || 0);
    gameState.last = t;
    gameState.totalTime = (gameState.totalTime || 0) + dt;
    gameState.accumulator += dt;
    const maxSteps = 5;
    let steps = 0;
    while (gameState.accumulator >= TIME_STEP && steps < maxSteps) {
      update(TIME_STEP);
      gameState.accumulator -= TIME_STEP;
      steps++;
    }
    if (gameState.accumulator >= TIME_STEP) gameState.accumulator = 0;
    render();
  }

  function togglePause() {
    gameState.paused = !gameState.paused;
    if (gameState.paused) {
      pauseOverlay.style.display = 'flex';
      pauseOverlay.setAttribute('aria-hidden', 'false');
      setMobileControlsActive(false);
      updatePauseStageUI();
    } else {
      pauseOverlay.style.display = 'none';
      pauseOverlay.setAttribute('aria-hidden', 'true');
      setMobileControlsActive(gameState.running && !gameState.gameOver && !gameState.win);
      gameState.last = performance.now();
      gameState.accumulator = 0;
    }
  }

  let pauseSelectedStage = 1;
  function syncPauseStatus() {
    const stageText = `第${stageLabel(pauseSelectedStage)}关`;
    const difficultyText = difficultyLabels[gameState.difficulty] || difficultyLabels.normal;
    if (pauseStatus) pauseStatus.textContent = `${stageText} · ${difficultyText}`;
    if (pauseStageNote) pauseStageNote.textContent = `当前：第${stageLabel(gameState.stage || 1)}关`;
  }
  function setPauseSelectedStage(stage) {
    pauseSelectedStage = clampStage(stage);
    document.querySelectorAll('#pauseStageList .pause-stage-btn').forEach(btn => {
      const active = parseInt(btn.dataset.stage, 10) === pauseSelectedStage;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    syncPauseStatus();
  }
  function buildPauseStageButtons() {
    const list = document.getElementById('pauseStageList');
    if (!list) return;
    list.replaceChildren();
    for (const stage of LEVEL_IDS) {
      const btn = document.createElement('button');
      btn.className = 'pause-stage-btn';
      btn.type = 'button';
      btn.dataset.stage = String(stage);
      btn.textContent = stageLabel(stage);
      btn.setAttribute('aria-pressed', 'false');
      btn.onclick = () => {
        setPauseSelectedStage(stage);
      };
      list.appendChild(btn);
    }
  }
  function updatePauseStageUI() {
    setPauseSelectedStage(gameState.stage || 1);
  }



  function difficultyValue(group, fallback) {
    const values = CONFIG.difficulty[group] || {};
    return values[gameState.difficulty] ?? fallback;
  }
  function enemyStatMult() {
    return difficultyValue('statMult', CONFIG.difficulty.statMult.normal);
  }
  function enemyFireMult() {
    return difficultyValue('fireMult', CONFIG.difficulty.fireMult.normal);
  }

  startBtn.onclick = () => { audio.init(); audio.resume(); startGame(gameState.difficulty); };

  function selectDifficulty(diff) {
    gameState.difficulty = diff;
    diffButtons.forEach(btn => {
      const active = btn.dataset.diff === diff;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    if (difficultySummary) {
      difficultySummary.textContent = difficultySummaries[diff] || difficultySummaries.normal;
    }
  }

  // 难度选择
  diffButtons.forEach((btn, index) => {
    btn.onclick = () => selectDifficulty(btn.dataset.diff);
    btn.onkeydown = e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const next = (index + dir + diffButtons.length) % diffButtons.length;
      diffButtons[next].focus();
      selectDifficulty(diffButtons[next].dataset.diff);
    };
  });
  selectDifficulty(gameState.difficulty);

  // 暂停菜单按钮
  buildPauseStageButtons();
  updatePauseStageUI();
  document.getElementById('resumeBtn').onclick = () => togglePause();
  document.getElementById('pauseRestartBtn').onclick = () => { audio.init(); audio.resume(); startGame(gameState.difficulty); };
  document.getElementById('pauseStageStartBtn').onclick = () => { audio.init(); audio.resume(); startGame(gameState.difficulty, pauseSelectedStage); };

  function startGame(diff, startStage) {
    if (gameState.stageMessage) { gameState.stageMessage.remove(); gameState.stageMessage = null; }
    if (gameState.stageTimeout) { clearTimeout(gameState.stageTimeout); gameState.stageTimeout = null; }
    if (gameState.rafId) cancelAnimationFrame(gameState.rafId);
    gameState.running = false;
    gameState.paused = false;
    setMobileControlsActive(false);
    document.getElementById('pauseOverlay').style.display = 'none';
    document.getElementById('pauseOverlay').setAttribute('aria-hidden', 'true');
    gameState.camX = 0; gameState.score = 0; gameState.stage = clampStage(startStage || 1); gameState.shake = 0; gameState.totalTime = 0;
    gameState.stats = freshRunStats();
    buildLevel();
    player.life = CONFIG.player.life[diff] || CONFIG.player.life.normal;
    player.maxLife = player.life;
    player.weapon = 'normal'; player.weaponTimer = 0;
    resetPlayer(true);
    // 清空输入状态，防止用空格/回车点击按钮时触发跳跃/射击
    input.keys = {};
    input.mouse.down = false;
    input.touch.left = input.touch.right = input.touch.up = input.touch.down = input.touch.jump = input.touch.fire = false;
    input.jumpHeld = false;
    input.jumpBuffer = 0;
    gameState.gameOver = false; gameState.win = false;
    if (menuCard) menuCard.hidden = false;
    if (endCard) endCard.hidden = true;
    overlay.style.display = 'none';
    updateHUD();
    gameState.running = true;
    setMobileControlsActive(true);
    gameState.last = performance.now();
    gameState.accumulator = 0;
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
      loadingText.textContent = '核心资源加载中 ' + pct + '%';
    },
    () => {
      loadingOverlay.classList.add('hide');
      startBtn.textContent = '开始突击';
      startBtn.disabled = false;
      buildLevel();
      render();
    }
  );

  // 初始渲染一帧背景（资源未加载完成时的占位）
  buildLevel(); render();
})();
