/* ============================================================
   ХимиЛаб — Главен рутер и управление на изгледи (app.js)
   ============================================================ */

function go(viewId) {
  // Toggle visibility of views
  document.querySelectorAll('.view').forEach(section => {
    section.classList.toggle('active', section.id === viewId);
  });
  
  // Toggle active styling of navigation tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === viewId);
  });

  // Smooth scroll to top of viewport
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Bind navigation tab clicks
document.addEventListener('DOMContentLoaded', () => {
  const tabsContainer = document.getElementById('tabs');
  if (tabsContainer) {
    tabsContainer.addEventListener('click', e => {
      const tabButton = e.target.closest('.tab');
      if (tabButton) {
        go(tabButton.dataset.view);
      }
    });
  }
});
