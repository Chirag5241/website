/**
 * Floating nav behavior
 * The nav strip appears only once the page has scrolled past the bottom of
 * the hero photo, and slides away as soon as the photo is back on screen.
 */

document.addEventListener('DOMContentLoaded', function() {
  const nav = document.getElementById('topnav');
  const photo = document.querySelector('.hero__photo');
  if (!nav || !photo) return;

  function update() {
    // Show when the photo's bottom edge is above the viewport
    const pastPhoto = photo.getBoundingClientRect().bottom < 0;
    nav.classList.toggle('topnav--visible', pastPhoto);
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
});
