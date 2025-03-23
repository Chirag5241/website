/**
 * Enhanced Star Animation
 * Replaces the static background with dynamic canvas-based star animation
 */
class StarAnimation {
  constructor(options = {}) {
    // Configuration
    this.options = {
      selector: options.selector || '#stars-canvas',
      starCount: options.starCount || 150,
      starColor: options.starColor || '#FFFFFF',
      starSize: options.starSize || { min: 1, max: 3 },
      starSpeed: options.starSpeed || { min: 0.1, max: 0.5 },
      backgroundColor: options.backgroundColor || '#131313',
      twinkleFrequency: options.twinkleFrequency || 0.05,
      responsive: options.responsive !== false
    };

    // Initialize
    this.canvas = null;
    this.ctx = null;
    this.stars = [];
    this.animationFrame = null;
    this.init();
  }

  init() {
    // Create canvas if it doesn't exist
    if (!document.querySelector(this.options.selector)) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = this.options.selector.substring(1);
      document.querySelector('.hero').prepend(this.canvas);
    } else {
      this.canvas = document.querySelector(this.options.selector);
    }

    // Set canvas styles
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '0';

    // Get context
    this.ctx = this.canvas.getContext('2d');

    // Set canvas size
    this.resizeCanvas();

    // Create stars
    this.createStars();

    // Start animation
    this.animate();

    // Add event listeners
    if (this.options.responsive) {
      window.addEventListener('resize', () => this.resizeCanvas());
    }
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    this.canvas.width = parent.offsetWidth;
    this.canvas.height = parent.offsetHeight;
    
    // Recreate stars when canvas is resized
    if (this.stars.length > 0) {
      this.createStars();
    }
  }

  createStars() {
    this.stars = [];
    
    for (let i = 0; i < this.options.starCount; i++) {
      const type = Math.random() > 0.5 ? 'forward' : 'backward';
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: this.randomBetween(this.options.starSize.min, this.options.starSize.max),
        speed: this.randomBetween(this.options.starSpeed.min, this.options.starSpeed.max),
        brightness: Math.random(),
        brightnessDelta: Math.random() * 0.08 - 0.04,
        type,
      });
    }
  }

  randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  hexToRGBA(hex, alpha) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  drawStars() {
    // Clear canvas
    this.ctx.fillStyle = this.options.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw stars
    this.stars.forEach(star => {
      // Update star position

      // Move stars in two different directions
      if (star.type === 'forward') {
        star.x += star.speed;
        star.y -= 0.01;
      } else if (star.type === 'backward') {
        star.x -= star.speed;
        star.y += 0.01;
      }

      if (star.x > this.canvas.width) {
        star.x = 0;
        star.y = Math.random() * this.canvas.height;
      }
      if (star.x < 0) star.x = this.canvas.width;

      // Twinkle effect
      if (Math.random() < this.options.twinkleFrequency) {
        star.brightnessDelta = -star.brightnessDelta;
      }
      
      star.brightness += star.brightnessDelta;
      if (star.brightness > 1 || star.brightness < 0.3) {
        star.brightnessDelta = -star.brightnessDelta;
      }

      // Draw star
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      const starColor = this.options.starColor;
      this.ctx.fillStyle = this.hexToRGBA(starColor, star.brightness);
      // this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      this.ctx.fill();
    });
  }

  animate() {
    this.drawStars();
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
}

// Initialize star animation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const starAnimation = new StarAnimation({
    selector: '#stars-canvas',
    starCount: window.innerWidth > 768 ? 400 : 200,
    backgroundColor: '#131313',
    starSize: { min: 0.5, max: 2 },
    starSpeed: { min: 0.1, max: 0.2 },
    twinkleFrequency: 0.5
  });
});
