import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();

class ClassList {
  constructor(owner, initial = '') {
    this.owner = owner;
    this.set = new Set();
    this.fromString(initial);
  }

  fromString(value) {
    this.set = new Set(String(value || '').split(/\s+/).filter(Boolean));
  }

  toString() {
    return Array.from(this.set).join(' ');
  }

  contains(name) {
    return this.set.has(name);
  }

  add(...names) {
    for (const name of names) this.set.add(name);
    this.owner._className = this.toString();
  }

  remove(...names) {
    for (const name of names) this.set.delete(name);
    this.owner._className = this.toString();
  }

  toggle(name, force) {
    const shouldAdd = force === undefined ? !this.set.has(name) : !!force;
    if (shouldAdd) this.set.add(name);
    else this.set.delete(name);
    this.owner._className = this.toString();
    return shouldAdd;
  }
}

class FakeElement {
  constructor(document, tagName, id = '', className = '') {
    this.ownerDocument = document;
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.attributes = new Map();
    this.dataset = {};
    this.eventListeners = new Map();
    this.hidden = false;
    this.disabled = false;
    this._textContent = '';
    this._className = '';
    this.classList = new ClassList(this);
    this.className = className;
    if (id) this.id = id;
  }

  get className() {
    return this._className;
  }

  set className(value) {
    this._className = String(value || '');
    this.classList.fromString(this._className);
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = String(value ?? '');
  }

  get id() {
    return this.attributes.get('id') || '';
  }

  set id(value) {
    this.setAttribute('id', value);
  }

  setAttribute(name, value) {
    const stringValue = String(value);
    this.attributes.set(name, stringValue);
    if (name === 'id') this.ownerDocument.registerId(stringValue, this);
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      this.dataset[key] = stringValue;
    }
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  appendChild(child) {
    if (typeof child === 'string') {
      this.textContent += child;
      return child;
    }
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  append(...nodes) {
    for (const node of nodes) this.appendChild(node);
  }

  replaceChildren(...nodes) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    this.append(...nodes);
  }

  remove() {
    if (!this.parentNode) return;
    const siblings = this.parentNode.children;
    const index = siblings.indexOf(this);
    if (index >= 0) siblings.splice(index, 1);
    this.parentNode = null;
  }

  contains(node) {
    if (node === this) return true;
    return this.children.some(child => child.contains?.(node));
  }

  addEventListener(type, handler) {
    if (!this.eventListeners.has(type)) this.eventListeners.set(type, []);
    this.eventListeners.get(type).push(handler);
  }

  dispatchEvent(event) {
    event.target = event.target || this;
    const handlers = this.eventListeners.get(event.type) || [];
    for (const handler of handlers) handler(event);
    const prop = `on${event.type}`;
    if (typeof this[prop] === 'function') this[prop](event);
  }

  click() {
    if (this.disabled) return;
    this.dispatchEvent(makeEvent('click'));
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    return collectDescendants(this).filter(node => matchesSelector(node, selector, this.ownerDocument));
  }
}

class FakeCanvas extends FakeElement {
  constructor(document, id, width, height, context) {
    super(document, 'canvas', id);
    this.width = width;
    this.height = height;
    this.context = context;
  }

  getContext(type) {
    assert.equal(type, '2d', 'Game should request a 2D canvas context.');
    return this.context;
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, width: this.width, height: this.height };
  }
}

class FakeDocument {
  constructor(context) {
    this.context = context;
    this.byId = new Map();
    this.all = [];
    this.body = this.createElement('body');
    this.activeElement = this.body;
  }

  register(element) {
    this.all.push(element);
    return element;
  }

  registerId(id, element) {
    this.byId.set(id, element);
  }

  createElement(tagName) {
    return this.register(new FakeElement(this, tagName));
  }

  createCanvas(id, width, height) {
    return this.register(new FakeCanvas(this, id, width, height, this.context));
  }

  getElementById(id) {
    return this.byId.get(id) || null;
  }

  querySelectorAll(selector) {
    if (selector.includes(' ')) {
      const [scopeSelector, childSelector] = selector.split(/\s+/, 2);
      return this.all.filter(node => matchesSelector(node, childSelector, this) && hasAncestor(node, scopeSelector, this));
    }
    return this.all.filter(node => matchesSelector(node, selector, this));
  }
}

class FakeImage {
  constructor() {
    this.complete = false;
    this.naturalWidth = 0;
    this.naturalHeight = 0;
    this.width = 0;
    this.height = 0;
    this.onload = null;
    this.onerror = null;
  }

  set src(value) {
    this._src = value;
    const { width, height } = imageSizeFor(value);
    this.width = width;
    this.height = height;
    this.naturalWidth = width;
    this.naturalHeight = height;
    this.complete = true;
    queueMicrotask(() => this.onload?.());
  }

  get src() {
    return this._src;
  }
}

function makeCanvasContext() {
  const ops = [];
  const ctx = {
    __ops: ops,
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    globalAlpha: 1,
    imageSmoothingEnabled: true,
    save: () => ops.push(['save']),
    restore: () => ops.push(['restore']),
    translate: (x, y) => ops.push(['translate', x, y]),
    scale: (x, y) => ops.push(['scale', x, y]),
    rotate: angle => ops.push(['rotate', angle]),
    beginPath: () => ops.push(['beginPath']),
    moveTo: (x, y) => ops.push(['moveTo', x, y]),
    lineTo: (x, y) => ops.push(['lineTo', x, y]),
    quadraticCurveTo: (...args) => ops.push(['quadraticCurveTo', ...args]),
    arc: (...args) => ops.push(['arc', ...args]),
    fill: () => ops.push(['fill']),
    stroke: () => ops.push(['stroke']),
    fillRect: (...args) => ops.push(['fillRect', ...args]),
    strokeRect: (...args) => ops.push(['strokeRect', ...args]),
    clearRect: (...args) => ops.push(['clearRect', ...args]),
    drawImage: (...args) => ops.push(['drawImage', args.length]),
    fillText: (...args) => ops.push(['fillText', ...args]),
    setLineDash: value => ops.push(['setLineDash', value]),
    createLinearGradient: (...args) => {
      ops.push(['createLinearGradient', ...args]);
      return { addColorStop: (...stopArgs) => ops.push(['addColorStop', ...stopArgs]) };
    }
  };
  return ctx;
}

function collectDescendants(rootNode) {
  const nodes = [];
  for (const child of rootNode.children || []) {
    nodes.push(child);
    nodes.push(...collectDescendants(child));
  }
  return nodes;
}

function hasAncestor(node, selector, document) {
  let cursor = node.parentNode;
  while (cursor) {
    if (matchesSelector(cursor, selector, document)) return true;
    cursor = cursor.parentNode;
  }
  return false;
}

function matchesSelector(node, selector) {
  if (!node || !selector) return false;
  if (selector.startsWith('#')) return node.id === selector.slice(1);
  if (selector.startsWith('.')) return node.classList.contains(selector.slice(1));
  return node.tagName.toLowerCase() === selector.toLowerCase();
}

function imageSizeFor(src) {
  if (src.includes('cat_hero_sheet')) return { width: 576, height: 64 };
  if (src.includes('bg') || src.includes('cover') || src.includes('sky')) return { width: 960, height: 540 };
  return { width: 256, height: 256 };
}

function makeEvent(type, extras = {}) {
  return {
    type,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    ...extras
  };
}

function createRuntime() {
  const ctx = makeCanvasContext();
  const document = new FakeDocument(ctx);

  const body = document.body;
  const wrap = element(document, 'div', 'wrap');
  body.appendChild(wrap);
  wrap.appendChild(document.createCanvas('game', 960, 540));

  for (const id of ['life', 'stage', 'score', 'highScore']) {
    wrap.appendChild(element(document, 'span', id));
  }

  const loadingOverlay = element(document, 'div', 'loadingOverlay');
  loadingOverlay.appendChild(element(document, 'div', 'loadingBar'));
  loadingOverlay.appendChild(element(document, 'div', 'loadingText'));
  wrap.appendChild(loadingOverlay);

  const overlay = element(document, 'div', 'overlay');
  const menuCard = element(document, 'div', '', 'card menu-card');
  overlay.appendChild(menuCard);
  menuCard.appendChild(element(document, 'img', 'coverArt', 'cover-art'));

  for (const diff of ['easy', 'normal', 'hard']) {
    const button = element(document, 'button', '', diff === 'easy' ? 'diff-btn active' : 'diff-btn');
    button.dataset.diff = diff;
    button.setAttribute('aria-pressed', String(diff === 'easy'));
    menuCard.appendChild(button);
  }

  menuCard.appendChild(element(document, 'div', 'difficultySummary'));
  menuCard.appendChild(element(document, 'button', 'startBtn', 'btn'));
  menuCard.appendChild(element(document, 'button', 'helpBtn', 'btn btn-secondary'));
  overlay.appendChild(element(document, 'div', 'helpBackdrop', 'help-backdrop'));
  const helpPanel = element(document, 'div', 'helpPanel', 'help-panel');
  helpPanel.appendChild(element(document, 'button', 'helpClose', 'help-close'));
  overlay.appendChild(helpPanel);
  body.appendChild(overlay);

  const mobileControls = element(document, 'div', 'mobileControls');
  for (const id of ['btnLeft', 'btnRight', 'btnUp', 'btnDown', 'btnJump', 'btnFire']) {
    mobileControls.appendChild(element(document, 'button', id, 'mbtn'));
  }
  body.appendChild(mobileControls);

  const pauseOverlay = element(document, 'div', 'pauseOverlay');
  pauseOverlay.appendChild(element(document, 'span', 'pauseStatus'));
  pauseOverlay.appendChild(element(document, 'div', 'pauseStageNote'));
  pauseOverlay.appendChild(element(document, 'button', 'resumeBtn'));
  pauseOverlay.appendChild(element(document, 'button', 'pauseRestartBtn'));
  pauseOverlay.appendChild(element(document, 'div', 'pauseStageList'));
  pauseOverlay.appendChild(element(document, 'button', 'pauseStageStartBtn'));
  body.appendChild(pauseOverlay);

  let rafId = 0;
  const rafQueue = new Map();
  const windowListeners = new Map();
  const windowObject = {
    document,
    navigator: { maxTouchPoints: 0 },
    AudioContext: undefined,
    webkitAudioContext: undefined,
    addEventListener(type, handler) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(handler);
    },
    dispatchEvent(event) {
      const handlers = windowListeners.get(event.type) || [];
      for (const handler of handlers) handler(event);
    },
    requestAnimationFrame(callback) {
      const id = ++rafId;
      rafQueue.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      rafQueue.delete(id);
    },
    localStorage: storage(),
    performance: { now: () => 1000 },
    setTimeout,
    clearTimeout,
    console,
    Image: FakeImage
  };

  const sandbox = {
    ...windowObject,
    window: windowObject,
    document,
    navigator: windowObject.navigator,
    localStorage: windowObject.localStorage,
    performance: windowObject.performance,
    requestAnimationFrame: windowObject.requestAnimationFrame,
    cancelAnimationFrame: windowObject.cancelAnimationFrame,
    setTimeout,
    clearTimeout,
    Image: FakeImage,
    console
  };

  function flushAnimationFrame(time = 1016) {
    const callbacks = Array.from(rafQueue.entries());
    rafQueue.clear();
    for (const [, callback] of callbacks) callback(time);
  }

  return { sandbox, document, ctx, flushAnimationFrame, dispatchWindow: event => windowObject.dispatchEvent(event) };
}

function element(document, tagName, id = '', className = '') {
  return document.register(new FakeElement(document, tagName, id, className));
}

function storage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

async function runSmoke() {
  const runtime = createRuntime();
  const context = vm.createContext(runtime.sandbox);
  const source = [
    read('js/assets-manifest.js'),
    read('js/asset-loader.js'),
    read('js/level-schema.js'),
    read('js/input-controller.js'),
    read('js/levels.js'),
    read('js/game.js')
  ].join('\n\n');

  vm.runInContext(source, context, { filename: 'cat-flag-squad-runtime-smoke.js' });
  await Promise.resolve();

  const { document, ctx, flushAnimationFrame, dispatchWindow } = runtime;
  const startBtn = document.getElementById('startBtn');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const overlay = document.getElementById('overlay');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const pauseStageList = document.getElementById('pauseStageList');
  const resumeBtn = document.getElementById('resumeBtn');
  const helpBtn = document.getElementById('helpBtn');
  const helpPanel = document.getElementById('helpPanel');
  const helpClose = document.getElementById('helpClose');

  assert.ok(startBtn, 'Start button should exist.');
  assert.equal(startBtn.disabled, false, 'Required assets should enable the start button.');
  assert.equal(startBtn.textContent, '开始突击', 'Start button should return to the ready label.');
  assert.equal(loadingOverlay.classList.contains('hide'), true, 'Loading overlay should hide after required assets load.');
  assert.ok(ctx.__ops.length > 0, 'Initial render should draw to the canvas.');

  helpBtn.click();
  assert.equal(helpPanel.classList.contains('show'), true, 'Help panel should open from the menu.');
  helpClose.click();
  assert.equal(helpPanel.classList.contains('show'), false, 'Help panel should close.');

  const drawOpsBeforeStart = ctx.__ops.length;
  document.activeElement = document.body;
  dispatchWindow(makeEvent('keydown', { key: 'Enter' }));
  assert.equal(overlay.style.display, 'none', 'Starting the game should hide the main menu.');
  assert.equal(document.getElementById('life').textContent, '7', 'Easy mode should initialize player life.');
  assert.equal(document.getElementById('stage').textContent, '1', 'Game should start on stage 1 by default.');
  assert.equal(pauseStageList.children.length, 5, 'Pause menu should build one selector per stage.');

  flushAnimationFrame();
  assert.ok(ctx.__ops.length > drawOpsBeforeStart, 'A gameplay frame should render after starting.');

  dispatchWindow(makeEvent('keydown', { key: 'Escape' }));
  assert.equal(pauseOverlay.style.display, 'flex', 'Escape should open the pause overlay during gameplay.');
  assert.equal(pauseOverlay.getAttribute('aria-hidden'), 'false', 'Pause overlay should be visible to assistive tech.');

  resumeBtn.click();
  assert.equal(pauseOverlay.style.display, 'none', 'Resume should close the pause overlay.');
  assert.equal(pauseOverlay.getAttribute('aria-hidden'), 'true', 'Pause overlay should be hidden after resume.');

  console.log('Runtime smoke test passed.');
}

runSmoke().catch(error => {
  console.error(error);
  process.exit(1);
});
