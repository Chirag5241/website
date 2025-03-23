/**
 * Theme toggle functionality
 * Allows switching between dark and light modes
 */

// Initialize theme toggle functionality
const initThemeToggle = () => {
  const themeToggle = document.getElementById('theme-toggle');
  const rootElement = document.documentElement;
  
  // Check for saved theme preference or use default (dark mode)
  const savedTheme = localStorage.getItem('theme');
  
  // Apply saved theme if it exists
  if (savedTheme === 'light') {
    rootElement.classList.add('light-mode');
    themeToggle.checked = true;
  }
  
  // Toggle theme when switch is clicked
  themeToggle.addEventListener('change', () => {
    if (themeToggle.checked) {
      // Switch to light mode
      rootElement.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      // Switch to dark mode
      rootElement.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
  });
};

// Add theme toggle initialization to DOMContentLoaded event
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
});
