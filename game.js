/* =========================================================
   Balon Udara — Petualangan di Langit
   Game arcade santai untuk anak-anak.
   ========================================================= */
'use strict';

(() => {
  // -------------------------------------------------------
  // Canvas
  // -------------------------------------------------------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = 0;
  let H = 0;
  let DPR = 1;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(320, window.innerWidth);
    H = Math.max(320, window.innerHeight);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 120));
  resize();

  // -------------------------------------------------------
  // Helpers
  // -------------------------------------------------------
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const smooth = (t) => t * t * (3 - 2 * t);

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mixRgb(a, b, t) {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  }
  function rgbStr(c, a = 1) {
    return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
  }
  function shade(hex, amt) {
    const c = hexToRgb(hex);
    const target = amt >= 0 ? [255, 255, 255] : [20, 18, 40];
    return rgbStr(mixRgb(c, target, Math.abs(amt)));
  }
  function roundRectPath(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
  function circlePath(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
  }

  // -------------------------------------------------------
  // Data
  // -------------------------------------------------------
  const SKINS = [
    { id: 'merah', name: 'Merah', main: '#ff5d73', stripe: '#ffd166', rim: '#d94a61', basket: '#a4682f' },
    { id: 'biru', name: 'Biru', main: '#4d96ff', stripe: '#7ef0e0', rim: '#3a7ad9', basket: '#a4682f' },
    { id: 'hijau', name: 'Hijau', main: '#58c97a', stripe: '#fff07a', rim: '#41a962', basket: '#9c612c' },
    { id: 'ungu', name: 'Ungu', main: '#a06bff', stripe: '#ffb3d9', rim: '#8651e6', basket: '#8c5a32' },
    { id: 'oranye', name: 'Oranye', main: '#ff9f43', stripe: '#ff6b6b', rim: '#e8862b', basket: '#8c5a32' },
  ];
  SKINS.forEach((s) => {
    s._light = shade(s.main, 0.22);
    s._dark = shade(s.main, -0.14);
    s._basketDark = shade(s.basket, -0.2);
    s._basketLight = shade(s.basket, 0.24);
  });

  const BIRD_KINDS = [
    { body: '#5aa9ff', light: '#a9d4ff', wing: '#3d7fd1', tail: '#2f6db3', belly: 'rgba(255,255,255,.5)' },
    { body: '#ff8fb1', light: '#ffc2d4', wing: '#e5648e', tail: '#c94b73', belly: 'rgba(255,255,255,.5)' },
    { body: '#ffd166', light: '#ffe8a3', wing: '#e8b23a', tail: '#c99220', belly: 'rgba(255,255,255,.55)' },
  ];

  const SKY_STOPS = [
    { alt: 0, top: '#7cc7ff', mid: '#bfe9ff', bot: '#eafcff', sun: '#fff1a8', night: 0 },
    { alt: 380, top: '#5fb3ff', mid: '#a9dfff', bot: '#e9f9ff', sun: '#ffe37a', night: 0 },
    { alt: 760, top: '#ff9d6e', mid: '#ffc78f', bot: '#ffedc9', sun: '#ffd166', night: 0.12 },
    { alt: 1120, top: '#8b5fae', mid: '#e6898f', bot: '#ffd0a0', sun: '#fff0c0', night: 0.45 },
    { alt: 1500, top: '#1a2148', mid: '#3c3a78', bot: '#7a5da0', sun: '#f6f1d6', night: 1 },
    { alt: 1880, top: '#111d3a', mid: '#293c70', bot: '#5c5394', sun: '#f6f1d6', night: 1 },
    { alt: 2180, top: '#6da9ff', mid: '#b8dcff', bot: '#ffe7cf', sun: '#ffdf80', night: 0.1 },
    { alt: 2400, top: '#7cc7ff', mid: '#bfe9ff', bot: '#eafcff', sun: '#fff1a8', night: 0 },
  ].map((s) => ({
    alt: s.alt,
    top: hexToRgb(s.top),
    mid: hexToRgb(s.mid),
    bot: hexToRgb(s.bot),
    sun: hexToRgb(s.sun),
    night: s.night,
  }));
  const SKY_CYCLE = 2400;

  function skyAt(alt) {
    const a = ((alt % SKY_CYCLE) + SKY_CYCLE) % SKY_CYCLE;
    let i = 0;
    while (i < SKY_STOPS.length - 2 && a > SKY_STOPS[i + 1].alt) i++;
    const s0 = SKY_STOPS[i];
    const s1 = SKY_STOPS[i + 1];
    const t = smooth(clamp((a - s0.alt) / (s1.alt - s0.alt), 0, 1));
    return {
      top: mixRgb(s0.top, s1.top, t),
      mid: mixRgb(s0.mid, s1.mid, t),
      bot: mixRgb(s0.bot, s1.bot, t),
      sun: mixRgb(s0.sun, s1.sun, t),
      night: lerp(s0.night, s1.night, t),
    };
  }

  const MENU_STARS = [
    [0.15, 0.30, 15, 0.0],
    [0.84, 0.24, 12, 1.2],
    [0.11, 0.55, 10, 2.1],
    [0.90, 0.50, 13, 3.4],
    [0.30, 0.14, 9, 0.7],
    [0.70, 0.12, 8, 2.7],
  ];

  // -------------------------------------------------------
  // Petualangan
  // -------------------------------------------------------
  const DEST_ALT = 1500;
  const DEST_WORLD = DEST_ALT * 25;

  const CHAPTERS = [
    { at: 0, name: 'Padang Rumput', line: 'Antar Boni pulang ke Rumah Awan!', emoji: '🌾' },
    { at: 350, name: 'Danau Pelangi', line: 'Pelangi muncul di bawah awan!', emoji: '🌈' },
    { at: 800, name: 'Awan Senja', line: 'Langit mulai berwarna jingga.', emoji: '🌅' },
    { at: 1200, name: 'Malam Berbintang', line: 'Rumah Awan sudah dekat!', emoji: '🌙' },
  ];

  const SKY_ISLANDS = [
    { alt: 185, x: 0.23, variant: 'mill', scale: 0.9 },
    { alt: 520, x: 0.75, variant: 'rainbow', scale: 1.05 },
    { alt: 950, x: 0.24, variant: 'autumn', scale: 1.0 },
    { alt: 1290, x: 0.76, variant: 'night', scale: 1.05 },
    { alt: DEST_ALT, x: 0.5, variant: 'home', scale: 1.4 },
  ];

  function chapterIndexAt(meters) {
    let idx = 0;
    for (let i = 0; i < CHAPTERS.length; i++) {
      if (meters >= CHAPTERS[i].at) idx = i;
    }
    return idx;
  }

  function chapterLabelAt(meters) {
    const idx = chapterIndexAt(meters);
    return `Bab ${idx + 1} · ${CHAPTERS[idx].name}`;
  }

  // -------------------------------------------------------
  // Sound (WebAudio, tanpa file)
  // -------------------------------------------------------
  const AudioKit = {
    ctx: null,
    master: null,
    on: true,
    noise: null,
    burner: null,
    burnerGain: null,

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.on ? 0.55 : 0.0001;
      this.master.connect(this.ctx.destination);

      const len = Math.floor(this.ctx.sampleRate * 1.2);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.03 * white) / 1.03;
        data[i] = last * 3.2;
      }
      this.noise = buf;
    },

    resume() {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    setOn(v) {
      this.on = v;
      if (this.master) {
        const t = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.setTargetAtTime(v ? 0.55 : 0.0001, t, 0.03);
      }
      if (!v) this.stopBurner();
    },

    tone(freq, dur, type = 'sine', vol = 0.15, slideTo = null, delay = 0) {
      if (!this.ctx || !this.on) return;
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.04);
    },

    noiseBurst(dur = 0.2, vol = 0.12, freq = 700) {
      if (!this.ctx || !this.on || !this.noise) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = freq;
      const g = this.ctx.createGain();
      const t0 = this.ctx.currentTime;
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f);
      f.connect(g);
      g.connect(this.master);
      src.start(t0);
      src.stop(t0 + dur + 0.03);
    },

    click() {
      this.tone(560, 0.07, 'triangle', 0.08, 760);
    },
    collect(combo = 1) {
      const base = 620 + Math.min(combo, 14) * 26;
      this.tone(base, 0.09, 'triangle', 0.11, base * 1.5);
      this.tone(base * 1.5, 0.12, 'sine', 0.07, base * 2, 0.05);
    },
    gem() {
      [880, 1174, 1568].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.09, null, i * 0.06));
    },
    heart() {
      [523, 659, 784].forEach((f, i) => this.tone(f, 0.16, 'sine', 0.11, null, i * 0.07));
    },
    shield() {
      this.tone(360, 0.25, 'sine', 0.11, 760);
      this.tone(720, 0.2, 'sine', 0.06, 980, 0.06);
    },
    magnet() {
      this.tone(240, 0.18, 'square', 0.05, 420);
      this.tone(480, 0.12, 'triangle', 0.06, 620, 0.08);
    },
    hit() {
      this.tone(190, 0.25, 'sawtooth', 0.14, 70);
      this.noiseBurst(0.18, 0.1, 500);
    },
    levelUp() {
      [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.1, null, i * 0.09));
    },
    win() {
      [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.26, 'triangle', 0.11, null, i * 0.12));
      this.tone(392, 0.7, 'sine', 0.06, 523, 0.1);
    },
    pop() {
      this.tone(520, 0.1, 'sine', 0.09, 900);
    },
    swoosh() {
      this.noiseBurst(0.3, 0.06, 1200);
    },
    takeoff() {
      this.noiseBurst(0.55, 0.1, 900);
      this.tone(220, 0.5, 'sine', 0.08, 440);
      [523, 659, 784].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.08, null, 0.15 + i * 0.07));
    },
    tornadoSpawn() {
      this.tone(90, 0.9, 'sine', 0.1, 55);
      this.noiseBurst(0.8, 0.08, 320);
      this.tone(180, 0.7, 'triangle', 0.04, 120, 0.1);
    },
    tornadoHit() {
      this.noiseBurst(0.35, 0.13, 700);
      this.tone(150, 0.4, 'sawtooth', 0.1, 60);
      this.tone(420, 0.3, 'sine', 0.05, 180);
    },

    startBurner() {
      if (!this.on) return;
      this.init();
      if (!this.ctx) return;
      if (!this.burner) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noise;
        src.loop = true;
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 420;
        const g = this.ctx.createGain();
        g.gain.value = 0.0001;
        src.connect(f);
        f.connect(g);
        g.connect(this.master);
        src.start();
        this.burner = src;
        this.burnerGain = g;
      }
      this.burnerGain.gain.setTargetAtTime(0.035, this.ctx.currentTime, 0.06);
    },
    stopBurner() {
      if (!this.burnerGain || !this.ctx) return;
      this.burnerGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.12);
    },
  };

  // -------------------------------------------------------
  // Persistence
  // -------------------------------------------------------
  const KEY_SOUND = 'balonudara.sound';
  const KEY_SKIN = 'balonudara.skin';

  function loadSound() {
    try { return localStorage.getItem(KEY_SOUND) !== 'off'; } catch (e) { return true; }
  }
  function saveSound(v) {
    try { localStorage.setItem(KEY_SOUND, v ? 'on' : 'off'); } catch (e) { /* noop */ }
  }
  function loadSkin() {
    try {
      const v = Number(localStorage.getItem(KEY_SKIN));
      return Number.isInteger(v) && v >= 0 && v < SKINS.length ? v : 0;
    } catch (e) {
      return 0;
    }
  }
  function saveSkin(v) {
    try { localStorage.setItem(KEY_SKIN, String(v)); } catch (e) { /* noop */ }
  }

  // -------------------------------------------------------
  // DOM
  // -------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const hud = $('hud');
  const heartsEl = $('hearts');
  const chapterName = $('chapterName');
  const journeyDist = $('journeyDist');
  const journeyFill = $('journeyFill');
  const journeyMarker = $('journeyMarker');
  const puShield = $('puShield');
  const puShieldTime = $('puShieldTime');
  const tornadoWarn = $('tornadoWarn');
  const screenStart = $('screenStart');
  const screenHelp = $('screenHelp');
  const screenPause = $('screenPause');
  const screenOver = $('screenOver');
  const screenWin = $('screenWin');
  const skinPicker = $('skinPicker');
  const overTitle = $('overTitle');
  const overMessage = $('overMessage');
  const overChapter = $('overChapter');
  const overDistance = $('overDistance');
  const overFill = $('overFill');
  const winDots = $('winDots');
  const btnSound = $('btnSound');
  const btnSoundMenu = $('btnSoundMenu');

  // -------------------------------------------------------
  // State
  // -------------------------------------------------------
  const G = {
    mode: 'menu',
    skin: loadSkin(),
    lives: 3,
    level: 1,
    chapter: 0,
    alt: 0,
    peakAlt: 0,
    worldY: 0,
    maxWorldY: 0,
    cam: 0,
    camPrev: 0,
    camDelta: 0,
    time: 0,
    menuT: 0,
    balloon: { x: 0, vx: 0, vy: 0, phase: 0 },
    items: [],
    birds: [],
    tornadoes: [],
    particles: [],
    texts: [],
    clouds: [],
    bgBalloons: [],
    stars: [],
    shieldUntil: 0,
    invulnUntil: 0,
    knockUntil: 0,
    spawnTimer: 2.2,
    birdTimer: 2.8,
    tornadoTimer: 11,
    shake: 0,
    banner: null,
    hint: { show: true, alpha: 1, timer: 0 },
    dyingTimer: 0,
    deathSpin: 0,
    burning: false,
    usedThrust: false,
    launchX: 0,
    launchCam: 0,
    groundWorldY: 0,
  };

  const input = {
    pointerDown: false,
    pointerId: null,
    pointerX: null,
    keyThrust: false,
    left: false,
    right: false,
  };

  AudioKit.on = loadSound();
  AudioKit.setOn(AudioKit.on);

  function isThrusting() {
    return input.pointerDown || input.keyThrust;
  }

  function screenYOf(worldY) {
    return H * 0.55 - (worldY - G.cam);
  }

  function balloonScale() {
    return clamp(Math.min(W, H) / 750, 0.68, 0.92);
  }

  function menuBalloonPos() {
    const landscape = W > H * 1.8;
    return {
      x: landscape ? W * 0.815 : W / 2,
      y: (landscape ? H * 0.46 : H * 0.34) + Math.sin(G.menuT * 1.6) * 8,
      scale: landscape ? clamp(H / 500, 0.6, 1) : clamp(Math.min(W, H) / 620, 0.85, 1.4),
    };
  }

  function birdScreenY(bird) {
    return H * 0.55 - (bird.worldY - G.cam) + Math.sin(bird.phase) * 8;
  }

  // -------------------------------------------------------
  // Backdrop
  // -------------------------------------------------------
  function makeCloud(initial) {
    return {
      x: rand(-0.1, 1.1) * W,
      y: initial ? rand(-0.2, 1.05) * H : -rand(140, 340),
      scale: rand(0.6, 1.7),
      depth: rand(0.12, 0.5),
      speed: rand(5, 17) * (Math.random() < 0.5 ? -1 : 1),
      alpha: rand(0.5, 0.9),
      puffs: Array.from({ length: randInt(4, 6) }, () => ({
        dx: rand(-1.05, 1.05),
        dy: rand(-0.15, 0.25),
        r: rand(0.55, 0.95),
      })),
    };
  }

  function resetCloud(c) {
    const fresh = makeCloud(false);
    c.x = fresh.x;
    c.y = fresh.y;
    c.scale = fresh.scale;
    c.depth = fresh.depth;
    c.speed = fresh.speed;
    c.alpha = fresh.alpha;
    c.puffs = fresh.puffs;
  }

  function resetBgBalloon(b, above) {
    b.x = rand(0.08, 0.92) * W;
    b.y = above ? -rand(140, 340) : H + rand(140, 340);
    b.scale = rand(0.25, 0.52);
    b.depth = rand(0.25, 0.6);
    b.skin = randInt(0, SKINS.length - 1);
    b.vx = rand(-12, 12);
    b.alpha = rand(0.18, 0.33);
    b.phase = rand(0, TAU);
  }

  function initBackdrop() {
    G.clouds = Array.from({ length: 10 }, () => makeCloud(true));
    G.bgBalloons = Array.from({ length: 3 }, () => {
      const b = { x: 0, y: 0, scale: 0.5, depth: 0.4, skin: 0, vx: 0, alpha: 0.3, phase: 0 };
      b.x = rand(0.08, 0.92) * W;
      b.y = rand(0.05, 0.95) * H;
      b.scale = rand(0.25, 0.52);
      b.depth = rand(0.25, 0.6);
      b.skin = randInt(0, SKINS.length - 1);
      b.vx = rand(-12, 12);
      b.alpha = rand(0.18, 0.33);
      b.phase = rand(0, TAU);
      return b;
    });
    G.stars = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.78,
      r: rand(0.7, 2.1),
      alpha: rand(0.45, 1),
      phase: rand(0, TAU),
    }));
  }
  initBackdrop();

  // -------------------------------------------------------
  // UI helpers
  // -------------------------------------------------------
  function buildSkinPicker() {
    SKINS.forEach((s, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'skin' + (i === G.skin ? ' active' : '');
      btn.title = 'Balon ' + s.name;
      btn.setAttribute('aria-label', 'Balon ' + s.name);
      btn.setAttribute('aria-pressed', i === G.skin ? 'true' : 'false');
      btn.style.background =
        `linear-gradient(90deg, ${s.main} 0 26%, ${s.stripe} 26% 42%, ${s.main} 42% 58%, ${s.stripe} 58% 74%, ${s.main} 74% 100%)`;
      btn.addEventListener('click', () => selectSkin(i));
      skinPicker.appendChild(btn);
    });
  }

  function selectSkin(i) {
    G.skin = i;
    saveSkin(i);
    [...skinPicker.children].forEach((el, idx) => {
      el.classList.toggle('active', idx === i);
      el.setAttribute('aria-pressed', idx === i ? 'true' : 'false');
    });
    AudioKit.resume();
    AudioKit.click();
    if (G.mode === 'menu') {
      const p = menuBalloonPos();
      burst(p.x, p.y, [SKINS[i].main, SKINS[i].stripe, '#ffffff'], 12);
    }
  }

  function updateSoundButtons() {
    const icon = AudioKit.on ? '🔊' : '🔇';
    const label = AudioKit.on ? 'Matikan suara' : 'Nyalakan suara';
    [btnSound, btnSoundMenu].forEach((b) => {
      b.textContent = icon;
      b.setAttribute('aria-label', label);
      b.title = AudioKit.on ? 'Suara: nyala' : 'Suara: mati';
    });
  }

  function renderHearts(popLost) {
    heartsEl.setAttribute('aria-label', `${G.lives} nyawa`);
    [...heartsEl.children].forEach((el, i) => {
      el.classList.toggle('off', i >= G.lives);
      if (popLost && i === G.lives) {
        el.classList.remove('pop');
        void el.offsetWidth;
        el.classList.add('pop');
      }
    });
  }

  const hudCache = { chapter: '', dist: -1, pct: -1, shield: -1, tornado: null };

  function updateHUD(force = false) {
    const label = chapterLabelAt(G.peakAlt);
    if (force || hudCache.chapter !== label) {
      chapterName.textContent = label;
      hudCache.chapter = label;
    }

    const remaining = Math.max(0, Math.ceil(DEST_ALT - G.peakAlt));
    if (force || hudCache.dist !== remaining) {
      journeyDist.textContent = `${remaining} m lagi`;
      hudCache.dist = remaining;
    }

    const progress = clamp(G.peakAlt / DEST_ALT, 0, 1);
    if (force || Math.abs(hudCache.pct - progress) > 0.005) {
      const pct = progress * 100;
      journeyFill.style.width = pct.toFixed(1) + '%';
      journeyMarker.style.left = clamp(pct, 1, 96).toFixed(1) + '%';
      hudCache.pct = progress;
    }

    const sh = Math.max(0, Math.ceil(G.shieldUntil - G.time));
    if (force || hudCache.shield !== sh) {
      puShield.classList.toggle('hidden', sh <= 0);
      puShieldTime.textContent = String(sh);
      hudCache.shield = sh;
    }

    const tornadoNear = G.tornadoes.some((t) => {
      const sy = screenYOf(t.worldY);
      const halfH = t.height / 2;
      return sy + halfH > -160 && sy - halfH < H + 40;
    });
    if (force || hudCache.tornado !== tornadoNear) {
      tornadoWarn.classList.toggle('hidden', !tornadoNear);
      hudCache.tornado = tornadoNear;
    }
  }

  function resetHUDCache() {
    hudCache.chapter = '';
    hudCache.dist = -1;
    hudCache.pct = -1;
    hudCache.shield = -1;
    hudCache.tornado = null;
  }

  // -------------------------------------------------------
  // Screen flow
  // -------------------------------------------------------
  function showOverlay(el) {
    el.classList.remove('hidden');
  }
  function hideOverlay(el) {
    el.classList.add('hidden');
  }

  function clearInput() {
    input.pointerDown = false;
    input.pointerId = null;
    input.pointerX = null;
    input.keyThrust = false;
    input.left = false;
    input.right = false;
  }

  function resetGame() {
    AudioKit.stopBurner();
    G.burning = false;
    G.lives = 3;
    G.level = 1;
    G.chapter = 0;
    G.alt = 0;
    G.peakAlt = 0;
    G.worldY = 0;
    G.maxWorldY = 0;
    G.cam = H * 0.18;
    G.camPrev = G.cam;
    G.camDelta = 0;
    G.launchCam = G.cam;
    G.launchX = W / 2;
    G.groundWorldY = -H * 0.2;
    G.time = 0;
    G.balloon.x = W / 2;
    G.balloon.vx = 0;
    G.balloon.vy = 0;
    G.balloon.phase = rand(0, TAU);
    G.items.length = 0;
    G.birds.length = 0;
    G.tornadoes.length = 0;
    G.particles.length = 0;
    G.texts.length = 0;
    G.shieldUntil = 0;
    G.invulnUntil = 0;
    G.knockUntil = 0;
    G.spawnTimer = 2.4;
    G.birdTimer = 2.8;
    G.tornadoTimer = 11;
    G.shake = 0;
    G.banner = null;
    G.hint = { show: true, alpha: 1, timer: 0 };
    G.dyingTimer = 0;
    G.deathSpin = 0;
    G.usedThrust = false;
    clearInput();
    resetHUDCache();
    renderHearts(false);
    updateHUD(true);
  }

  function blurActive() {
    const el = document.activeElement;
    if (el && typeof el.blur === 'function') el.blur();
  }

  function startGame() {
    AudioKit.resume();
    blurActive();
    hideOverlay(screenStart);
    hideOverlay(screenHelp);
    hideOverlay(screenPause);
    hideOverlay(screenOver);
    hideOverlay(screenWin);
    hud.classList.remove('hidden');
    resetGame();
    G.mode = 'playing';
    last = performance.now();
  }

  function goHome() {
    AudioKit.stopBurner();
    G.burning = false;
    G.mode = 'menu';
    clearInput();
    blurActive();
    hideOverlay(screenOver);
    hideOverlay(screenPause);
    hideOverlay(screenHelp);
    hideOverlay(screenWin);
    hud.classList.add('hidden');
    showOverlay(screenStart);
    G.items.length = 0;
    G.birds.length = 0;
    G.tornadoes.length = 0;
    G.particles.length = 0;
    G.texts.length = 0;
    updateHUD(true);
  }

  function pauseGame() {
    if (G.mode !== 'playing') return;
    G.mode = 'paused';
    AudioKit.stopBurner();
    G.burning = false;
    clearInput();
    showOverlay(screenPause);
  }

  function resumeGame() {
    if (G.mode !== 'paused') return;
    blurActive();
    hideOverlay(screenPause);
    G.mode = 'playing';
    last = performance.now();
  }

  function endGame() {
    G.mode = 'over';
    AudioKit.stopBurner();
    G.burning = false;
    clearInput();
    hud.classList.add('hidden');

    const idx = chapterIndexAt(G.peakAlt);
    overChapter.textContent = `Bab ${idx + 1} · ${CHAPTERS[idx].name}`;
    overFill.style.width = (clamp(G.peakAlt / DEST_ALT, 0, 1) * 100).toFixed(1) + '%';
    const remaining = Math.max(0, Math.ceil(DEST_ALT - G.peakAlt));
    overDistance.textContent = remaining > 0
      ? `${remaining} m lagi ke Rumah Awan`
      : 'Rumah Awan sudah dekat!';
    overTitle.textContent = idx >= 3 ? 'Hampir Sampai!' : 'Balonnya Mendarat';
    overMessage.textContent = idx >= 3
      ? 'Sedikit lagi! Ayo coba sekali lagi.'
      : 'Tidak apa-apa, ayo coba lagi ya!';

    showOverlay(screenOver);
    updateHUD(true);
  }

  function winGame() {
    if (G.mode !== 'playing') return;
    G.mode = 'won';
    AudioKit.stopBurner();
    G.burning = false;
    clearInput();
    hideOverlay(screenPause);
    hideOverlay(screenOver);
    hud.classList.add('hidden');
    G.banner = null;
    G.shake = 0;
    G.tornadoes.length = 0;
    G.birds.length = 0;
    G.items.length = 0;
    G.texts.length = 0;
    confetti();
    winDots.innerHTML = CHAPTERS.map(() => '<span></span>').join('');
    showOverlay(screenWin);
    AudioKit.win();
    updateHUD(true);
  }

  // -------------------------------------------------------
  // Input
  // -------------------------------------------------------
  function pointerXFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    return e.clientX - rect.left;
  }

  canvas.addEventListener('pointerdown', (e) => {
    AudioKit.resume();
    if (G.mode !== 'playing') return;
    e.preventDefault();
    input.pointerDown = true;
    input.pointerId = e.pointerId;
    input.pointerX = pointerXFromEvent(e);
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!input.pointerDown || e.pointerId !== input.pointerId) return;
    e.preventDefault();
    input.pointerX = pointerXFromEvent(e);
  });

  function releasePointer(e) {
    if (e.pointerId !== input.pointerId) return;
    input.pointerDown = false;
    input.pointerId = null;
  }
  window.addEventListener('pointerup', releasePointer);
  window.addEventListener('pointercancel', releasePointer);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    const code = e.code;
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
      if (G.mode === 'playing') {
        input.keyThrust = true;
        e.preventDefault();
      }
    }
    if (code === 'ArrowLeft' || code === 'KeyA') {
      input.left = true;
      if (G.mode === 'playing') e.preventDefault();
    }
    if (code === 'ArrowRight' || code === 'KeyD') {
      input.right = true;
      if (G.mode === 'playing') e.preventDefault();
    }
    if (code === 'Escape' || code === 'KeyP') {
      if (!screenHelp.classList.contains('hidden')) {
        hideOverlay(screenHelp);
        showOverlay(screenStart);
      } else if (G.mode === 'playing') {
        pauseGame();
      } else if (G.mode === 'paused') {
        resumeGame();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    const code = e.code;
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') input.keyThrust = false;
    if (code === 'ArrowLeft' || code === 'KeyA') input.left = false;
    if (code === 'ArrowRight' || code === 'KeyD') input.right = false;
  });

  window.addEventListener('blur', () => {
    input.keyThrust = false;
    input.left = false;
    input.right = false;
    input.pointerDown = false;
    input.pointerId = null;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.mode === 'playing') pauseGame();
  });

  // -------------------------------------------------------
  // Particles & floating text
  // -------------------------------------------------------
  function burst(x, y, colors, n, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const sp = rand(60, 260) * power;
      const life = rand(0.4, 0.9);
      G.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        grav: 220,
        life,
        maxLife: life,
        size: rand(2, 5.2),
        color: pick(colors),
        shape: 'circle',
        rot: 0,
        vr: 0,
      });
    }
    if (G.particles.length > 280) G.particles.splice(0, G.particles.length - 280);
  }

  function confetti() {
    const colors = ['#ff5d73', '#ffd93d', '#4d96ff', '#6bcb77', '#a06bff', '#7ef0e0'];
    for (let i = 0; i < 44; i++) {
      const life = rand(1.8, 3);
      G.particles.push({
        x: rand(0, W),
        y: rand(-H * 0.2, -10),
        vx: rand(-40, 40),
        vy: rand(80, 230),
        grav: 130,
        life,
        maxLife: life,
        size: rand(4, 9),
        color: pick(colors),
        shape: 'rect',
        rot: rand(0, TAU),
        vr: rand(-7, 7),
      });
    }
  }

  function addText(x, y, text, color, size = 21) {
    G.texts.push({ x, y, text, color, size, life: 1.1, maxLife: 1.1, vy: -68 });
  }

  function updateParticles(dt) {
    for (let i = G.particles.length - 1; i >= 0; i--) {
      const p = G.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        G.particles.splice(i, 1);
        continue;
      }
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
  }

  function updateTexts(dt) {
    for (let i = G.texts.length - 1; i >= 0; i--) {
      const t = G.texts[i];
      t.life -= dt;
      if (t.life <= 0) {
        G.texts.splice(i, 1);
        continue;
      }
      t.y += t.vy * dt;
    }
  }

  // -------------------------------------------------------
  // Backdrop updates
  // -------------------------------------------------------
  function updateClouds(dt) {
    for (const c of G.clouds) {
      c.y += (G.camDelta || 0) * c.depth;
      c.x += c.speed * dt;
      if (c.x > W + 300) c.x = -300;
      if (c.x < -300) c.x = W + 300;
      if (c.y > H + 320) resetCloud(c);
    }
  }

  function updateBgBalloons(dt) {
    for (const b of G.bgBalloons) {
      if (G.mode === 'menu') {
        b.y -= (8 + b.depth * 12) * dt;
        b.x += Math.sin(G.menuT * 0.4 + b.phase) * 6 * dt + b.vx * dt;
        if (b.y < -220) resetBgBalloon(b, false);
      } else {
        b.y += (G.camDelta || 0) * b.depth;
        b.x += Math.sin(G.time * 0.4 + b.phase) * 8 * dt + b.vx * dt;
        if (b.y > H + 240) resetBgBalloon(b, true);
      }
      if (b.x < -170) b.x = W + 170;
      if (b.x > W + 170) b.x = -170;
    }
  }

  // -------------------------------------------------------
  // Spawning
  // -------------------------------------------------------
  function randomItemType() {
    if (G.lives < 3 && Math.random() < 0.62) return 'heart';
    return 'shield';
  }

  function itemRadius(type) {
    if (type === 'heart') return 21;
    return 23;
  }

  function spawnItem(type) {
    const t = type || randomItemType();
    let x;
    if (Math.random() < 0.55) x = clamp(G.balloon.x + rand(-0.28, 0.28) * W, 64, W - 64);
    else x = rand(64, W - 64);
    const worldY = G.cam + H * 0.55 + rand(80, 260);
    G.items.push({
      type: t,
      x,
      worldY,
      r: itemRadius(t),
      phase: rand(0, TAU),
      age: 0,
    });
  }

  function spawnBird() {
    const fromLeft = Math.random() < 0.5;
    const targetScreenY = rand(0.06, 0.42) * H;
    const worldY = G.cam + H * 0.55 - targetScreenY;
    const speed = (95 + G.level * 7 + rand(0, 35)) * (fromLeft ? 1 : -1);
    G.birds.push({
      x: fromLeft ? -60 : W + 60,
      worldY,
      vx: speed,
      phase: rand(0, TAU),
      kind: randInt(0, BIRD_KINDS.length - 1),
      r: 22,
      age: 0,
    });
  }

  // -------------------------------------------------------
  // Collecting & damage
  // -------------------------------------------------------
  function collectItem(item) {
    const idx = G.items.indexOf(item);
    if (idx >= 0) G.items.splice(idx, 1);
    const sx = item.x;
    const sy = screenYOf(item.worldY);

    if (item.type === 'heart') {
      if (G.lives < 3) {
        G.lives++;
        renderHearts(false);
        addText(sx, sy, '+1 Nyawa', '#ff5d73');
      } else {
        addText(sx, sy, 'Nyawa penuh', '#ff5d73');
      }
      AudioKit.heart();
      burst(sx, sy, ['#ff8fb1', '#ff5d73', '#ffffff'], 14);
    } else if (item.type === 'shield') {
      G.shieldUntil = G.time + 10;
      AudioKit.shield();
      addText(sx, sy, 'Gelembung pelindung!', '#00a6b8');
      burst(sx, sy, ['#7ef0e0', '#b2fef7', '#ffffff'], 16);
    }
  }

  function hitBird(index) {
    const bird = G.birds[index];
    if (!bird) return;
    const bx = bird.x;
    const by = birdScreenY(bird);

    // Saat kebal setelah tertabrak, burung tetap dihalau agar tidak menabrak berulang.
    if (G.time < G.invulnUntil) {
      G.birds.splice(index, 1);
      burst(bx, by, ['#ffffff', '#bde0ff'], 8, 0.7);
      return;
    }

    if (G.shieldUntil > G.time) {
      G.birds.splice(index, 1);
      AudioKit.pop();
      burst(bx, by, ['#7ef0e0', '#ffffff'], 14);
      addText(bx, by, 'Terlindungi!', '#00a6b8');
      G.shake = 6;
      return;
    }

    G.birds.splice(index, 1);
    G.lives--;
    renderHearts(true);
    G.invulnUntil = G.time + 1.7;
    G.shake = 16;
    AudioKit.hit();
    burst(bx, by, ['#ff6b6b', '#ffb703', '#ffffff'], 18);
    burst(G.balloon.x, screenYOf(G.worldY), ['#ff6b6b', '#ffffff'], 10);
    addText(G.balloon.x, screenYOf(G.worldY) - 95, '-1 Nyawa', '#ff5d73', 24);

    if (G.lives <= 0) {
      G.mode = 'dying';
      G.dyingTimer = 1.5;
      G.deathSpin = 0;
      G.banner = null;
      AudioKit.stopBurner();
      G.burning = false;
      G.shake = 22;
    }
  }

  function onChapter(index) {
    const ch = CHAPTERS[index];
    if (!ch) return;
    G.banner = {
      text: `Bab ${index + 1}: ${ch.name}`,
      sub: ch.line,
      life: 2.7,
      maxLife: 2.7,
    };
    AudioKit.levelUp();
    confetti();
    if (G.lives < 3) {
      G.lives++;
      renderHearts(false);
      addText(G.balloon.x, screenYOf(G.worldY) - 140, '+1 Nyawa', '#ff5d73');
    }
  }

  function beginTakeoff() {
    const padY = screenYOf(G.groundWorldY) - 24;
    for (let i = 0; i < 20; i++) {
      const life = rand(0.6, 1.4);
      G.particles.push({
        x: G.launchX + rand(-64, 64),
        y: padY + rand(-6, 10),
        vx: rand(-130, 130),
        vy: rand(-100, -25),
        grav: 45,
        life,
        maxLife: life,
        size: rand(4, 11),
        color: pick(['#ffffff', '#e8f8e0', '#ffe9b0', '#cfe8ff', '#f6d9ff']),
        shape: 'circle',
        rot: 0,
        vr: 0,
      });
    }
    addText(G.launchX, padY - 12, 'Lepas landas!', '#2f6db3', 24);
    AudioKit.takeoff();
  }

  function spawnTornado() {
    const x = rand(0.28, 0.72) * W;
    const worldY = G.cam + H * 0.55 + rand(160, 340);
    G.tornadoes.push({
      x,
      worldY,
      height: rand(250, 330),
      r: 58,
      phase: rand(0, TAU),
      vx: rand(-9, 9),
      age: 0,
      hitUntil: 0,
    });
    AudioKit.tornadoSpawn();
  }

  function hitTornado(t, sy) {
    if (G.time < G.invulnUntil || G.time < t.hitUntil) return;
    const b = G.balloon;
    const bs = screenYOf(G.worldY);
    const dir = b.x < t.x ? -1 : 1;

    b.vx = dir * 500;
    b.vy = Math.max(b.vy, 210);
    G.knockUntil = G.time + 0.55;
    t.hitUntil = G.time + 2.2;

    if (G.shieldUntil > G.time) {
      G.invulnUntil = Math.max(G.invulnUntil, G.time + 1.3);
      G.shake = 12;
      AudioKit.pop();
      addText(b.x, bs - 95, 'Terlindungi!', '#00a6b8', 23);
      burst(b.x, bs, ['#7ef0e0', '#ffffff', '#c9f7ff'], 18);
      return;
    }

    G.lives--;
    renderHearts(true);
    G.invulnUntil = G.time + 1.9;
    G.shake = 20;
    AudioKit.tornadoHit();
    burst(b.x, bs, ['#b7c5d8', '#ffffff', '#ffd166', '#8fa3bd', '#d9e7f5'], 26);
    addText(b.x, bs - 105, 'Angin puting beliung!', '#ff5d73', 22);

    if (G.lives <= 0) {
      G.mode = 'dying';
      G.dyingTimer = 1.5;
      G.deathSpin = 0;
      G.banner = null;
      AudioKit.stopBurner();
      G.burning = false;
      G.shake = 24;
    }
  }

  function updateTornadoes(dt, bs) {
    for (let i = G.tornadoes.length - 1; i >= 0; i--) {
      const t = G.tornadoes[i];
      t.age += dt;
      t.phase += dt;
      t.x += Math.sin(t.phase * 0.8) * 26 * dt + t.vx * dt;
      t.x = clamp(t.x, 70, W - 70);

      const sy = screenYOf(t.worldY);
      const halfH = t.height / 2;
      if (sy - halfH > H + 220 || sy + halfH < -H * 0.6 || t.age > 26) {
        G.tornadoes.splice(i, 1);
        continue;
      }

      const dx = G.balloon.x - t.x;
      const dy = bs - sy;
      if (Math.abs(dy) < halfH - 6) {
        const u = clamp((dy + halfH) / t.height, 0, 1);
        const halfW = lerp(t.r, 16, u) + 24;
        if (Math.abs(dx) < halfW) {
          hitTornado(t, sy);
        }
      }
    }
  }

  // -------------------------------------------------------
  // Update
  // -------------------------------------------------------
  function updatePlaying(dt) {
    G.time += dt;
    const b = G.balloon;
    const thrust = isThrusting();

    if (thrust !== G.burning) {
      G.burning = thrust;
      if (thrust) AudioKit.startBurner();
      else AudioKit.stopBurner();
    }

    if (thrust && !G.usedThrust) beginTakeoff();
    if (thrust) G.usedThrust = true;

    if (!G.usedThrust) {
      // Balon masih terikat di landasan peluncuran.
      b.vy = 0;
      b.vx = 0;
      b.x = G.launchX;
      G.worldY = 0;
      G.camPrev = G.cam;
      G.camDelta = 0;
    } else {
      if (thrust) b.vy = Math.min(430, b.vy + 1500 * dt);
      else b.vy = Math.max(-200, b.vy - 480 * dt);
      G.worldY += b.vy * dt;

      // Jangan biarkan balon tenggelam terlalu jauh dari titik tertinggi,
      // dan jangan sampai menembus landasan.
      if (G.worldY > G.maxWorldY) G.maxWorldY = G.worldY;
      const floorY = Math.max(0, G.maxWorldY - H);
      if (G.worldY < floorY) {
        G.worldY = floorY;
        if (b.vy < 0) b.vy = 0;
      }

      // Steering
      if (G.time < G.knockUntil) {
        // Saat terseret angin, kendali agak kacau sebentar.
        b.vx *= Math.exp(-1.4 * dt);
      } else {
        let targetVx = 0;
        if (input.left) targetVx -= 310;
        if (input.right) targetVx += 310;
        if (input.pointerDown && input.pointerX != null) {
          targetVx = clamp((input.pointerX - b.x) * 5.5, -360, 360);
        }
        b.vx += (targetVx - b.vx) * (1 - Math.exp(-9 * dt));
      }
      b.x = clamp(b.x + b.vx * dt, 46, Math.max(46, W - 46));

      // Camera follows the balloon with a soft lag
      G.camPrev = G.cam;
      G.cam += (G.worldY - G.cam) * (1 - Math.exp(-4 * dt));
      G.camDelta = G.cam - G.camPrev;
    }

    // Ketinggian, bab perjalanan, dan tujuan
    G.alt = Math.max(0, G.worldY) / 25;
    if (G.alt > G.peakAlt) G.peakAlt = G.alt;

    const lvl = 1 + Math.floor(G.peakAlt / 300);
    if (lvl > G.level) G.level = lvl;

    const ch = chapterIndexAt(G.peakAlt);
    if (ch > G.chapter) {
      G.chapter = ch;
      onChapter(ch);
    }

    if (G.peakAlt >= DEST_ALT) {
      winGame();
      return;
    }

    // Hint
    if (G.usedThrust && G.hint.show) {
      G.hint.timer += dt;
      if (G.hint.timer > 1.3) {
        G.hint.alpha -= dt * 1.6;
        if (G.hint.alpha <= 0) {
          G.hint.alpha = 0;
          G.hint.show = false;
        }
      }
    }

    // Spawning (mulai setelah anak menekan tombol pertama)
    if (G.usedThrust) {
      G.spawnTimer -= dt;
      if (G.spawnTimer <= 0) {
        G.spawnTimer = rand(2.2, 3.5);
        if (G.items.length < 3) spawnItem();
      }

      G.birdTimer -= dt;
      if (G.birdTimer <= 0) {
        G.birdTimer = Math.max(1.5, 3.4 - G.level * 0.12) * rand(0.8, 1.2);
        if (G.birds.length < 5) spawnBird();
      }

      G.tornadoTimer -= dt;
      if (G.tornadoTimer <= 0) {
        G.tornadoTimer = rand(16, 25);
        if (G.tornadoes.length === 0) spawnTornado();
      }
    }

    // Items
    const bs = screenYOf(G.worldY);
    for (let i = G.items.length - 1; i >= 0; i--) {
      const it = G.items[i];
      it.phase += dt;
      it.age = (it.age || 0) + dt;

      const isy = screenYOf(it.worldY);
      if (Math.hypot(it.x - b.x, isy - bs) < it.r + 30) {
        collectItem(it);
        continue;
      }
      if (isy > H + 130 || it.age > 16) G.items.splice(i, 1);
    }

    // Birds
    for (let i = G.birds.length - 1; i >= 0; i--) {
      const bird = G.birds[i];
      bird.x += bird.vx * dt;
      bird.phase += dt * 3;
      bird.age = (bird.age || 0) + dt;
      const by = birdScreenY(bird);
      if (bird.x < -130 || bird.x > W + 130 || by > H + 150 || bird.age > 18) {
        G.birds.splice(i, 1);
        continue;
      }
      if (Math.hypot(bird.x - b.x, by - bs) < 44) {
        hitBird(i);
      }
    }

    updateTornadoes(dt, bs);

    updateClouds(dt);
    updateBgBalloons(dt);
    updateParticles(dt);
    updateTexts(dt);

    if (G.banner) {
      G.banner.life -= dt;
      if (G.banner.life <= 0) G.banner = null;
    }

    G.shake *= Math.exp(-5 * dt);
    if (G.shake < 0.3) G.shake = 0;
  }

  function updateDying(dt) {
    G.time += dt;
    G.dyingTimer -= dt;
    const b = G.balloon;
    b.vy = Math.max(b.vy - 520 * dt, -430);
    G.worldY += b.vy * dt;
    G.deathSpin += dt * 3.4;

    G.camPrev = G.cam;
    G.cam += (G.worldY - G.cam) * (1 - Math.exp(-3 * dt));
    G.camDelta = G.cam - G.camPrev;

    updateClouds(dt);
    updateBgBalloons(dt);
    updateParticles(dt);
    updateTexts(dt);
    G.shake *= Math.exp(-4 * dt);
    if (G.shake < 0.3) G.shake = 0;

    if (G.dyingTimer <= 0) endGame();
  }

  function updateMenu(dt) {
    G.menuT += dt;
    G.camDelta = 0;
    updateClouds(dt);
    updateBgBalloons(dt);
    updateParticles(dt);
    updateTexts(dt);
  }

  function updateWon(dt) {
    G.time += dt;
    updateParticles(dt);
    updateTexts(dt);
  }

  // -------------------------------------------------------
  // Drawing — sky & backdrop
  // -------------------------------------------------------
  function drawSky(sky) {
    const g = ctx.createLinearGradient(0, -40, 0, H + 40);
    g.addColorStop(0, rgbStr(sky.top));
    g.addColorStop(0.55, rgbStr(sky.mid));
    g.addColorStop(1, rgbStr(sky.bot));
    ctx.fillStyle = g;
    ctx.fillRect(-50, -50, W + 100, H + 100);
  }

  function drawSunMoon(sky) {
    const R = clamp(Math.min(W, H) * 0.075, 34, 64);
    const cx = W * 0.79;
    const cy = H * 0.17;
    const night = sky.night;

    if (night < 0.98) {
      ctx.save();
      ctx.globalAlpha = 1 - night * 0.85;
      const glow = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 2.6);
      glow.addColorStop(0, rgbStr(sky.sun, 0.55));
      glow.addColorStop(1, rgbStr(sky.sun, 0));
      ctx.fillStyle = glow;
      circlePath(cx, cy, R * 2.6);
      ctx.fill();

      const core = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.1, cx, cy, R * 1.05);
      core.addColorStop(0, '#fffdf0');
      core.addColorStop(0.45, rgbStr(sky.sun));
      core.addColorStop(1, rgbStr(mixRgb(sky.sun, [255, 170, 70], 0.4)));
      ctx.fillStyle = core;
      circlePath(cx, cy, R);
      ctx.fill();
      ctx.restore();
    }

    if (night > 0.02) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, night * 1.15);
      const mg = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, R * 2.2);
      mg.addColorStop(0, 'rgba(255,255,235,.35)');
      mg.addColorStop(1, 'rgba(255,255,235,0)');
      ctx.fillStyle = mg;
      circlePath(cx, cy, R * 2.2);
      ctx.fill();

      ctx.fillStyle = '#f7f3d8';
      circlePath(cx, cy, R * 0.85);
      ctx.fill();

      ctx.fillStyle = 'rgba(190,185,160,.35)';
      circlePath(cx - R * 0.24, cy - R * 0.16, R * 0.16);
      ctx.fill();
      circlePath(cx + R * 0.28, cy + R * 0.1, R * 0.11);
      ctx.fill();
      circlePath(cx - R * 0.05, cy + R * 0.32, R * 0.09);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawStars(sky) {
    if (sky.night < 0.03) return;
    ctx.save();
    for (const s of G.stars) {
      const tw = 0.5 + 0.5 * Math.sin(G.time * 1.6 + s.phase);
      ctx.globalAlpha = sky.night * (0.25 + 0.75 * tw) * s.alpha;
      ctx.fillStyle = '#ffffff';
      circlePath(s.x * W, s.y * H, s.r);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawClouds(sky) {
    const base = mixRgb([255, 255, 255], [116, 126, 172], sky.night * 0.6);
    for (const c of G.clouds) {
      const a = c.alpha * (0.62 + 0.38 * (1 - sky.night * 0.45));
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.scale, c.scale);
      ctx.globalAlpha = a;
      ctx.fillStyle = rgbStr(base);
      ctx.beginPath();
      for (const p of c.puffs) {
        const px = p.dx * 46;
        const py = p.dy * 30;
        const pr = p.r * 26;
        ctx.moveTo(px + pr, py);
        ctx.arc(px, py, pr, 0, TAU);
      }
      ctx.fill();

      ctx.globalAlpha = a * 0.32;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      for (const p of c.puffs) {
        const px = p.dx * 46 - 4;
        const py = p.dy * 30 - 7;
        const pr = p.r * 26 * 0.68;
        ctx.moveTo(px + pr, py);
        ctx.arc(px, py, pr, 0, TAU);
      }
      ctx.fill();
      ctx.restore();
    }
  }

  function drawBgBalloons() {
    for (const b of G.bgBalloons) {
      drawBalloon(
        b.x,
        b.y + Math.sin(G.time * 0.8 + b.phase) * 4,
        b.scale,
        SKINS[b.skin],
        {
          alpha: b.alpha,
          simple: true,
          tilt: Math.sin(G.time * 0.5 + b.phase) * 0.05,
          time: G.time,
        }
      );
    }
  }

  // -------------------------------------------------------
  // Drawing — launch site
  // -------------------------------------------------------
  function drawHillLayer(baseY, amp, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    for (let i = -1; i <= 4; i++) {
      const cx = (i / 3) * W;
      const rx = W * (0.17 + (i % 2) * 0.035);
      const ry = amp * (0.8 + (i % 3) * 0.15);
      ctx.beginPath();
      ctx.ellipse(cx, baseY, rx, ry, 0, Math.PI, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTree(x, baseY, s, palette) {
    const p = palette || ['#3f9d4a', '#52b45a', '#6cc76d'];
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(s, s);

    ctx.fillStyle = 'rgba(30,70,35,.18)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 30, 7, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#8a5a33';
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-4, -42);
    ctx.lineTo(4, -42);
    ctx.lineTo(7, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = p[0];
    circlePath(0, -48, 27);
    ctx.fill();
    ctx.fillStyle = p[1];
    circlePath(-17, -36, 19);
    ctx.fill();
    circlePath(18, -38, 20);
    ctx.fill();
    ctx.fillStyle = p[2];
    circlePath(2, -61, 19);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    circlePath(-6, -66, 9);
    ctx.fill();

    ctx.restore();
  }

  function drawHouse(x, baseY, t, windowColor) {
    ctx.save();
    ctx.translate(x, baseY);

    ctx.fillStyle = 'rgba(30,70,35,.16)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 46, 9, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#fff3d6';
    ctx.fillRect(-34, -54, 68, 54);
    ctx.strokeStyle = 'rgba(120,80,40,.18)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-34, -54, 68, 54);

    ctx.fillStyle = '#e5655d';
    ctx.beginPath();
    ctx.moveTo(-44, -54);
    ctx.lineTo(0, -88);
    ctx.lineTo(44, -54);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c94b45';
    ctx.fillRect(-44, -57, 88, 6);

    ctx.fillStyle = '#a4682f';
    ctx.fillRect(-10, -30, 20, 30);
    ctx.fillStyle = '#f5c76f';
    circlePath(6, -15, 2);
    ctx.fill();

    if (windowColor) {
      const glow = ctx.createRadialGradient(19.5, -36.5, 1, 19.5, -36.5, 36);
      glow.addColorStop(0, 'rgba(255,210,110,.45)');
      glow.addColorStop(1, 'rgba(255,210,110,0)');
      ctx.fillStyle = glow;
      circlePath(19.5, -36.5, 36);
      ctx.fill();
    }

    ctx.fillStyle = windowColor || '#9ad8ff';
    ctx.fillRect(12, -44, 15, 15);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, -44, 15, 15);

    ctx.fillStyle = '#b26a4a';
    ctx.fillRect(18, -96, 10, 19);
    for (let i = 0; i < 3; i++) {
      const a = (t * 0.5 + i * 0.33) % 1;
      ctx.globalAlpha = (1 - a) * 0.4;
      ctx.fillStyle = '#ffffff';
      circlePath(23 + Math.sin(t + i) * 5, -102 - a * 32, 4 + a * 5);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPerson(x, baseY, i, t) {
    const colors = ['#ff6b6b', '#4d96ff', '#6bcb77', '#ffd93d', '#a06bff'];
    const c = colors[i % colors.length];
    const bob = Math.sin(t * 2 + i * 1.3) * 1.5;
    const wave = Math.sin(t * 5 + i) * 0.7;

    ctx.save();
    ctx.translate(x, baseY + bob);

    ctx.strokeStyle = '#3b4a5a';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, -10);
    ctx.lineTo(-5, 0);
    ctx.moveTo(4, -10);
    ctx.lineTo(5, 0);
    ctx.stroke();

    ctx.fillStyle = c;
    roundRectPath(-8, -29, 16, 20, 7);
    ctx.fill();

    ctx.fillStyle = '#f4c9a0';
    circlePath(0, -36, 7);
    ctx.fill();

    ctx.fillStyle = '#5a3a24';
    ctx.beginPath();
    ctx.arc(0, -38, 7, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();

    ctx.strokeStyle = c;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(6, -25);
    ctx.lineTo(13, -31 + wave * 4);
    ctx.stroke();
    ctx.fillStyle = '#f4c9a0';
    circlePath(13, -31 + wave * 4, 2.4);
    ctx.fill();

    ctx.restore();
  }

  function drawWindsock(x, baseY, t) {
    const topY = baseY - 108;
    ctx.strokeStyle = '#e7e2d8';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x, topY);
    ctx.stroke();
    ctx.fillStyle = '#d8d2c4';
    ctx.beginPath();
    ctx.ellipse(x, baseY, 9, 3, 0, 0, TAU);
    ctx.fill();

    const wav = Math.sin(t * 3.1) * 0.08;
    ctx.save();
    ctx.translate(x, topY + 5);
    ctx.rotate(-0.05 + wav);

    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.bezierCurveTo(-20, -16, -46, -14, -66, -5);
    ctx.bezierCurveTo(-46, 3, -20, 12, 0, 10);
    ctx.closePath();
    ctx.fillStyle = '#ff8a4c';
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    ctx.fillRect(-18, -18, 11, 34);
    ctx.fillRect(-41, -18, 11, 34);
    ctx.fillRect(-62, -18, 9, 34);
    ctx.restore();

    ctx.fillStyle = '#fff4e6';
    circlePath(0, 3, 5);
    ctx.fill();
    ctx.restore();
  }

  function drawLaunchPad(x, groundY, t) {
    const padTop = groundY - 27;
    const scale = balloonScale();

    // Kaki panggung
    ctx.fillStyle = '#7a4f2a';
    ctx.fillRect(x - 56, padTop + 11, 10, 27);
    ctx.fillRect(x + 46, padTop + 11, 10, 27);

    // Papan panggung
    ctx.fillStyle = '#a4682f';
    roundRectPath(x - 78, padTop, 156, 14, 5);
    ctx.fill();
    ctx.fillStyle = '#c98a4a';
    roundRectPath(x - 80, padTop - 5, 160, 9, 4);
    ctx.fill();

    ctx.strokeStyle = 'rgba(80,45,20,.32)';
    ctx.lineWidth = 1.5;
    for (let i = -66; i <= 66; i += 22) {
      ctx.beginPath();
      ctx.moveTo(x + i, padTop - 4);
      ctx.lineTo(x + i, padTop + 7);
      ctx.stroke();
    }

    // Bendera kecil di sisi panggung
    const flagCols = ['#ff5d73', '#ffd93d', '#4d96ff'];
    [-74, 74].forEach((off, i) => {
      ctx.strokeStyle = '#7a4f2a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + off, padTop);
      ctx.lineTo(x + off, padTop - 44);
      ctx.stroke();
      const flap = Math.sin(t * 4 + i * 1.7) * 3;
      ctx.fillStyle = flagCols[i % flagCols.length];
      ctx.beginPath();
      ctx.moveTo(x + off, padTop - 44);
      ctx.lineTo(x + off + 20, padTop - 38 + flap);
      ctx.lineTo(x + off, padTop - 30);
      ctx.closePath();
      ctx.fill();
    });

    // Tali penambat saat balon belum lepas landas
    if (!G.usedThrust && G.mode === 'playing') {
      const basketY = screenYOf(G.worldY) + 134 * scale;
      ctx.strokeStyle = 'rgba(92,62,38,.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 36, padTop);
      ctx.quadraticCurveTo(x - 30, (padTop + basketY) / 2, x - 15 * scale, basketY);
      ctx.moveTo(x + 36, padTop);
      ctx.quadraticCurveTo(x + 30, (padTop + basketY) / 2, x + 15 * scale, basketY);
      ctx.stroke();
    }
  }

  function drawLaunchScene() {
    const groundY = screenYOf(G.groundWorldY);
    if (groundY > H + 380 || groundY < -H * 0.4) return;
    const t = G.time;

    // Bukit di kejauhan
    drawHillLayer(groundY - 2, H * 0.075, '#a6e38f', 0.9);
    drawHillLayer(groundY + 4, H * 0.045, '#7fcf72', 1);

    // Lapangan rumput
    if (groundY < H + 40) {
      const grass = ctx.createLinearGradient(0, groundY, 0, H);
      grass.addColorStop(0, '#8bda73');
      grass.addColorStop(1, '#55b158');
      ctx.fillStyle = grass;
      ctx.fillRect(-60, groundY, W + 120, Math.max(0, H - groundY + 80));

      // Rumput kecil
      ctx.strokeStyle = 'rgba(40,120,50,.35)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 9; i++) {
        const gx = (i + 0.6) * (W / 9);
        const gy = groundY + 26 + (i % 3) * 15;
        if (gy > H - 4) continue;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx - 4, gy - 7);
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx, gy - 9);
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + 4, gy - 6);
        ctx.stroke();
      }
    }

    // Tanah di sekitar panggung
    ctx.fillStyle = 'rgba(139,96,55,.42)';
    ctx.beginPath();
    ctx.ellipse(G.launchX, groundY + 5, 138, 20, 0, 0, TAU);
    ctx.fill();

    // Pohon & rumah
    const isMobile = W < 560;
    if (isMobile) {
      drawTree(W * 0.07, groundY + 3, 0.9);
      drawTree(W * 0.93, groundY + 5, 1.05);
    } else {
      drawTree(W * 0.1, groundY + 3, 0.95);
      drawTree(W * 0.9, groundY + 5, 1.1);
      if (W > 950) {
        drawTree(W * 0.2, groundY + 2, 0.7);
        drawHouse(W * 0.25, groundY + 4, t);
      }
    }

    drawLaunchPad(G.launchX, groundY, t);

    // Penonton kecil & windsock
    if (isMobile) {
      const crowd = [-125, -100];
      crowd.forEach((off, i) => drawPerson(G.launchX + off, groundY + 3, i, t));
      drawWindsock(G.launchX + 120, groundY, t);
    } else {
      const crowd = [-128, -158, 118, 148];
      crowd.forEach((off, i) => drawPerson(G.launchX + off, groundY + 3, i, t));
      drawWindsock(Math.min(W - 34, G.launchX + 250), groundY, t);
    }
  }

  // -------------------------------------------------------
  // Drawing — pulau terapung & rumah awan
  // -------------------------------------------------------
  function drawTinyBear(x, baseY, s, wave) {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(s, s);

    ctx.fillStyle = 'rgba(30,60,35,.2)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 4, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#a9713f';
    ctx.beginPath();
    ctx.ellipse(-5, -7, 6, 9, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(5, -7, 6, 9, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#c98a5b';
    ctx.beginPath();
    ctx.ellipse(0, -24, 14, 18, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#e9c39c';
    ctx.beginPath();
    ctx.ellipse(0, -23, 8, 11, 0, 0, TAU);
    ctx.fill();

    const arm = Math.sin(wave) * 5;
    ctx.strokeStyle = '#c98a5b';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(10, -30);
    ctx.lineTo(18, -38 - arm);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, -30);
    ctx.lineTo(-16, -24);
    ctx.stroke();

    ctx.fillStyle = '#b5794e';
    circlePath(-10, -56, 6);
    ctx.fill();
    circlePath(10, -56, 6);
    ctx.fill();
    ctx.fillStyle = '#e7b48c';
    circlePath(-10, -56, 3);
    ctx.fill();
    circlePath(10, -56, 3);
    ctx.fill();

    ctx.fillStyle = '#c98a5b';
    circlePath(0, -46, 13);
    ctx.fill();

    ctx.fillStyle = '#f3d7b6';
    ctx.beginPath();
    ctx.ellipse(0, -42, 7, 5.5, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#3a2a22';
    circlePath(-4.5, -48, 1.7);
    ctx.fill();
    circlePath(4.5, -48, 1.7);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -43, 2.3, 1.8, 0, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = '#3a2a22';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -41, 3.2, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();

    ctx.restore();
  }

  function drawWindmill(x, baseY, t) {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(0.9, 0.9);

    ctx.fillStyle = 'rgba(30,60,35,.16)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 28, 6, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#fff3d6';
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(18, 0);
    ctx.lineTo(12, -56);
    ctx.lineTo(-12, -56);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,40,.18)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#e5655d';
    ctx.beginPath();
    ctx.moveTo(-20, -56);
    ctx.lineTo(0, -72);
    ctx.lineTo(20, -56);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#a4682f';
    roundRectPath(-6, -20, 12, 20, 3);
    ctx.fill();

    ctx.save();
    ctx.translate(0, -58);
    ctx.rotate(t * 0.9);
    ctx.strokeStyle = '#8a5a33';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -28);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.86)';
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(8, -21);
      ctx.lineTo(0, -15);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }

  function drawIslandWaterfall(x, y, t) {
    ctx.save();
    ctx.globalAlpha = 0.62;
    const g = ctx.createLinearGradient(0, y, 0, y + 118);
    g.addColorStop(0, '#c9f6ff');
    g.addColorStop(1, 'rgba(126,214,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.quadraticCurveTo(x - 2, y + 52, x - 8, y + 118);
    ctx.lineTo(x + 8, y + 112);
    ctx.quadraticCurveTo(x + 12, y + 52, x + 8, y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const off = Math.sin(t * 4 + i) * 4;
      ctx.beginPath();
      ctx.moveTo(x - 2 + i * 5, y + 10);
      ctx.quadraticCurveTo(x - 7 + off + i * 5, y + 55, x - 3 + i * 5, y + 92);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLantern(x, y, t, phase) {
    const bob = Math.sin(t * 1.8 + phase) * 3;
    const g = ctx.createRadialGradient(x, y + bob, 1, x, y + bob, 16);
    g.addColorStop(0, 'rgba(255,230,150,.6)');
    g.addColorStop(1, 'rgba(255,230,150,0)');
    ctx.fillStyle = g;
    circlePath(x, y + bob, 16);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    circlePath(x, y + bob, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    circlePath(x - 0.8, y + bob - 0.8, 1);
    ctx.fill();
  }

  function drawFloatingIsland(x, topY, scale, variant, time) {
    const isNight = variant === 'night' || variant === 'home';
    ctx.save();
    ctx.translate(x, topY);
    ctx.scale(scale, scale);

    // Cahaya lembut
    const aura = ctx.createRadialGradient(0, -18, 12, 0, -18, 215);
    aura.addColorStop(0, isNight ? 'rgba(255,222,140,.22)' : 'rgba(255,255,255,.24)');
    aura.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(0, -14, 215, 162, 0, 0, TAU);
    ctx.fill();

    // Pelangi
    if (variant === 'rainbow') {
      const cols = ['#ff6b6b', '#ffb703', '#ffd93d', '#6bcb77', '#4d96ff', '#a06bff'];
      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      for (let i = 0; i < cols.length; i++) {
        ctx.strokeStyle = cols[i];
        ctx.beginPath();
        ctx.arc(0, -18, 92 + i * 9, Math.PI * 1.02, Math.PI * 1.98);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Batu kecil yang ikut melayang
    ctx.fillStyle = 'rgba(112,86,62,.42)';
    const floatRocks = [[-158, 58, 12], [150, 76, 9], [-112, 108, 7], [122, 118, 6]];
    for (const r of floatRocks) {
      ctx.beginPath();
      ctx.ellipse(r[0], r[1] + Math.sin(time * 1.2 + r[0]) * 3, r[2], r[2] * 0.62, 0, 0, TAU);
      ctx.fill();
    }

    // Dasar batu pulau
    const rock = ctx.createLinearGradient(0, -8, 0, 134);
    rock.addColorStop(0, '#9d7b55');
    rock.addColorStop(0.5, '#7b5b3e');
    rock.addColorStop(1, '#55402c');
    ctx.fillStyle = rock;
    ctx.beginPath();
    ctx.moveTo(-132, -2);
    ctx.bezierCurveTo(-116, 30, -70, 44, -30, 92);
    ctx.bezierCurveTo(-14, 112, -4, 122, 4, 132);
    ctx.bezierCurveTo(20, 108, 44, 84, 70, 56);
    ctx.bezierCurveTo(102, 28, 120, 12, 132, -2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,42,28,.24)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(54,38,25,.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-78, 22);
    ctx.lineTo(-52, 58);
    ctx.lineTo(-64, 76);
    ctx.moveTo(50, 34);
    ctx.lineTo(36, 66);
    ctx.lineTo(52, 86);
    ctx.moveTo(-10, 48);
    ctx.lineTo(-2, 82);
    ctx.stroke();

    // Akar menjuntai
    ctx.strokeStyle = 'rgba(84,118,56,.42)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const rx = -84 + i * 56;
      ctx.beginPath();
      ctx.moveTo(rx, 8);
      ctx.quadraticCurveTo(rx + 10, 42, rx - 4, 70 + i * 8);
      ctx.stroke();
    }

    // Rumput
    ctx.fillStyle = '#5ab35c';
    ctx.beginPath();
    ctx.ellipse(0, -3, 132, 24, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#8bda73';
    ctx.beginPath();
    ctx.ellipse(0, -7, 128, 20, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath();
    ctx.ellipse(-20, -12, 74, 8, 0, 0, TAU);
    ctx.fill();

    // Bunga-bunga kecil
    for (let i = 0; i < 7; i++) {
      const fx = -102 + i * 34;
      const fy = -2 + (i % 2) * 7;
      ctx.strokeStyle = '#3f9346';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(fx, fy + 4);
      ctx.lineTo(fx, fy);
      ctx.stroke();
      ctx.fillStyle = i % 2 ? '#fff3b0' : '#ffb3c7';
      circlePath(fx, fy - 1, 2.2);
      ctx.fill();
    }

    // Dekorasi sesuai jenis pulau
    if (variant === 'mill') {
      drawWindmill(-28, -6, time);
      drawTree(60, -4, 0.78);
    } else if (variant === 'rainbow') {
      drawTree(-58, -4, 0.82);
      drawTree(48, -2, 0.64);
      drawIslandWaterfall(84, -4, time);
    } else if (variant === 'autumn') {
      drawTree(-56, -4, 0.9, ['#c96a2b', '#e08a35', '#f2b441']);
      drawHouse(36, -5, time, '#ffd27a');
      for (let i = 0; i < 4; i++) {
        const lx = -86 + i * 34;
        const ly = -42 + Math.sin(time * 1.2 + i) * 8;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(time + i);
        ctx.fillStyle = i % 2 ? '#e08a35' : '#c96a2b';
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 2, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    } else if (variant === 'night') {
      drawTree(-58, -4, 0.88, ['#2f6a5a', '#3f8c70', '#62b58c']);
      drawHouse(34, -5, time, '#ffd27a');
      for (let i = 0; i < 6; i++) {
        drawLantern(-96 + i * 36, -28 - (i % 2) * 8, time, i * 1.4);
      }
    } else if (variant === 'home') {
      drawHouse(34, -5, time, '#ffd27a');
      drawTinyBear(100, 1, 0.55, time * 4);
      drawTinyBear(119, 3, 0.48, time * 4 + 1.6);
      for (let i = 0; i < 3; i++) {
        drawLantern(58 + i * 22, -28 - (i % 2) * 7, time, i * 1.6 + 0.4);
      }
      // Papan nama
      ctx.fillStyle = '#8a5a33';
      ctx.fillRect(-37, -29, 4, 27);
      ctx.fillStyle = '#c98a4a';
      roundRectPath(-62, -47, 50, 19, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,55,25,.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#5b3a1f';
      ctx.font = '800 8px "Baloo 2", "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('RUMAH AWAN', -37, -36);
      // Hati kecil di atas rumah
      const hp = 1 + Math.sin(time * 2) * 0.06;
      ctx.save();
      ctx.translate(40, -116);
      ctx.scale(hp, hp);
      ctx.globalAlpha = 0.8;
      heartPath(0, 0, 9);
      ctx.fillStyle = '#ff8fb1';
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  function drawSkyIslands(time) {
    for (const isl of SKY_ISLANDS) {
      const sy = screenYOf(isl.alt * 25);
      if (sy < -500 || sy > H + 500) continue;
      const x = W * isl.x;
      const scale = isl.scale * clamp(W / 1000, 0.62, 1.1);
      drawFloatingIsland(x, sy + Math.sin(time * 0.7 + isl.alt) * 4, scale, isl.variant, time);
    }
  }

  function drawWinScene() {
    const sky = skyAt(1480);
    drawSky(sky);
    drawSunMoon(sky);
    drawStars(sky);

    // Cahaya hangat di sekitar rumah
    const glow = ctx.createRadialGradient(W / 2, H * 0.42, 20, W / 2, H * 0.42, W * 0.48);
    glow.addColorStop(0, 'rgba(255,222,140,.24)');
    glow.addColorStop(1, 'rgba(255,222,140,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Awan lembut di bawah
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#ffffff';
    for (const p of [
      [W * 0.12, H * 0.74, 56], [W * 0.17, H * 0.76, 38],
      [W * 0.88, H * 0.78, 64], [W * 0.82, H * 0.8, 42],
      [W * 0.5, H * 0.88, 80],
    ]) {
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], p[2], p[2] * 0.34, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    const baseScale = clamp(W / 1100, 0.68, 1.12);
    const islandTop = H * 0.52;
    drawFloatingIsland(W / 2, islandTop, baseScale * 1.22, 'home', G.time);

    // Balon Boni mendarat di sisi kiri pulau
    const bScale = balloonScale() * 0.98;
    drawBalloon(W / 2 - 108 * baseScale, islandTop - 118 * baseScale, bScale, SKINS[G.skin], {
      tilt: 0.02,
      thrust: false,
      time: G.time,
    });

    // Hati kecil melayang
    for (let i = 0; i < 5; i++) {
      const hx = W / 2 + Math.sin(G.time * 0.5 + i * 1.3) * W * 0.33;
      const hy = H * 0.26 + Math.cos(G.time * 0.4 + i * 1.7) * H * 0.08;
      ctx.save();
      ctx.globalAlpha = 0.45 + Math.sin(G.time + i) * 0.15;
      ctx.translate(hx, hy);
      heartPath(0, 0, 5 + (i % 3) * 2);
      ctx.fillStyle = '#ff8fb1';
      ctx.fill();
      ctx.restore();
    }

    drawParticles();
    drawTexts();
  }

  // -------------------------------------------------------
  // Drawing — balloon
  // -------------------------------------------------------
  function envelopePath() {
    ctx.beginPath();
    ctx.moveTo(0, -80);
    ctx.bezierCurveTo(48, -80, 70, -46, 62, -6);
    ctx.bezierCurveTo(56, 26, 30, 48, 0, 58);
    ctx.bezierCurveTo(-30, 48, -56, 26, -62, -6);
    ctx.bezierCurveTo(-70, -46, -48, -80, 0, -80);
    ctx.closePath();
  }

  function drawBalloon(x, y, scale, skin, opts = {}) {
    const time = opts.time != null ? opts.time : G.time;
    const thrust = !!opts.thrust;
    const simple = !!opts.simple;
    const alpha = opts.alpha != null ? opts.alpha : 1;
    const tilt = opts.tilt || 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.scale(scale, scale);
    ctx.globalAlpha *= alpha;

    // Tali
    ctx.strokeStyle = 'rgba(92,62,38,.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-30, 42);
    ctx.lineTo(-21, 104);
    ctx.moveTo(30, 42);
    ctx.lineTo(21, 104);
    ctx.moveTo(-11, 54);
    ctx.lineTo(-9, 104);
    ctx.moveTo(11, 54);
    ctx.lineTo(9, 104);
    ctx.stroke();

    // Balon
    envelopePath();
    const envGrad = ctx.createLinearGradient(0, -80, 0, 60);
    envGrad.addColorStop(0, skin._light);
    envGrad.addColorStop(0.55, skin.main);
    envGrad.addColorStop(1, skin._dark);
    ctx.fillStyle = envGrad;
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = skin.stripe;
    ctx.fillRect(-22, -92, 44, 160);
    ctx.fillRect(-57, -92, 13, 160);
    ctx.fillRect(44, -92, 13, 160);

    const sideShade = ctx.createLinearGradient(-70, 0, 70, 0);
    sideShade.addColorStop(0, 'rgba(30,20,60,.18)');
    sideShade.addColorStop(0.25, 'rgba(30,20,60,0)');
    sideShade.addColorStop(0.75, 'rgba(30,20,60,0)');
    sideShade.addColorStop(1, 'rgba(30,20,60,.18)');
    ctx.fillStyle = sideShade;
    ctx.fillRect(-80, -92, 160, 160);

    ctx.fillStyle = 'rgba(255,255,255,.24)';
    ctx.beginPath();
    ctx.ellipse(-24, -44, 20, 27, -0.42, 0, TAU);
    ctx.fill();
    ctx.restore();

    envelopePath();
    ctx.strokeStyle = skin.rim;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Mulut balon
    ctx.fillStyle = skin.rim;
    ctx.beginPath();
    ctx.ellipse(0, 52, 14, 6, 0, 0, TAU);
    ctx.fill();

    // Api pembakar
    if (thrust && !simple) {
      const glow = ctx.createRadialGradient(0, 78, 2, 0, 78, 44);
      glow.addColorStop(0, 'rgba(255,200,80,.38)');
      glow.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = glow;
      circlePath(0, 78, 44);
      ctx.fill();

      const f = 0.85 + Math.sin(time * 22) * 0.1 + Math.random() * 0.12;
      ctx.save();
      ctx.translate(0, 62);
      ctx.scale(1, f);
      const fg = ctx.createLinearGradient(0, -4, 0, 32);
      fg.addColorStop(0, '#fff8c4');
      fg.addColorStop(0.45, '#ffc93c');
      fg.addColorStop(1, 'rgba(255,107,107,.15)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.bezierCurveTo(9, 8, 8, 22, 0, 31);
      ctx.bezierCurveTo(-8, 22, -9, 8, 0, -4);
      ctx.fill();
      ctx.restore();
    }

    if (!simple) {
      // Beruang kecil di keranjang
      ctx.fillStyle = '#b5794e';
      circlePath(-10, 84, 6);
      ctx.fill();
      circlePath(10, 84, 6);
      ctx.fill();
      ctx.fillStyle = '#e7b48c';
      circlePath(-10, 84, 3);
      ctx.fill();
      circlePath(10, 84, 3);
      ctx.fill();

      ctx.fillStyle = '#c98a5b';
      circlePath(0, 94, 13);
      ctx.fill();

      ctx.fillStyle = '#f3d7b6';
      ctx.beginPath();
      ctx.ellipse(0, 99, 7.5, 5.5, 0, 0, TAU);
      ctx.fill();

      ctx.fillStyle = '#3a2a22';
      circlePath(-4.6, 92, 1.7);
      ctx.fill();
      circlePath(4.6, 92, 1.7);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 97.5, 2.3, 1.8, 0, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = '#3a2a22';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 99, 3.2, 0.25 * Math.PI, 0.75 * Math.PI);
      ctx.stroke();

      // Keranjang
      ctx.fillStyle = skin._basketDark;
      ctx.beginPath();
      ctx.moveTo(-23, 104);
      ctx.lineTo(23, 104);
      ctx.lineTo(18, 138);
      ctx.lineTo(-18, 138);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(70,40,15,.28)';
      ctx.lineWidth = 1.4;
      for (let yy = 113; yy <= 130; yy += 8) {
        ctx.beginPath();
        ctx.moveTo(-22 + (yy - 104) * 0.16, yy);
        ctx.lineTo(22 - (yy - 104) * 0.16, yy);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-15, 109);
      ctx.lineTo(-12, 137);
      ctx.moveTo(0, 109);
      ctx.lineTo(0, 138);
      ctx.moveTo(15, 109);
      ctx.lineTo(12, 137);
      ctx.stroke();

      ctx.fillStyle = skin._basketLight;
      roundRectPath(-26, 99, 52, 10, 5);
      ctx.fill();
    } else {
      ctx.fillStyle = skin._basketDark;
      ctx.beginPath();
      ctx.moveTo(-23, 104);
      ctx.lineTo(23, 104);
      ctx.lineTo(18, 138);
      ctx.lineTo(-18, 138);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // -------------------------------------------------------
  // Drawing — collectibles
  // -------------------------------------------------------
  function itemGlow(x, y, r, color) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    circlePath(x, y, r);
    ctx.fill();
  }

  function drawStarShape(cx, cy, outer, inner, points, rot, fill, stroke) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = rot - Math.PI / 2 + (i * Math.PI) / points;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function heartPath(cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.78);
    ctx.bezierCurveTo(cx - s * 1.25, cy + s * 0.05, cx - s * 0.75, cy - s * 0.9, cx, cy - s * 0.3);
    ctx.bezierCurveTo(cx + s * 0.75, cy - s * 0.9, cx + s * 1.25, cy + s * 0.05, cx, cy + s * 0.78);
    ctx.closePath();
  }

  function drawItem(it) {
    const t = G.time;
    const y = screenYOf(it.worldY) + Math.sin(t * 2 + it.phase) * 3;
    const x = it.x;

    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (y < -110 || y > H + 110) return;

    if (it.type === 'heart') {
      itemGlow(x, y, 44, 'rgba(255,93,115,.3)');
      ctx.save();
      ctx.translate(x, y);
      const s = 1 + Math.sin(t * 4 + it.phase) * 0.05;
      ctx.scale(s, s);
      const g = ctx.createLinearGradient(0, -18, 0, 20);
      g.addColorStop(0, '#ff9eb5');
      g.addColorStop(1, '#ff4d6d');
      heartPath(0, 0, 19.5);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath();
      ctx.ellipse(-7, -8, 4, 2.8, -0.6, 0, TAU);
      ctx.fill();
      ctx.restore();
    } else if (it.type === 'shield') {
      itemGlow(x, y, 50, 'rgba(126,240,224,.32)');
      ctx.save();
      ctx.translate(x, y);
      const wob = 1 + Math.sin(t * 3 + it.phase) * 0.05;
      ctx.scale(wob, 2 - wob);
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, TAU);
      ctx.fillStyle = 'rgba(126,240,224,.18)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.92)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(126,240,224,.9)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-2, -2, 13, Math.PI * 1.05, Math.PI * 1.45);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      circlePath(10, 9, 2.7);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawItems() {
    for (const it of G.items) drawItem(it);
  }

  // -------------------------------------------------------
  // Drawing — tornado
  // -------------------------------------------------------
  function tornadoOffset(t, u) {
    return Math.sin(t.phase * 1.4 + u * 5.2) * (7 + u * 5);
  }

  function tornadoHalfWidth(t, u) {
    return lerp(60, 15, Math.pow(u, 0.75)) + Math.sin(t.phase * 2.1 + u * 8) * 7 * (1 - u * 0.5);
  }

  function drawTornado(t) {
    const cy = screenYOf(t.worldY);
    const halfH = t.height / 2;
    const top = cy - halfH;
    const bottom = cy + halfH;
    if (bottom < -80 || top > H + 80) return;

    const time = G.time + t.phase * 4;
    const steps = 14;

    ctx.save();

    // Aura angin
    const aura = ctx.createRadialGradient(t.x, cy, 8, t.x, cy, t.height * 0.62);
    aura.addColorStop(0, 'rgba(205,224,248,.1)');
    aura.addColorStop(1, 'rgba(205,224,248,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(t.x, cy, t.height * 0.4, t.height * 0.5, 0, 0, TAU);
    ctx.fill();

    // Awan badai di atas corong
    const cloudY = top - 8;
    const puffs = [
      [-48, -2, 34],
      [-16, -18, 42],
      [24, -12, 39],
      [58, 2, 27],
      [2, 10, 41],
    ];
    ctx.fillStyle = 'rgba(76,88,114,.82)';
    ctx.beginPath();
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i];
      const px = t.x + p[0] + Math.sin(time * 0.7 + i) * 3;
      const py = cloudY + p[1];
      const pr = p[2];
      ctx.moveTo(px + pr, py);
      ctx.arc(px, py, pr, 0, TAU);
    }
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.09)';
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const p = puffs[i];
      const px = t.x + p[0] - 6;
      const py = cloudY + p[1] - 8;
      const pr = p[2] * 0.55;
      ctx.moveTo(px + pr, py);
      ctx.arc(px, py, pr, 0, TAU);
    }
    ctx.fill();

    // Badan corong
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const y = top + u * t.height;
      const x = t.x + tornadoOffset(t, u) - tornadoHalfWidth(t, u);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = steps; i >= 0; i--) {
      const u = i / steps;
      const y = top + u * t.height;
      const x = t.x + tornadoOffset(t, u) + tornadoHalfWidth(t, u);
      ctx.lineTo(x, y);
    }
    ctx.closePath();

    const funnel = ctx.createLinearGradient(0, top, 0, bottom);
    funnel.addColorStop(0, 'rgba(64,78,106,.86)');
    funnel.addColorStop(0.42, 'rgba(104,123,154,.68)');
    funnel.addColorStop(1, 'rgba(205,218,235,.45)');
    ctx.fillStyle = funnel;
    ctx.fill();
    ctx.strokeStyle = 'rgba(52,66,92,.28)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pusaran
    for (let i = 0; i < 11; i++) {
      const u = (i / 11 + time * 0.07) % 1;
      const y = top + u * t.height;
      const w = Math.max(3, tornadoHalfWidth(t, u) * 0.95);
      const ox = tornadoOffset(t, u) + Math.sin(time * 2 + u * 8) * 6;
      ctx.beginPath();
      ctx.ellipse(t.x + ox, y, w, 3.5 + w * 0.07, 0, 0, TAU);
      ctx.strokeStyle = `rgba(255,255,255,${0.14 + 0.13 * (1 - u)})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    // Serpihan yang berputar
    for (let i = 0; i < 8; i++) {
      const u = (i / 8 + time * 0.05) % 1;
      const ang = time * 2.3 + i * 2.4;
      const w = tornadoHalfWidth(t, u) + 13;
      const x = t.x + tornadoOffset(t, u) + Math.cos(ang) * w;
      const y = top + u * t.height + Math.sin(ang) * 7;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang * 1.6);
      ctx.fillStyle = i % 2 ? '#b08a57' : '#7fa35c';
      ctx.fillRect(-5, -2, 10, 4);
      ctx.restore();
    }

    // Debu di bawah
    ctx.fillStyle = 'rgba(224,234,246,.16)';
    ctx.beginPath();
    ctx.ellipse(t.x + tornadoOffset(t, 1), bottom + 5, 38, 12, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(t.x + tornadoOffset(t, 0.95) + 15, bottom - 8, 26, 8, 0, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  function drawTornadoes() {
    for (const t of G.tornadoes) drawTornado(t);
  }

  // -------------------------------------------------------
  // Drawing — birds
  // -------------------------------------------------------
  function drawBird(bird) {
    const kind = BIRD_KINDS[bird.kind];
    const x = bird.x;
    const y = birdScreenY(bird);
    const dir = bird.vx >= 0 ? 1 : -1;
    const flap = Math.sin(bird.phase * 3.2);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.rotate(clamp(bird.vx / 900, -0.12, 0.12));

    // Ekor
    ctx.fillStyle = kind.tail;
    ctx.beginPath();
    ctx.moveTo(-13, 0);
    ctx.lineTo(-31, -10);
    ctx.lineTo(-28, 2);
    ctx.lineTo(-31, 11);
    ctx.closePath();
    ctx.fill();

    // Sayap belakang
    ctx.save();
    ctx.translate(-3, -3);
    ctx.rotate(-0.5 + flap * 0.6);
    ctx.fillStyle = kind.wing;
    ctx.beginPath();
    ctx.ellipse(-9, 0, 16, 8, -0.2, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Badan
    const g = ctx.createLinearGradient(0, -18, 0, 18);
    g.addColorStop(0, kind.light);
    g.addColorStop(0.55, kind.body);
    g.addColorStop(1, kind.wing);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 17, 0, 0, TAU);
    ctx.fill();

    // Perut
    ctx.fillStyle = kind.belly;
    ctx.beginPath();
    ctx.ellipse(3, 6, 13, 9, 0, 0, TAU);
    ctx.fill();

    // Sayap depan
    ctx.save();
    ctx.translate(2, 3);
    ctx.rotate(0.35 + flap * 0.85);
    ctx.fillStyle = kind.light;
    ctx.beginPath();
    ctx.ellipse(-6, 2, 14, 7, 0.15, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Paruh
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath();
    ctx.moveTo(19, -3);
    ctx.lineTo(32, 1);
    ctx.lineTo(19, 5);
    ctx.closePath();
    ctx.fill();

    // Mata
    ctx.fillStyle = '#ffffff';
    circlePath(10, -6, 5.2);
    ctx.fill();
    ctx.fillStyle = '#26364a';
    circlePath(11.5, -6, 2.7);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    circlePath(12.4, -7.1, 1.1);
    ctx.fill();

    // Pipi
    ctx.fillStyle = 'rgba(255,90,120,.3)';
    circlePath(6, 5, 3.2);
    ctx.fill();

    ctx.restore();
  }

  function drawBirds() {
    for (const b of G.birds) drawBird(b);
  }

  // -------------------------------------------------------
  // Drawing — player
  // -------------------------------------------------------
  function drawShieldBubble(x, y, r) {
    const t = G.time;
    const wob = 1 + Math.sin(t * 3.2) * 0.035;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(wob, 1 / wob);

    const g = ctx.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.2, 0, 0, r);
    g.addColorStop(0, 'rgba(126,240,224,.06)');
    g.addColorStop(0.75, 'rgba(126,240,224,.15)');
    g.addColorStop(1, 'rgba(126,240,224,.4)');
    ctx.fillStyle = g;
    circlePath(0, 0, r);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2.5;
    circlePath(0, 0, r);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.82, Math.PI * 1.08, Math.PI * 1.42);
    ctx.stroke();

    for (let i = 0; i < 3; i++) {
      const a = t * 0.8 + i * 2.1;
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      circlePath(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.45, 2.6);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlayer() {
    const b = G.balloon;
    const baseY = screenYOf(G.worldY);
    const bob = Math.sin(G.time * 2.2 + b.phase) * 3;
    let y = baseY + bob;
    let scale = balloonScale();
    let tilt = clamp(b.vx / 1500, -0.16, 0.16) + Math.sin(G.time * 1.7 + b.phase) * 0.015;
    let alpha = 1;
    const thrust = G.mode === 'playing' && isThrusting();

    if (G.mode === 'dying') {
      const p = clamp(1 - G.dyingTimer / 1.5, 0, 1);
      scale *= 1 - p * 0.18;
      tilt += p * 2.5;
      y += p * 30;
    }

    if (G.time < G.invulnUntil) {
      alpha = Math.sin(G.time * 28) > 0 ? 0.4 : 1;
    }

    if (G.shieldUntil > G.time && G.mode !== 'dying') {
      drawShieldBubble(b.x, y + 14 * scale, 96 * scale);
    }

    drawBalloon(b.x, y, scale, SKINS[G.skin], {
      tilt,
      thrust,
      alpha,
      time: G.time,
    });
  }

  // -------------------------------------------------------
  // Drawing — FX & UI in canvas
  // -------------------------------------------------------
  function drawParticles() {
    for (const p of G.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      } else {
        circlePath(p.x, p.y, p.size);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawTexts() {
    for (const t of G.texts) {
      const a = clamp(t.life / (t.maxLife * 0.6), 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(t.x, t.y);
      ctx.font = `800 ${t.size}px "Baloo 2", "Trebuchet MS", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(255,255,255,.92)';
      ctx.strokeText(t.text, 0, 0);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, 0, 0);
      ctx.restore();
    }
  }

  function drawBanner() {
    if (!G.banner) return;
    const b = G.banner;
    const elapsed = b.maxLife - b.life;
    const alpha = Math.min(1, elapsed * 6, b.life * 2.4);
    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2, H * 0.27);
    const pop = Math.min(1, elapsed * 5);
    const sc = 0.75 + smooth(pop) * 0.25;
    ctx.scale(sc, sc);

    const maxW = Math.min(W - 32, 480);
    let titleSize = 29;
    let subSize = 15;

    ctx.font = `800 ${titleSize}px "Baloo 2", "Trebuchet MS", sans-serif`;
    let tw = ctx.measureText(b.text).width;
    if (tw + 64 > maxW) {
      titleSize = Math.max(19, Math.floor(titleSize * ((maxW - 64) / tw)));
      ctx.font = `800 ${titleSize}px "Baloo 2", "Trebuchet MS", sans-serif`;
      tw = ctx.measureText(b.text).width;
    }

    ctx.font = `700 ${subSize}px "Baloo 2", "Trebuchet MS", sans-serif`;
    let sw = ctx.measureText(b.sub).width;
    if (sw + 64 > maxW) {
      subSize = Math.max(11, Math.floor(subSize * ((maxW - 64) / sw)));
      ctx.font = `700 ${subSize}px "Baloo 2", "Trebuchet MS", sans-serif`;
      sw = ctx.measureText(b.sub).width;
    }

    const w = Math.min(maxW, Math.max(tw, sw) + 64);
    const h = 76;

    ctx.shadowColor = 'rgba(16, 42, 80, .28)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = 'rgba(255, 253, 247, .97)';
    roundRectPath(-w / 2, -h / 2, w, h, 26);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = 'rgba(255, 255, 255, .9)';
    ctx.lineWidth = 3;
    roundRectPath(-w / 2, -h / 2, w, h, 26);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${titleSize}px "Baloo 2", "Trebuchet MS", sans-serif`;
    ctx.fillStyle = '#2f6db3';
    ctx.fillText(b.text, 0, -10);
    ctx.font = `700 ${subSize}px "Baloo 2", "Trebuchet MS", sans-serif`;
    ctx.fillStyle = '#6b829c';
    ctx.fillText(b.sub, 0, 19);
    ctx.restore();
  }

  function drawHint() {
    if (!G.hint.show || G.hint.alpha <= 0 || G.mode !== 'playing') return;
    const x = G.balloon.x;
    const y = screenYOf(G.worldY) - 140;
    const bob = Math.sin(G.time * 4) * 4;
    const pulse = 0.78 + 0.22 * Math.sin(G.time * 4);

    ctx.save();
    ctx.globalAlpha = G.hint.alpha * pulse;
    ctx.translate(x, y + bob);

    ctx.font = '800 16px "Baloo 2", "Trebuchet MS", sans-serif';
    const label = 'Tahan untuk lepas landas!';
    const tw = ctx.measureText(label).width;
    const w = tw + 64;
    const h = 40;

    ctx.fillStyle = 'rgba(255,255,255,.95)';
    roundRectPath(-w / 2, -h / 2, w, h, 20);
    ctx.fill();
    ctx.shadowColor = 'rgba(16,42,80,.2)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    roundRectPath(-w / 2, -h / 2, w, h, 20);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = '#ffe066';
    circlePath(-w / 2 + 22, 0, 13);
    ctx.fill();
    ctx.fillStyle = '#8a5a00';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 17px "Baloo 2", "Trebuchet MS", sans-serif';
    ctx.fillText('↑', -w / 2 + 22, 1);

    ctx.fillStyle = '#2f6db3';
    ctx.textAlign = 'left';
    ctx.fillText(label, -w / 2 + 42, 1);
    ctx.restore();
  }

  function drawMenuDecor(sky) {
    for (let i = 0; i < MENU_STARS.length; i++) {
      const m = MENU_STARS[i];
      const tw = 0.5 + 0.5 * Math.sin(G.menuT * 2 + m[3]);
      ctx.save();
      ctx.globalAlpha = 0.35 + tw * 0.5;
      ctx.translate(m[0] * W, m[1] * H + Math.sin(G.menuT * 1.2 + m[3]) * 6);
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, m[2] * 2.6);
      g.addColorStop(0, 'rgba(255,240,160,.7)');
      g.addColorStop(1, 'rgba(255,240,160,0)');
      ctx.fillStyle = g;
      circlePath(0, 0, m[2] * 2.6);
      ctx.fill();
      drawStarShape(0, 0, m[2], m[2] * 0.45, 5, G.menuT * 0.3, '#fff3b0', 'rgba(245,159,0,.7)');
      ctx.restore();
    }
  }

  // -------------------------------------------------------
  // Scenes
  // -------------------------------------------------------
  function drawMenuScene() {
    const sky = skyAt(150 + Math.sin(G.menuT * 0.08) * 50);
    drawSky(sky);
    drawSunMoon(sky);
    drawStars(sky);
    drawBgBalloons();
    drawClouds(sky);
    drawMenuDecor(sky);

    const p = menuBalloonPos();
    drawBalloon(p.x, p.y, p.scale, SKINS[G.skin], {
      tilt: Math.sin(G.menuT * 0.9) * 0.04,
      thrust: false,
      time: G.menuT,
    });

    drawParticles();
    drawTexts();
  }

  function drawGameScene() {
    const sky = skyAt(G.peakAlt);

    ctx.save();
    if (G.shake > 0.2) {
      ctx.translate(rand(-1, 1) * G.shake, rand(-1, 1) * G.shake);
    }
    drawSky(sky);
    drawSunMoon(sky);
    drawStars(sky);
    drawBgBalloons();
    drawClouds(sky);
    drawLaunchScene();
    drawSkyIslands(G.time);
    drawItems();
    drawTornadoes();
    drawBirds();
    drawPlayer();
    drawParticles();
    drawTexts();
    drawBanner();
    drawHint();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (G.mode === 'menu') drawMenuScene();
    else if (G.mode === 'won') drawWinScene();
    else drawGameScene();
  }

  // -------------------------------------------------------
  // Main loop
  // -------------------------------------------------------
  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;

    if (G.mode === 'playing') updatePlaying(dt);
    else if (G.mode === 'dying') updateDying(dt);
    else if (G.mode === 'menu') updateMenu(dt);
    else if (G.mode === 'won') updateWon(dt);

    draw();
    updateHUD(false);
    requestAnimationFrame(frame);
  }

  // -------------------------------------------------------
  // Wiring UI
  // -------------------------------------------------------
  buildSkinPicker();
  updateSoundButtons();
  renderHearts(false);
  updateHUD(true);

  $('btnPlay').addEventListener('click', () => {
    AudioKit.resume();
    AudioKit.click();
    AudioKit.swoosh();
    startGame();
  });

  $('btnHelp').addEventListener('click', () => {
    AudioKit.resume();
    AudioKit.click();
    hideOverlay(screenStart);
    showOverlay(screenHelp);
  });

  $('btnHelpClose').addEventListener('click', () => {
    AudioKit.click();
    hideOverlay(screenHelp);
    showOverlay(screenStart);
  });

  $('btnPause').addEventListener('click', () => {
    AudioKit.click();
    pauseGame();
  });

  $('btnResume').addEventListener('click', () => {
    AudioKit.click();
    resumeGame();
  });

  $('btnPauseMenu').addEventListener('click', () => {
    AudioKit.click();
    goHome();
  });

  $('btnReplay').addEventListener('click', () => {
    AudioKit.resume();
    AudioKit.click();
    startGame();
  });

  $('btnHome').addEventListener('click', () => {
    AudioKit.click();
    goHome();
  });

  $('btnWinReplay').addEventListener('click', () => {
    AudioKit.resume();
    AudioKit.click();
    startGame();
  });

  $('btnWinHome').addEventListener('click', () => {
    AudioKit.click();
    goHome();
  });

  function toggleSound() {
    AudioKit.resume();
    const next = !AudioKit.on;
    AudioKit.setOn(next);
    saveSound(next);
    updateSoundButtons();
    if (next) {
      AudioKit.click();
      if (G.burning) AudioKit.startBurner();
    }
  }

  btnSound.addEventListener('click', toggleSound);
  btnSoundMenu.addEventListener('click', toggleSound);

  // Mulai render
  requestAnimationFrame(frame);

  // Alat bantu pengujian (hanya dengan ?debug)
  if (new URLSearchParams(location.search).has('debug')) {
    window.__balloon = {
      G,
      startGame,
      endGame,
      winGame,
      spawnItem,
      spawnBird,
      spawnTornado,
      collectItem,
      hitBird,
      resetGame,
    };
  }
})();
