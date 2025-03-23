/**
 * Navbar scroll behavior
 * Collapses the navbar when scrolling down and shows it when scrolling up
 */

document.addEventListener('DOMContentLoaded', function() {
  const navbar = document.querySelector('.navbar');
  let lastScrollTop = 0;
  let isCollapsed = false;
  
  window.addEventListener('scroll', function() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Determine scroll direction
    if (scrollTop > lastScrollTop && scrollTop > 100) {
      // Scrolling down and not at the top
      if (!isCollapsed) {
        navbar.style.transform = 'translateY(-80px)';
        navbar.style.transition = 'transform 0.3s ease-in-out';
        isCollapsed = true;
      }
    } else {
      // Scrolling up or at the top
      if (isCollapsed) {
        navbar.style.transform = 'translateY(0)';
        navbar.style.transition = 'transform 0.3s ease-in-out';
        isCollapsed = false;
      }
    }
    
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // For Mobile or negative scrolling
  });
  
  // Highlight the current section in the navbar
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.navbar__links');
  
  window.addEventListener('scroll', function() {
    let current = '';
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (pageYOffset >= (sectionTop - sectionHeight / 3)) {
        current = section.getAttribute('id');
      }
    });
    
    navLinks.forEach(link => {
      link.classList.remove('highlight');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('highlight');
      }
    });
  });
});
