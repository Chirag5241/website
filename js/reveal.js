/* Scroll-reveal choreography.
   Section headings get their text wrapped in a clipping mask (so it slides up
   from below the baseline) plus a hand-drawn SVG rule that draws itself in.
   Rows fade and rise, staggered within their own list. */
(function () {
  'use strict';

  /* The mark is a Z scribble drawn in one gesture: a long bar left to right, a
     diagonal back down-left, then a shorter bar to the right again. Its stroke
     tapers at the start and the end, which a uniform SVG stroke cannot do, so
     the ink is three filled ribbons (union'd by the nonzero fill rule) rather
     than a stroked path.

     To animate a filled shape as if it were being drawn, a mask is stroked
     along the gesture's centreline and its dash offset animated: the stroke
     sweeps the mask open in drawing order, revealing the tapered ink beneath. */
  var CENTRELINE =
    'M4 20 C 46 18.5, 150 13.6, 296 9 ' +
    'C 230 18, 120 35.5, 57 44 ' +
    'C 93 46.4, 145 49, 179 51';

  var RIBBONS = [
    // top bar — tapers in from the left, full weight by the time it runs out
    'M4 23.4 C 30 23.6, 48 23.9, 64 23.6 C 124 21.8, 212 18.4, 296 15.2 ' +
      'L296 2.8 C 212 6.4, 124 11, 64 15 C 48 15.6, 30 16.4, 4 16.8 Z',
    // diagonal back — even weight
    'M296 2.8 C 232 11.8, 122 29.4, 57 37.8 L57 50.2 C 122 41.6, 232 24.2, 296 15.2 Z',
    // bottom bar — tapers out to the finishing tip
    'M57 37.8 C 93 40.4, 146 43.6, 179 47.6 C 181.4 48.6, 181.4 51.8, 178.6 52.2 ' +
      'C 146 50.2, 93 49.4, 57 50.2 Z'
  ];

  // Mask ids must be unique per instance or every mark reuses the first one.
  var uid = 0;

  /* The name is set to measure exactly as wide as the nav row beneath it. That
     is a relationship CSS cannot express, so the size is computed: scale the
     current font size by (nav width / name width). Letter-spacing is also in em
     so it scales too, which makes the fit slightly non-linear — hence iterating
     until the residual is under half a pixel rather than scaling once.

     Only applies to the side-by-side layout. Below the stylesheet's breakpoint
     the photo moves above the name and the nav often still fits on one line, so
     a width match there would size the name off that narrow row — 104px on a
     608px screen. Below the breakpoint, and whenever the nav wraps, the inline
     size is cleared and the stylesheet's clamp takes over. */
  var SIDE_BY_SIDE = '(min-width: 641px)'; // keep in step with css/minimal.css
  function fitNameToNav() {
    var name = document.querySelector('.hero__name');
    var text = document.querySelector('.hero__name-text');
    var nav = document.querySelector('.hero__nav');
    if (!name || !text || !nav) return;

    name.style.fontSize = '';
    if (!window.matchMedia(SIDE_BY_SIDE).matches) return;

    var navLine = parseFloat(getComputedStyle(nav.firstElementChild).lineHeight) || 0;
    if (navLine && nav.getBoundingClientRect().height > navLine * 1.6) return;

    var target = nav.getBoundingClientRect().width;
    if (!target) return;

    for (var pass = 0; pass < 6; pass++) {
      var current = text.getBoundingClientRect().width;
      if (!current) return;
      if (Math.abs(current - target) < 0.5) break;
      var size = parseFloat(getComputedStyle(name).fontSize);
      name.style.fontSize = (size * target / current) + 'px';
    }
  }

  function svgEl(name, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function makeSquiggle() {
    var id = 'squiggle-mask-' + (uid++);

    var svg = svgEl('svg', {
      'class': 'squiggle',
      viewBox: '0 0 300 60',
      // Height is set in em by the stylesheet so the mark tracks the type size
      // rather than the heading's length. The vertical squash that implies
      // scales the ink's weight evenly and leaves the taper — a horizontal
      // profile — intact.
      preserveAspectRatio: 'none',
      'aria-hidden': 'true'
    });

    var mask = svgEl('mask', { id: id });
    // Wide enough to clear the ink either side of the centreline, no wider —
    // an over-wide nib bleeds onto the neighbouring pass at the turns.
    mask.appendChild(svgEl('path', {
      'class': 'squiggle__nib',
      d: CENTRELINE,
      fill: 'none',
      stroke: '#fff',
      'stroke-width': '15',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      pathLength: '1'
    }));
    svg.appendChild(mask);

    var ink = svgEl('g', { mask: 'url(#' + id + ')', fill: 'currentColor' });
    RIBBONS.forEach(function (d) {
      ink.appendChild(svgEl('path', { d: d }));
    });
    svg.appendChild(ink);

    return svg;
  }

  // Wrap an element's text in mask > inner so it can slide up from a clip.
  function maskText(el) {
    var text = el.textContent.trim();
    var mask = document.createElement('span');
    mask.className = 'mask';
    var inner = document.createElement('span');
    inner.className = 'mask__inner';
    inner.textContent = text;
    mask.appendChild(inner);
    el.textContent = '';
    el.appendChild(mask);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.fade-in').forEach(function (el) {
      el.classList.add('visible');
    });

    document.querySelectorAll('.section__heading').forEach(function (h) {
      maskText(h);
      h.appendChild(makeSquiggle());
      h.classList.add('reveal');
    });

    // Stagger each row against its own list, not the whole page.
    document.querySelectorAll('.pubs, .jobs, .items').forEach(function (list) {
      list.querySelectorAll('.animate-on-scroll').forEach(function (row, i) {
        row.style.setProperty('--stagger', (i * 0.08) + 's');
      });
    });

    fitNameToNav();
    // Fraunces changes the name's metrics once it swaps in, so measure again.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fitNameToNav);
    }
    window.addEventListener('resize', fitNameToNav);

    var targets = document.querySelectorAll('.animate-on-scroll, .reveal');

    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });

    targets.forEach(function (el) { observer.observe(el); });
  });
})();
