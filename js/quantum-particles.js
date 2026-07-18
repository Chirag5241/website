/**
 * Quantum particle animation — inspired by the quantum-mechanics visuals
 * in Oppenheimer (2023): slow-churning clouds of glowing embers orbiting
 * invisible nuclei, shimmering dust, and rare cascading spark bursts.
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
      light: {
        core: '#ffffff',
        colors: ['#e4dcff', '#b4a4f0', '#9678e0', '#7a5cd0'],
        intensity: 0.65
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
  }

  populate() {
    const mobile = this.w < 768;
    const rand = (a, b) => a + Math.random() * (b - a);

    // Wandering nuclei the ember clouds orbit around
    const nucleusCount = mobile ? 3 : 4;
    this.nuclei = [];
    for (let i = 0; i < nucleusCount; i++) {
      this.nuclei.push({
        x: this.w * ((i + 0.5) / nucleusCount) + rand(-90, 90),
        y: rand(this.h * 0.15, this.h * 0.85),
        vx: 0,
        vy: 0
      });
    }

    // Orbital ember particles
    const orbitalCount = mobile ? 70 : 140;
    this.orbitals = [];
    for (let i = 0; i < orbitalCount; i++) {
      this.orbitals.push({
        n: i % nucleusCount,
        angle: rand(0, Math.PI * 2),
        angSpeed: rand(0.002, 0.011) * (Math.random() < 0.5 ? -1 : 1),
        baseR: rand(24, mobile ? 160 : 270),
        rAmp: rand(4, 26),
        rPhase: rand(0, Math.PI * 2),
        rSpeed: rand(0.004, 0.012),
        tilt: rand(0.45, 1),
        size: rand(1.2, 3.4),
        colorIdx: (Math.random() * 4) | 0,
        pulse: rand(0, Math.PI * 2),
        pulseSpeed: rand(0.008, 0.03),
        alpha: rand(0.35, 0.85),
        px: 0,
        py: 0
      });
    }

    // Free-floating dust for depth
    const dustCount = mobile ? 32 : 64;
    this.dust = [];
    for (let i = 0; i < dustCount; i++) {
      this.dust.push({
        x: rand(0, this.w),
        y: rand(0, this.h),
        vx: rand(-0.12, 0.12),
        vy: rand(-0.08, 0.08),
        size: rand(0.6, 1.6),
        colorIdx: (Math.random() * 4) | 0,
        pulse: rand(0, Math.PI * 2),
        pulseSpeed: rand(0.005, 0.02),
        alpha: rand(0.12, 0.35)
      });
    }

    this.sparks = [];
    this.flashes = [];
    // First burst arrives early, then every 8–15s
    this.nextBurst = performance.now() + rand(2500, 4000);
  }

  /* ---------- simulation ---------- */

  burst() {
    const rand = (a, b) => a + Math.random() * (b - a);
    const n = this.nuclei[(Math.random() * this.nuclei.length) | 0];
    const count = 24 + ((Math.random() * 16) | 0);
    for (let i = 0; i < count; i++) {
      const ang = rand(0, Math.PI * 2);
      const speed = rand(0.8, 3.6);
      this.sparks.push({
        x: n.x,
        y: n.y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed * 0.75,
        life: rand(60, 130),
        maxLife: 130,
        size: rand(0.8, 2.2),
        colorIdx: (Math.random() * 4) | 0
      });
    }
    this.flashes.push({ x: n.x, y: n.y, life: 34, maxLife: 34, colorIdx: 1 });
  }

  step(now) {
    this.frame++;

    // Nuclei wander slowly, softly bouncing off the band edges
    for (const n of this.nuclei) {
      n.vx += (Math.random() - 0.5) * 0.006;
      n.vy += (Math.random() - 0.5) * 0.004;
      n.vx *= 0.99;
      n.vy *= 0.99;
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < this.w * 0.05 || n.x > this.w * 0.95) n.vx *= -1;
      if (n.y < this.h * 0.1 || n.y > this.h * 0.9) n.vy *= -1;
    }

    for (const p of this.orbitals) {
      const n = this.nuclei[p.n];
      p.px = n.x + Math.cos(p.angle) * (p.baseR + Math.sin(p.rPhase) * p.rAmp);
      p.py = n.y + Math.sin(p.angle) * (p.baseR + Math.sin(p.rPhase) * p.rAmp) * p.tilt;
      p.angle += p.angSpeed;
      p.rPhase += p.rSpeed;
      p.pulse += p.pulseSpeed;
    }

    for (const d of this.dust) {
      d.x += d.vx;
      d.y += d.vy;
      d.pulse += d.pulseSpeed;
      if (d.x < -10) d.x = this.w + 10;
      if (d.x > this.w + 10) d.x = -10;
      if (d.y < -10) d.y = this.h + 10;
      if (d.y > this.h + 10) d.y = -10;
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.965;
      s.vy *= 0.965;
      s.vy += 0.004; // faint gravity, like falling embers
      s.life--;
      if (s.life <= 0) this.sparks.splice(i, 1);
    }

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      if (--this.flashes[i].life <= 0) this.flashes.splice(i, 1);
    }

    if (now && now > this.nextBurst) {
      this.burst();
      this.nextBurst = now + 8000 + Math.random() * 7000;
    }
  }

  /* ---------- drawing ---------- */

  render() {
    const theme = document.documentElement.classList.contains('light-mode') ? 'light' : 'dark';
    const palette = this.palettes[theme];
    const sprites = this.sprites[theme];
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    // Orbital embers with a short motion streak along the orbit
    for (const p of this.orbitals) {
      const shimmer = 0.6 + 0.4 * Math.sin(p.pulse);
      const a = p.alpha * shimmer * palette.intensity;
      const r = p.baseR + Math.sin(p.rPhase) * p.rAmp;
      const speed = Math.abs(p.angSpeed) * r;

      if (speed > 0.25) {
        const tx = -Math.sin(p.angle) * Math.sign(p.angSpeed);
        const ty = Math.cos(p.angle) * Math.sign(p.angSpeed) * p.tilt;
        const len = Math.min(speed * 9, 16);
        ctx.strokeStyle = this.rgba(palette.colors[p.colorIdx], a * 0.35);
        ctx.lineWidth = p.size * 0.7;
        ctx.beginPath();
        ctx.moveTo(p.px - tx * len, p.py - ty * len);
        ctx.lineTo(p.px, p.py);
        ctx.stroke();
      }

      const s = p.size * (2.6 + shimmer);
      ctx.globalAlpha = a;
      ctx.drawImage(sprites[p.colorIdx], p.px - s * 2, p.py - s * 2, s * 4, s * 4);
    }

    // Dust motes
    for (const d of this.dust) {
      const a = d.alpha * (0.55 + 0.45 * Math.sin(d.pulse)) * palette.intensity;
      const s = d.size * 3;
      ctx.globalAlpha = a;
      ctx.drawImage(sprites[d.colorIdx], d.x - s * 2, d.y - s * 2, s * 4, s * 4);
    }

    // Burst sparks with velocity streaks
    for (const s of this.sparks) {
      const t = s.life / s.maxLife;
      const a = Math.min(1, t * 1.6) * palette.intensity;
      ctx.strokeStyle = this.rgba(palette.colors[s.colorIdx], a * 0.5);
      ctx.lineWidth = s.size * 0.8;
      ctx.beginPath();
      ctx.moveTo(s.x - s.vx * 5, s.y - s.vy * 5);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
      const sz = s.size * 3;
      ctx.globalAlpha = a;
      ctx.drawImage(sprites[s.colorIdx], s.x - sz * 2, s.y - sz * 2, sz * 4, sz * 4);
    }

    // Core flash at burst origin
    for (const f of this.flashes) {
      const t = f.life / f.maxLife;
      const sz = (1 - t * 0.4) * 60;
      ctx.globalAlpha = t * t * 0.85 * palette.intensity;
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
