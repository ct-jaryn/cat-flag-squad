((root) => {
  function makeInputState() {
    return {
      keys: {},
      mouse: { x: 0, y: 0, down: false },
      touch: { left: false, right: false, up: false, down: false, jump: false, fire: false },
      jumpBuffer: 0,
      coyoteTime: 0,
      jumpHeld: false
    };
  }

  function resetInput(input) {
    input.keys = {};
    input.mouse.down = false;
    input.touch.left = false;
    input.touch.right = false;
    input.touch.up = false;
    input.touch.down = false;
    input.touch.jump = false;
    input.touch.fire = false;
    input.jumpBuffer = 0;
    input.coyoteTime = 0;
    input.jumpHeld = false;
  }

  function createInputController(options) {
    const opts = options || {};
    const win = opts.window || root;
    const doc = opts.document || win.document;
    const canvas = opts.canvas;
    const input = opts.input || makeInputState();
    const jumpBufferSeconds = opts.jumpBufferSeconds ?? 0.12;
    const canvasWidth = opts.canvasWidth || canvas?.width || 1;
    const canvasHeight = opts.canvasHeight || canvas?.height || 1;
    const noop = () => {};
    const isHelpOpen = opts.isHelpOpen || (() => false);
    const closeHelp = opts.closeHelp || noop;
    const shouldStartFromEnter = opts.shouldStartFromEnter || (() => false);
    const startFromEnter = opts.startFromEnter || noop;
    const shouldTogglePause = opts.shouldTogglePause || (() => false);
    const togglePause = opts.togglePause || noop;
    const shouldAutoPauseOnBlur = opts.shouldAutoPauseOnBlur || (() => false);
    const resumeAudio = opts.resumeAudio || noop;

    win.addEventListener('keydown', e => {
      const key = String(e.key || '');
      const lowerKey = key.toLowerCase();
      if (key === 'Escape' && isHelpOpen()) {
        closeHelp();
        e.preventDefault();
        return;
      }
      if (key === 'Enter' && shouldStartFromEnter()) {
        startFromEnter();
        e.preventDefault();
        return;
      }
      input.keys[lowerKey] = true;
      if ((key === ' ' || key === 'ArrowUp') && !input.jumpHeld) {
        input.jumpHeld = true;
        input.jumpBuffer = jumpBufferSeconds;
      }
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) e.preventDefault();
      if ((key === 'Escape' || lowerKey === 'p') && shouldTogglePause()) {
        togglePause();
      }
    });

    win.addEventListener('keyup', e => {
      const key = String(e.key || '');
      input.keys[key.toLowerCase()] = false;
      if (key === ' ' || key === 'ArrowUp') input.jumpHeld = false;
    });

    if (canvas) {
      canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        input.mouse.x = (e.clientX - rect.left) * (canvasWidth / rect.width);
        input.mouse.y = (e.clientY - rect.top) * (canvasHeight / rect.height);
      });
      canvas.addEventListener('mousedown', () => { input.mouse.down = true; });
      canvas.addEventListener('contextmenu', e => e.preventDefault());
    }
    win.addEventListener('mouseup', () => { input.mouse.down = false; });

    const mobileControls = doc?.getElementById('mobileControls');
    const mobileButtons = {
      left: doc?.getElementById('btnLeft'),
      right: doc?.getElementById('btnRight'),
      up: doc?.getElementById('btnUp'),
      down: doc?.getElementById('btnDown'),
      jump: doc?.getElementById('btnJump'),
      fire: doc?.getElementById('btnFire')
    };

    if (mobileControls && ('ontouchstart' in win || win.navigator?.maxTouchPoints > 0)) {
      mobileControls.classList.add('show');
    }

    function setMobileControlsActive(active) {
      if (!mobileControls) return;
      mobileControls.classList.toggle('active', active && mobileControls.classList.contains('show'));
    }

    function bindMobileButton(btn, stateKey, config = {}) {
      if (!btn) return;
      const set = (active) => {
        input.touch[stateKey] = active;
        btn.classList.toggle('active', active);
        if (active && config.jump) input.jumpBuffer = jumpBufferSeconds;
      };
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); set(true); if (config.fire) input.mouse.down = true; resumeAudio(); }, { passive: false });
      btn.addEventListener('touchend', (e) => { e.preventDefault(); set(false); if (config.fire && !input.touch.fire) input.mouse.down = false; }, { passive: false });
      btn.addEventListener('touchcancel', (e) => { e.preventDefault(); set(false); if (config.fire) input.mouse.down = false; }, { passive: false });
      btn.addEventListener('mousedown', (e) => { e.preventDefault(); set(true); if (config.fire) input.mouse.down = true; });
      btn.addEventListener('mouseup', (e) => { e.preventDefault(); set(false); if (config.fire) input.mouse.down = false; });
      btn.addEventListener('mouseleave', () => { set(false); if (config.fire) input.mouse.down = false; });
    }

    bindMobileButton(mobileButtons.left, 'left');
    bindMobileButton(mobileButtons.right, 'right');
    bindMobileButton(mobileButtons.up, 'up');
    bindMobileButton(mobileButtons.down, 'down');
    bindMobileButton(mobileButtons.jump, 'jump', { jump: true });
    bindMobileButton(mobileButtons.fire, 'fire', { fire: true });

    win.addEventListener('blur', () => {
      resetInput(input);
      if (shouldAutoPauseOnBlur()) togglePause();
    });
    win.addEventListener('mouseleave', () => { input.mouse.down = false; });

    return {
      input,
      reset: () => resetInput(input),
      setMobileControlsActive
    };
  }

  const api = { createInputController, makeInputState, resetInput };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CAT_FLAG_INPUT_CONTROLLER = api;
})(typeof window !== 'undefined' ? window : globalThis);
