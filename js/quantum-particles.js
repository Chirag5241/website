/**
 * Nuclear chain-reaction field — a pseudo-3D volume of neutrons streaking
 * horizontally through space while the camera flies (mostly) straight forward,
 * so the particles rush past the viewer. When two neutrons collide they undergo
 * fission: both are consumed, a flash + spark burst fires, and smaller fragment
 * neutrons are ejected — sustaining a chain reaction that sits somewhere between
 * a steady simmer and an aggressive cascade.
 *
 * Dark mode: warm embers (white-hot cores -> amber -> deep red).
 * Light mode: cool quantum shimmer (white / pale teal / deep teal).
 *
 * The canvas stays transparent so the watercolor backdrop shows through.
 */

class QuantumField {
  constructor(selector) {
    this.canvas = document.querySelector(selector);
    if (!this.canvas) return;
    this.host = this.canvas.parentElement;
    this.ctx = this.canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.running = false;
    this.frame = 0;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Canvas sits above the backdrop image + scrim, below the content
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '2';
    this.canvas.style.pointerEvents = 'none';

    this.palettes = {
      dark: {
        core: '#fff7e6',
        colors: ['#ffb347', '#f0a030', '#e06010', '#c03000'],
        intensity: 1
      },
      // Cherenkov radiation — the electric blue glow of a reactor pool:
      // near-white core falling off through vivid blue to a violet-blue edge.
      light: {
        core: '#a9d6ff',
        colors: ['#7ab8ff', '#3d93ff', '#1f6fe8', '#2b4fd4'],
        intensity: 0.85
      }
    };
    this.sprites = { dark: [], light: [] };
    this.buildSprites();

    this.resize();
    this.populate();

    window.addEventListener('resize', () => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => {
        this.resize();
        this.populate();
        if (this.reducedMotion) this.render();
      }, 150);
    });

    if (this.reducedMotion) {
      // Accessibility: a single static frame, no animation loop
      this.step(0);
      this.render();
      return;
    }

    // Pause the loop while the hero is off screen
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? this.start() : this.stop()));
    });
    io.observe(this.host);
    this.start();
  }

  /* ---------- setup ---------- */

  hexToRgb(hex) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16)
    ];
  }

  rgba(hex, a) {
    const [r, g, b] = this.hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  makeSprite(coreHex, colorHex) {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, this.rgba(coreHex, 1));
    grad.addColorStop(0.15, this.rgba(colorHex, 0.9));
    grad.addColorStop(0.45, this.rgba(colorHex, 0.28));
    grad.addColorStop(1, this.rgba(colorHex, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
  }

  buildSprites() {
    for (const theme of ['dark', 'light']) {
      const p = this.palettes[theme];
      this.sprites[theme] = p.colors.map((col) => this.makeSprite(p.core, col));
    }
  }

  resize() {
    this.w = this.host.offsetWidth;
    this.h = this.host.offsetHeight;
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // Focal length: larger = narrower field of view. Scale with width so the
    // apparent FOV stays consistent across screen sizes.
    this.f = Math.max(this.w, 480) * 0.5;
  }

  /* ---------- helpers ---------- */

  clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  // World half-extents of the view frustum at a given depth (world units).
  frustumHalf(depth) {
    return { hx: (this.w / 2) * depth / this.f, hy: (this.h / 2) * depth / this.f };
  }

  /* ---------- population ---------- */

  populate() {
    const mobile = this.w < 768;

    // Virtual camera flying (mostly) straight forward through the field.
    this.cam = { x: 0, y: 0, z: 0 };

    this.cfg = {
      count: mobile ? 70 : 150,
      minParticles: mobile ? 70 : 150,
      maxParticles: mobile ? 300 : 1000, // cap lower on phones to keep the reaction smooth

      // Depth planes (world units ahead of the camera)
      near: 46,
      far: 1450,
      nearFade: 70, // short fog-in so neutrons rush right up to the "face" before vanishing
      farFade: 420, // fog-out distance before the far plane
      backBright: 0.3, // brightness multiplier at the far plane (0 = black in back, 1 = no dimming)
      foreBright: 1.2, // brightness multiplier at the near plane (>1 = extra bright up front)

      // Camera: steady forward march + a gentle horizontal sway. The downward
      // motion is applied per-particle (see downSpeed) instead of as a flat
      // camera descent, so its strength can fall off with depth.
      forwardSpeed: 2.5,
      driftAmpX: 1,
      driftFreqX: 0.0055,

      // Descent: how fast a foreground neutron drifts down (world units/frame).
      // Scaled by depth on a logarithmic curve — ~0 in the far background,
      // rising to the full value up close. downCurve shapes the falloff
      // (higher = the effect stays near 0 deeper into the background).
      downSpeed: 5,
      downCurve: 60,

      // Neutron motion (world units / frame) — primarily horizontal
      speedMin: 0.3,
      speedMax: 2,

      // Neutron world radius (mass proxy)
      rMin: 2.2,
      rMax: 5.4,
      minR: 1.0, // fragments smaller than this respawn as fresh light neutrons

      // Screen-space size guarantee: a neutron's drawn radius never exceeds this
      maxPx: mobile ? 5 : 6.5,

      // Motion streaks follow each neutron's real on-screen path, so near /
      // off-centre particles (which sweep fastest) streak the most.
      streakScale: 2.4,
      maxStreak: 46,

      // Fission / chain reaction
      collisionRadius: 22,
      cell: 44, // spatial-grid cell size (~2 * collisionRadius)
      childShrink: 0.7,
      childCooldown: 12, // frames a fresh fragment is collision-immune (so it can fly clear)
      sparkCount: 0, // transient throwaway sparks per fission (0 = none, just the fragments)
      // Probability a collision actually fissions (ejects new neutrons) rather
      // than being a non-productive absorption. Set to the U-235 thermal-neutron
      // fission probability: 1/(1+alpha) with capture/fission ratio alpha ~= 0.169.
      fissionProbability: 0.855,
      // Neutrons released per fission — U-235 thermal multiplicity distribution
      // (Terrell). P(k) for k = 0..6 neutrons; mean nu ~= 2.43.
      neutronMultiplicity: [0.033, 0.174, 0.335, 0.303, 0.123, 0.028, 0.004],
      // Keep-alive: if no fission has happened in this window, force one so the
      // reaction never fully dies. Lower = more aggressive.
      keepAliveMs: 2000
    };

    this.particles = [];
    for (let i = 0; i < this.cfg.count; i++) {
      this.particles.push(this.makeParticle(false));
    }

    this.sparks = [];
    this.flashes = [];
    this.lastFission = 0;
  }

  makeParticle(atFar) {
    const rand = (a, b) => a + Math.random() * (b - a);
    const cfg = this.cfg;
    const cam = this.cam;
    // atFar: born in a thin band at the far plane (the normal case — every
    // neutron originates in the background and is pulled forward). Otherwise
    // spread across all depths, used only for the one-time initial seed so the
    // field isn't empty on load.
    const depth = atFar
      ? rand(cfg.far * 0.92, cfg.far)
      : rand(cfg.near + cfg.nearFade, cfg.far);
    const { hx, hy } = this.frustumHalf(depth);
    const dir = Math.random() < 0.5 ? -1 : 1;
    const sp = rand(cfg.speedMin, cfg.speedMax);
    return {
      // Spawn strictly inside the visible frustum (no off-screen overscan)
      x: cam.x + rand(-hx, hx),
      y: cam.y + rand(-hy, hy),
      z: cam.z + depth,
      vx: dir * sp, // moving left or right
      vy: rand(-0.12, 0.12) * sp,
      vz: rand(-0.05, 0.05) * sp,
      r: rand(cfg.rMin, cfg.rMax),
      colorIdx: (Math.random() * 4) | 0,
      pulse: rand(0, Math.PI * 2),
      pulseSpeed: rand(0.01, 0.03),
      alpha: rand(0.5, 0.95),
      cooldown: 0,
      psx: null, // previous on-screen position (for path-accurate streaks)
      psy: 0,
      alive: true
    };
  }

  // Reset an existing particle back onto the far plane (recycling for an
  // endless field without churning the array).
  respawnFar(p) {
    const rand = (a, b) => a + Math.random() * (b - a);
    const cfg = this.cfg;
    const cam = this.cam;
    const depth = rand(cfg.far * 0.92, cfg.far);
    const { hx, hy } = this.frustumHalf(depth);
    const dir = Math.random() < 0.5 ? -1 : 1;
    const sp = rand(cfg.speedMin, cfg.speedMax);
    // Spawn strictly inside the visible frustum (no off-screen overscan)
    p.x = cam.x + rand(-hx, hx);
    p.y = cam.y + rand(-hy, hy);
    p.z = cam.z + depth;
    p.vx = dir * sp;
    p.vy = rand(-0.12, 0.12) * sp;
    p.vz = rand(-0.05, 0.05) * sp;
    p.r = rand(cfg.rMin, cfg.rMax);
    p.colorIdx = (Math.random() * 4) | 0;
    p.alpha = rand(0.5, 0.95);
    p.cooldown = 0;
    p.psx = null;
    p.alive = true;
  }

  // A fission fragment: smaller, and carrying the colliders' momentum (bvx/bvy/
  // bvz) so it keeps streaking across the screen instead of scattering randomly.
  // A modest explosion "kick" is layered on top for spread.
  makeFragment(x, y, z, r, bvx, bvy, bvz) {
    const rand = (a, b) => a + Math.random() * (b - a);
    const cfg = this.cfg;
    const ang = rand(0, Math.PI * 2);
    const kick = rand(cfg.speedMin, cfg.speedMax) * 0.6;
    return {
      x,
      y,
      z,
      vx: bvx + Math.cos(ang) * kick,
      vy: bvy + Math.sin(ang) * kick * 0.5,
      vz: bvz + rand(-0.15, 0.15) * kick,
      r,
      colorIdx: (Math.random() * 4) | 0,
      pulse: rand(0, Math.PI * 2),
      pulseSpeed: rand(0.012, 0.032),
      alpha: rand(0.65, 1),
      cooldown: cfg.childCooldown,
      psx: null,
      psy: 0,
      alive: true
    };
  }

  /* ---------- simulation ---------- */

  step(now) {
    this.frame++;
    const cfg = this.cfg;
    const cam = this.cam;

    // Camera: constant forward march + a subtle sideways sway. The downward
    // flow is applied per-particle below (depth-weighted), not to the camera.
    cam.z += cfg.forwardSpeed;
    cam.x = cfg.driftAmpX * Math.sin(this.frame * cfg.driftFreqX);

    // Advance neutrons + recycle any that pass the camera or leave the frustum
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      p.pulse += p.pulseSpeed;
      if (p.cooldown > 0) p.cooldown--;

      const depth = p.z - cam.z;
      if (depth < cfg.near || depth > cfg.far * 1.05) {
        this.respawnFar(p);
        continue;
      }
      // Depth-weighted descent: ~0 in the far background, rising to the full
      // downSpeed in the foreground along a logarithmic falloff with depth.
      const dt = this.clamp((depth - cfg.near) / (cfg.far - cfg.near), 0, 1);
      const downK = 1 - Math.log1p(cfg.downCurve * dt) / Math.log1p(cfg.downCurve);
      p.y += cfg.downSpeed * downK;

      const { hx, hy } = this.frustumHalf(depth);
      // Anything pulled off the sides or dragged off the bottom by the descent
      // is recycled to the far plane, so every neutron again originates in the
      // background and is drawn forward.
      if (Math.abs(p.x - cam.x) > hx * 1.9 || Math.abs(p.y - cam.y) > hy * 1.7) {
        this.respawnFar(p);
      }
    }

    this.detectCollisions();

    // Keep the chain reaction alive if it has gone quiet
    if (now && now - this.lastFission > cfg.keepAliveMs) {
      this.forceFission();
      this.lastFission = now;
    }

    // Advance 2D explosion sparks (screen space)
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.965;
      s.vy *= 0.965;
      s.vy += 0.006;
      s.life--;
      if (s.life <= 0) this.sparks.splice(i, 1);
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      if (--this.flashes[i].life <= 0) this.flashes.splice(i, 1);
    }

    // Refill toward the target population if fly-offs outpaced fissions
    while (this.particles.length < cfg.minParticles) {
      this.particles.push(this.makeParticle(true));
    }
  }

  detectCollisions() {
    const cfg = this.cfg;
    const cell = cfg.cell;
    const parts = this.particles;
    const grid = new Map();
    const key = (a, b, c) => a + ',' + b + ',' + c;

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.cooldown > 0) continue; // fresh fragments don't collide yet
      const k = key(
        Math.floor(p.x / cell),
        Math.floor(p.y / cell),
        Math.floor(p.z / cell)
      );
      let arr = grid.get(k);
      if (!arr) grid.set(k, (arr = []));
      arr.push(i);
    }

    const r2 = cfg.collisionRadius * cfg.collisionRadius;
    const pairs = [];
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (!p.alive || p.cooldown > 0) continue;
      const cx = Math.floor(p.x / cell);
      const cy = Math.floor(p.y / cell);
      const cz = Math.floor(p.z / cell);
      let hit = false;
      for (let dx = -1; dx <= 1 && !hit; dx++) {
        for (let dy = -1; dy <= 1 && !hit; dy++) {
          for (let dz = -1; dz <= 1 && !hit; dz++) {
            const arr = grid.get(key(cx + dx, cy + dy, cz + dz));
            if (!arr) continue;
            for (const j of arr) {
              if (j <= i) continue;
              const q = parts[j];
              if (!q.alive) continue;
              const ddx = p.x - q.x;
              const ddy = p.y - q.y;
              const ddz = p.z - q.z;
              if (ddx * ddx + ddy * ddy + ddz * ddz < r2) {
                p.alive = false;
                q.alive = false;
                pairs.push([p, q]);
                hit = true;
                break;
              }
            }
          }
        }
      }
    }

    if (!pairs.length) return;
    for (const [p, q] of pairs) this.fission(p, q);
    this.particles = this.particles.filter((p) => p.alive);
    this.lastFission = performance.now();
  }

  // Sample how many neutrons a fission releases, from the configured
  // multiplicity distribution (defaults to U-235 thermal, mean nu ~= 2.43).
  sampleNeutronYield() {
    const dist = this.cfg.neutronMultiplicity;
    let r = Math.random();
    for (let k = 0; k < dist.length; k++) {
      r -= dist[k];
      if (r < 0) return k;
    }
    return dist.length - 1;
  }

  // Consume two neutrons; emit a flash + spark burst and smaller fragments.
  fission(p, q) {
    const cfg = this.cfg;
    const cam = this.cam;
    const x = (p.x + q.x) / 2;
    const y = (p.y + q.y) / 2;
    const z = (p.z + q.z) / 2;
    const depth = z - cam.z;
    if (depth < cfg.near) return; // behind the camera; skip visuals

    const scale = this.f / depth;
    const sx = this.w / 2 + (x - cam.x) * scale;
    const sy = this.h / 2 + (y - cam.y) * scale;
    const vis = this.clamp(scale, 0.3, 1.3); // depth-scaled explosion size
    const colorIdx = Math.random() < 0.5 ? p.colorIdx : q.colorIdx;
    this.spawnBurst(sx, sy, vis, colorIdx);

    // Not every collision fissions — some are non-productive absorptions that
    // eject no new neutrons (the two colliders are still consumed either way).
    if (Math.random() >= cfg.fissionProbability) return;

    // Conserve the colliders' momentum (mass-weighted) so fragments keep
    // travelling across the screen along the original direction of motion.
    const mt = p.r + q.r;
    const bvx = (p.vx * p.r + q.vx * q.r) / mt;
    const bvy = (p.vy * p.r + q.vy * q.r) / mt;
    const bvz = (p.vz * p.r + q.vz * q.r) / mt;

    // Eject fragment neutrons — count drawn from the U-235 multiplicity
    // distribution (mean nu ~= 2.43) — to carry the chain forward
    if (this.particles.length >= cfg.maxParticles) return;
    const childR = Math.max(p.r, q.r) * cfg.childShrink;
    const n = this.sampleNeutronYield();
    const r = childR > cfg.minR ? childR : this.cfg.rMin;
    for (let i = 0; i < n; i++) {
      if (this.particles.length >= cfg.maxParticles) break;
      this.particles.push(this.makeFragment(x, y, z, r, bvx, bvy, bvz));
    }
  }

  // Force a fission near the densest available point so the reaction persists.
  forceFission() {
    const parts = this.particles;
    const eligible = parts.filter((p) => p.alive && p.cooldown <= 0);
    if (eligible.length < 2) return;
    const p = eligible[(Math.random() * eligible.length) | 0];
    let best = null;
    let bestD = Infinity;
    for (const q of eligible) {
      if (q === p) continue;
      const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = q;
      }
    }
    if (!best) return;
    p.alive = false;
    best.alive = false;
    this.fission(p, best);
    this.particles = this.particles.filter((x) => x.alive);
  }

  spawnBurst(sx, sy, vis, colorIdx) {
    const rand = (a, b) => a + Math.random() * (b - a);
    const count = this.cfg.sparkCount;
    for (let i = 0; i < count; i++) {
      const ang = rand(0, Math.PI * 2);
      const speed = rand(0.6, 2.2) * vis;
      this.sparks.push({
        x: sx,
        y: sy,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed * 0.85,
        life: rand(32, 72),
        maxLife: 72,
        size: rand(0.5, 1.4),
        colorIdx: (Math.random() * 4) | 0
      });
    }
    this.flashes.push({ x: sx, y: sy, life: 22, maxLife: 22, colorIdx, vis });
  }

  /* ---------- drawing ---------- */

  render() {
    const theme = document.documentElement.classList.contains('light-mode') ? 'light' : 'dark';
    const palette = this.palettes[theme];
    const sprites = this.sprites[theme];
    const ctx = this.ctx;
    const cfg = this.cfg;
    const cam = this.cam;

    ctx.clearRect(0, 0, this.w, this.h);
    // Additive blending makes embers bloom against the dark backdrop, but on a
    // pale backdrop it just washes toward white — so light mode paints normally
    // and lets the saturated Cherenkov blue read against the watercolor.
    ctx.globalCompositeOperation = theme === 'light' ? 'source-over' : 'lighter';
    ctx.lineCap = 'round';

    // Neutrons: perspective-projected, depth-faded, size-clamped
    for (const p of this.particles) {
      const depth = p.z - cam.z;
      if (depth < cfg.near || depth > cfg.far) { p.psx = null; continue; }
      const scale = this.f / depth;
      const sx = this.w / 2 + (p.x - cam.x) * scale;
      const sy = this.h / 2 + (p.y - cam.y) * scale;
      if (sx < -40 || sx > this.w + 40 || sy < -40 || sy > this.h + 40) { p.psx = null; continue; }

      const fadeNear = this.clamp((depth - cfg.near) / cfg.nearFade, 0, 1);
      const fadeFar = this.clamp((cfg.far - depth) / cfg.farFade, 0, 1);
      // Depth brightness: dark in the far background, brighter toward the front
      // (foreBright can exceed 1 to make close neutrons pop; alpha is clamped).
      const dt = this.clamp((depth - cfg.near) / (cfg.far - cfg.near), 0, 1);
      const depthBright = cfg.backBright + (cfg.foreBright - cfg.backBright) * (1 - dt);
      const shimmer = 0.6 + 0.4 * Math.sin(p.pulse);
      const a = Math.min(p.alpha * shimmer * fadeNear * fadeFar * depthBright * palette.intensity, 1);
      if (a <= 0.01) { p.psx = sx; p.psy = sy; continue; }

      const drawR = Math.min(p.r * scale, cfg.maxPx);

      // Streak along the neutron's real on-screen path (camera forward + descent
      // + drift + own motion). Under perspective, particles that are close or
      // off-centre travel farther per frame, so they streak the most — the
      // non-linear, curving rush the eye reads as fast forward-and-down motion.
      if (p.psx !== null) {
        const dxp = sx - p.psx;
        const dyp = sy - p.psy;
        const dist = Math.hypot(dxp, dyp);
        if (dist > 0.5) {
          const len = Math.min(dist * cfg.streakScale, cfg.maxStreak);
          const ux = dxp / dist;
          const uy = dyp / dist;
          ctx.strokeStyle = this.rgba(palette.colors[p.colorIdx], a * 0.5);
          ctx.lineWidth = drawR * 0.9;
          ctx.beginPath();
          ctx.moveTo(sx - ux * len, sy - uy * len);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = a;
      ctx.drawImage(sprites[p.colorIdx], sx - drawR * 2, sy - drawR * 2, drawR * 4, drawR * 4);
      p.psx = sx;
      p.psy = sy;
    }

    // Fission sparks (screen space) with velocity streaks
    for (const s of this.sparks) {
      const t = s.life / s.maxLife;
      const a = Math.min(1, t * 1.6) * palette.intensity;
      ctx.strokeStyle = this.rgba(palette.colors[s.colorIdx], a * 0.5);
      ctx.lineWidth = s.size * 0.8;
      ctx.beginPath();
      ctx.moveTo(s.x - s.vx * 5, s.y - s.vy * 5);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
      const sz = Math.min(s.size * 3, 6);
      ctx.globalAlpha = a;
      ctx.drawImage(sprites[s.colorIdx], s.x - sz * 2, s.y - sz * 2, sz * 4, sz * 4);
    }

    // Core flash at each fission origin
    for (const f of this.flashes) {
      const t = f.life / f.maxLife;
      const sz = Math.min((1 - t * 0.4) * 30 * (f.vis || 1), 48);
      ctx.globalAlpha = t * t * 0.6 * palette.intensity;
      ctx.drawImage(sprites[f.colorIdx], f.x - sz, f.y - sz, sz * 2, sz * 2);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- loop ---------- */

  start() {
    if (this.running) return;
    this.running = true;
    const loop = (now) => {
      if (!this.running) return;
      this.step(now);
      this.render();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.__quantumField = new QuantumField('#stars-canvas');
});
