// ===== AOS Scroll Animations =====
AOS.init({
  duration: 800,
  offset: 100,
  once: true,
  easing: 'ease-out-cubic'
});

// ===== Improved Before/After Slider Logic =====
let activeComparison = null;

document.querySelectorAll('.portfolio-comparison').forEach((comparison) => {
  const afterImg = comparison.querySelector('.comparison-img-after');
  const handle = comparison.querySelector('.comparison-slider-handle');
  const hint = comparison.querySelector('.comparison-hint');

  function setPosition(clientX) {
    const rect = comparison.getBoundingClientRect();
    // Calculate percentage relative to the container
    let percentage = ((clientX - rect.left) / rect.width) * 100;
    percentage = Math.max(0, Math.min(100, percentage));
    
    afterImg.style.clipPath = `inset(0 0 0 ${percentage}%)`;
    handle.style.left = percentage + '%';
    if (hint) hint.style.opacity = '0';
  }

  // Set initial state
  afterImg.style.clipPath = 'inset(0 0 0 50%)';
  handle.style.left = '50%';

  // Use pointer events for unified mouse/touch handling
  comparison.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.expand-btn')) return; // let expand button handle its own click
    activeComparison = comparison;
    setPosition(e.clientX);
    comparison.setPointerCapture(e.pointerId);
  });

  comparison.addEventListener('pointermove', (e) => {
    if (activeComparison === comparison) setPosition(e.clientX);
  });

  comparison.addEventListener('pointerup', () => {
    activeComparison = null;
  });
});

// ===== Hamburger Menu Toggle =====
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');
const navLinks = navMenu.querySelectorAll('.nav-link, .dropdown');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('active');
  navMenu.classList.toggle('active');
});

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
  });
});

const dropdowns = document.querySelectorAll('.dropdown');
dropdowns.forEach(dropdown => {
  const trigger = dropdown.querySelector('.dropdown-trigger');
  trigger.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      e.preventDefault();
      dropdown.classList.toggle('active');
    }
  });
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav') && navMenu.classList.contains('active')) {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
  }
});

// ===== Back to Top Button =====
const backToTopBtn = document.createElement('button');
backToTopBtn.className = 'back-to-top';
backToTopBtn.innerHTML = '↑';
backToTopBtn.setAttribute('aria-label', 'Back to top');
document.body.appendChild(backToTopBtn);

window.addEventListener('scroll', () => {
  if (window.pageYOffset > 300) {
    backToTopBtn.classList.add('show');
  } else {
    backToTopBtn.classList.remove('show');
  }
});

backToTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== FAQ Toggle =====
const faqTriggers = document.querySelectorAll('.faq-trigger');
faqTriggers.forEach(trigger => {
  trigger.addEventListener('click', () => {
    const faqItem = trigger.closest('.faq-item');
    const isActive = faqItem.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(item => {
      item.classList.remove('active');
      item.querySelector('.faq-trigger').setAttribute('aria-expanded', 'false');
    });
    if (!isActive) {
      faqItem.classList.add('active');
      trigger.setAttribute('aria-expanded', 'true');
    }
  });
});

// ===== Form Validation & Submission =====
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Stop the default browser redirect
    const formData = new FormData(contactForm);
    
    fetch('/', {
      method: 'POST',
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData).toString()
    })
    .then(() => alert('Thank you! Your message has been sent.'))
    .catch((error) => alert('Form submission failed. Please try again.'));
  });
}

// ===== Newsletter Subscription =====
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = newsletterForm.querySelector('input[type="email"]').value;
    if (email) {
      alert('✓ Thanks for subscribing! Check your email for confirmation.');
      newsletterForm.reset();
    }
  });
}

// ===== Smooth Scroll for Anchor Links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href !== '#') {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ===== Updated Lightbox Logic =====
const lightbox = document.getElementById('lightbox');
if (lightbox) {
  const lightboxImg = lightbox.querySelector('.lightbox-content');
  const lbBefore = document.getElementById('lbBefore');
  const lbAfter = document.getElementById('lbAfter');
  let currentBefore = '';
  let currentAfter = '';

  document.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Stop the click from bubbling up to any parent handlers
      e.stopPropagation();
      e.preventDefault(); 
      
      currentBefore = btn.dataset.before;
      currentAfter = btn.dataset.after;
      
      // Default to "After" image as in your original logic
      lightboxImg.src = currentAfter;
      
      // Update UI state
      if (lbAfter) lbAfter.classList.add('active');
      if (lbBefore) lbBefore.classList.remove('active');
      
      // Explicitly set display to flex
      lightbox.style.display = 'flex';
    });
  });

  // Close the lightbox via the × button, clicking the backdrop, or Escape
  const closeBtn = lightbox.querySelector('.close-lightbox');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      lightbox.style.display = 'none';
    });
  }
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.style.display = 'none';
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.style.display === 'flex') {
      lightbox.style.display = 'none';
    }
  });

  // Toggle between the Before / After image inside the lightbox
  if (lbBefore) {
    lbBefore.addEventListener('click', () => {
      lightboxImg.src = currentBefore;
      lbBefore.classList.add('active');
      if (lbAfter) lbAfter.classList.remove('active');
    });
  }
  if (lbAfter) {
    lbAfter.addEventListener('click', () => {
      lightboxImg.src = currentAfter;
      lbAfter.classList.add('active');
      if (lbBefore) lbBefore.classList.remove('active');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const expandBtns = document.querySelectorAll('.expand-btn');
  const lightbox = document.getElementById('lightbox');
  const closeBtn = document.querySelector('.close-lightbox');
  
  // Select images inside the lightbox
  const lightboxBefore = lightbox.querySelector('.comparison-img-before img');
  const lightboxAfter = lightbox.querySelector('.comparison-img-after img');

  expandBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Get data from the clicked button
      const beforeSrc = btn.getAttribute('data-before');
      const afterSrc = btn.getAttribute('data-after');

      // Update lightbox image sources
      lightboxBefore.src = beforeSrc;
      lightboxAfter.src = afterSrc;

      // Show the lightbox
      lightbox.style.display = 'flex'; // Or 'block', depending on your CSS
    });
  });

  // Close lightbox
  closeBtn.addEventListener('click', () => {
    lightbox.style.display = 'none';
  });

  // Close if clicking outside the content (optional)
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      lightbox.style.display = 'none';
    }
  });
});