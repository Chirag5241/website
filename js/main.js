/**
 * Main JavaScript file for website functionality
 * Modernized with ES6+ syntax and improved organization
 */

// Mobile menu functionality
const initMobileMenu = () => {
  const menu = document.querySelector("#mobile-menu");
  const menuLinks = document.querySelector(".navbar__menu");
  
  if (!menu || !menuLinks) return;
  
  const toggleMobileMenu = () => {
    menu.classList.toggle("is-active");
    menuLinks.classList.toggle("active");
  };
  
  menu.addEventListener("click", toggleMobileMenu);
  
  // Close mobile menu when clicking on a link
  const hideMobileMenu = () => {
    if (window.innerWidth <= 768 && menu.classList.contains("is-active")) {
      menu.classList.toggle("is-active");
      menuLinks.classList.remove("active");
    }
  };
  
  menuLinks.addEventListener("click", hideMobileMenu);
};

// Navigation highlight functionality
const initNavHighlight = () => {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = {
    home: document.querySelector("#home-page"),
    about: document.querySelector("#about-page"),
    research: document.querySelector("#research-page")
  };
  
  if (!sections.length || !Object.values(navLinks).some(link => link)) return;
  
  const highlightNavigation = () => {
    const scrollPosition = window.scrollY;
    
    // Remove all highlights first
    Object.values(navLinks).forEach(link => {
      if (link) link.classList.remove("highlight");
    });
    
    // Only apply highlights if window is wide enough
    if (window.innerWidth <= 960) return;
    
    // Find current section and highlight corresponding nav item
    if (scrollPosition < 140 && navLinks.home) {
      navLinks.home.classList.add("highlight");
    } else if (scrollPosition < 600 && navLinks.about) {
      navLinks.about.classList.add("highlight");
    } else if (scrollPosition < 1500 && navLinks.research) {
      navLinks.research.classList.add("highlight");
    }
  };
  
  window.addEventListener("scroll", highlightNavigation);
  window.addEventListener("click", highlightNavigation);
  
  // Initial highlight
  highlightNavigation();
};

// Smooth scrolling for anchor links
const initSmoothScroll = () => {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  
  anchorLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (!targetElement) return;
      
      e.preventDefault();
      
      window.scrollTo({
        top: targetElement.offsetTop - 80, // Adjust for navbar height
        behavior: 'smooth'
      });
    });
  });
};

// Animation for elements when they come into view
const initScrollAnimations = () => {
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  
  if (!animatedElements.length) return;
  
  const checkIfInView = () => {
    const windowHeight = window.innerHeight;
    const windowTopPosition = window.scrollY;
    const windowBottomPosition = windowTopPosition + windowHeight;
    
    animatedElements.forEach(element => {
      const elementHeight = element.offsetHeight;
      const elementTopPosition = element.offsetTop;
      const elementBottomPosition = elementTopPosition + elementHeight;
      
      // Check if element is in viewport
      if (
        elementBottomPosition >= windowTopPosition && 
        elementTopPosition <= windowBottomPosition
      ) {
        element.classList.add('in-view');
      }
    });
  };
  
  window.addEventListener('scroll', checkIfInView);
  
  // Initial check
  checkIfInView();
};

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initNavHighlight();
  initSmoothScroll();
  initScrollAnimations();
});
