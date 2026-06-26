// ===== AOS Scroll Animations =====
AOS.init({ duration: 800, offset: 100, once: true, easing: 'ease-out-cubic' });

// ===== Improved Before/After Slider Logic =====
let activeComparison = null;

function initSlider(comparison) {
  const afterImg = comparison.querySelector('.comparison-img-after');
  const handle = comparison.querySelector('.comparison-slider-handle');
  const hint = comparison.querySelector('.comparison-hint');

  function setPosition(clientX) {
    const rect = comparison.getBoundingClientRect();
    let percentage = ((clientX - rect.left) / rect.width) * 100;
    percentage = Math.max(0, Math.min(100, percentage));
    afterImg.style.clipPath = `inset(0 0 0 ${percentage}%)`;
    if (handle) handle.style.left = percentage + '%';
    if (hint) hint.style.opacity = '0';
  }

  afterImg.style.clipPath = 'inset(0 0 0 50%)';
  if (handle) handle.style.left = '50%';

  comparison.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.expand-btn')) return;
    activeComparison = comparison;
    setPosition(e.clientX);
    comparison.setPointerCapture(e.pointerId);
  });

  comparison.addEventListener('pointermove', (e) => {
    if (activeComparison === comparison) setPosition(e.clientX);
  });

  comparison.addEventListener('pointerup', () => activeComparison = null);
}

document.querySelectorAll('.portfolio-comparison').forEach(initSlider);

// ===== Global Click Handler (Consolidated) =====
document.addEventListener('click', (e) => {
    // 1. Expand Button
const btn = e.target.closest('.expand-btn');
if (btn) {
    e.stopPropagation();
    e.preventDefault();
    
    const lightbox = document.getElementById('lightbox');
    const beforeImg = lightbox.querySelector('.comparison-img-before');
    const afterImg = lightbox.querySelector('.comparison-img-after');
    const comparisonWrap = lightbox.querySelector('.portfolio-comparison');

    beforeImg.src = btn.dataset.before;
    afterImg.src = btn.dataset.after;

    lightbox.style.display = 'flex';
    
    // Initialize the slider for the lightbox only if it hasn't been yet
    if (!comparisonWrap.dataset.initialized) {
        initSlider(comparisonWrap);
        comparisonWrap.dataset.initialized = "true";
    }
    return;
}

    // 2. Close Lightbox
    if (e.target.matches('.close-lightbox') || e.target.id === 'lightbox') {
        document.getElementById('lightbox').style.display = 'none';
    }

    // 3. Hamburger/Nav Close
    const navMenu = document.getElementById('navMenu');
    if (!e.target.closest('.nav') && navMenu?.classList.contains('active')) {
        document.getElementById('hamburger').classList.remove('active');
        navMenu.classList.remove('active');
    }
});

// ===== Hamburger & Dropdown Logic =====
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

hamburger?.addEventListener('click', () => {
  hamburger.classList.toggle('active');
  navMenu.classList.toggle('active');
});

document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
  trigger.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      e.preventDefault();
      trigger.parentElement.classList.toggle('active');
    }
  });
});

// ===== Back to Top, FAQ, & Forms =====
const backToTopBtn = document.createElement('button');
backToTopBtn.className = 'back-to-top';
backToTopBtn.innerHTML = '↑';
document.body.appendChild(backToTopBtn);
window.addEventListener('scroll', () => backToTopBtn.classList.toggle('show', window.pageYOffset > 300));
backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

document.querySelectorAll('.faq-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const item = trigger.closest('.faq-item');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
  });
});