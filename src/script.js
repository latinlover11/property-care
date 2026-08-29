// ===== Customer Reviews (approved, rendered from /api/reviews) =====
(function loadApprovedReviews() {
  const grid = document.getElementById('customer-reviews');
  if (!grid) return;

  fetch('/api/reviews')
    .then(res => res.json())
    .then(data => {
      const reviews = (data && data.reviews) || [];
      if (!reviews.length) return;

      reviews.forEach(r => {
        const card = document.createElement('article');
        card.className = 'testimonial-card';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'flex-start';

        const stars = document.createElement('div');
        stars.className = 'testimonial-stars';
        stars.style.display = 'flex';
        stars.style.gap = '0.2rem';
        for (let i = 0; i < 5; i++) {
          const star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          star.setAttribute('viewBox', '0 0 24 24');
          star.setAttribute('class', 'icon');
          star.style.opacity = i < (r.rating || 0) ? '1' : '0.25';
          star.innerHTML = '<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>';
          stars.appendChild(star);
        }
        card.appendChild(stars);

        const text = document.createElement('p');
        text.textContent = r.text;
        card.appendChild(text);

        const author = document.createElement('div');
        author.className = 'testimonial-author';
        author.textContent = '— ' + r.name + (r.service ? `, ${r.service}` : '');
        card.appendChild(author);

        grid.appendChild(card);
      });

      const section = document.getElementById('reviews');
      if (section) section.style.display = '';

      updateReviewStructuredData(reviews);
    })
    .catch(() => {});
})();

function updateReviewStructuredData(reviews) {
  if (!reviews.length) return;
  const rated = reviews.filter(r => r.rating);
  if (!rated.length) return;
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  let localBusiness = null;
  scripts.forEach(s => {
    try {
      const obj = JSON.parse(s.textContent);
      if (obj['@type'] === 'LocalBusiness') localBusiness = obj;
    } catch {}
  });
  if (!localBusiness) return;

  const ratingValue = (rated.reduce((sum, r) => sum + r.rating, 0) / rated.length).toFixed(1);
  localBusiness.aggregateRating = {
    '@type': 'AggregateRating',
    ratingValue: String(ratingValue),
    reviewCount: rated.length
  };

  scripts.forEach(s => {
    try {
      const obj = JSON.parse(s.textContent);
      if (obj['@type'] === 'LocalBusiness') {
        s.textContent = JSON.stringify(localBusiness);
      }
    } catch {}
  });
}

// ===== AOS Scroll Animations =====
if (typeof AOS !== 'undefined') {
  AOS.init({
    duration: 800,
    offset: 100,
    once: true,
    easing: 'ease-out-cubic'
  });
}

// ===== Improved Before/After Slider Logic =====
const portfolioComparisons = document.querySelectorAll('.portfolio-comparison');
if (portfolioComparisons.length > 0) {
  let activeComparison = null;

  portfolioComparisons.forEach((comparison) => {
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
      comparison.setAttribute('aria-valuenow', String(Math.round(percentage)));
    }

    // Set initial state
    afterImg.style.clipPath = 'inset(0 0 0 50%)';
    handle.style.left = '50%';

    // Keyboard support (accessibility)
    comparison.setAttribute('tabindex', '0');
    comparison.setAttribute('role', 'slider');
    comparison.setAttribute('aria-label', 'Compare before and after — use arrow keys to adjust');
    comparison.setAttribute('aria-valuemin', '0');
    comparison.setAttribute('aria-valuemax', '100');
    comparison.setAttribute('aria-valuenow', '50');

    comparison.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      const current = parseFloat(handle.style.left) || 50;
      let next;
      if (e.key === 'ArrowLeft') next = current - 5;
      else if (e.key === 'ArrowRight') next = current + 5;
      else if (e.key === 'Home') next = 0;
      else next = 100;
      next = Math.max(0, Math.min(100, next));
      afterImg.style.clipPath = `inset(0 0 0 ${next}%)`;
      handle.style.left = next + '%';
      if (hint) hint.style.opacity = '0';
      comparison.setAttribute('aria-valuenow', String(Math.round(next)));
    });

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
}

// ===== Hamburger Menu Toggle =====
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');
if (hamburger && navMenu) {
  const navLinks = navMenu.querySelectorAll('.nav-link, .dropdown-menu a');

  hamburger.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('active');
    hamburger.classList.toggle('active', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  const dropdowns = document.querySelectorAll('.dropdown');
  dropdowns.forEach(dropdown => {
    const trigger = dropdown.querySelector('.dropdown-trigger');
    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = dropdown.classList.toggle('active');
        trigger.setAttribute('aria-expanded', String(isOpen));

        // Close other dropdowns
        dropdowns.forEach(other => {
          if (other !== dropdown) other.classList.remove('active');
          const otherTrigger = other.querySelector('.dropdown-trigger');
          if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
        });
      });
    }
  });

  document.addEventListener('click', (e) => {
    // Close dropdowns when clicking outside
    if (!e.target.closest('.dropdown')) {
      dropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
        const trigger = dropdown.querySelector('.dropdown-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      });
    }
    // Close mobile menu when clicking outside
    if (!e.target.closest('.nav') && navMenu.classList.contains('active')) {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
}

// ===== Back to Top Button =====
const backToTopBtn = document.querySelector('.back-to-top');
if (backToTopBtn) {
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
}

// ===== FAQ Toggle =====
const faqTriggers = document.querySelectorAll('.faq-trigger');
if (faqTriggers.length > 0) {
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
}

// ===== Turnstile =====
function resetTurnstile(form) {
  const widget = form && form.querySelector('.cf-turnstile');
  if (!widget || !window.turnstile) return;
  const key = form.getAttribute('id') || form.name || widget.dataset.action;
  const id = (window.__turnstileWidgets || {})[key];
  if (id) window.turnstile.reset(id);
}

// ===== Estimate Form: prefill from URL / sessionStorage (like Nick's) =====
const estimateForm = document.querySelector('[data-contact-form]');
if (estimateForm) {
  const params = new URLSearchParams(location.search);
  const serviceSelect = estimateForm.querySelector('[data-service-select]');
  if (serviceSelect) {
    const slugMap = {
      'lawn-mowing-care': 'Lawn Mowing & Care',
      'fence-installation': 'Fence Installation',
      'property-cleanups': 'Property Cleanups',
      'hardscaping': 'Hardscaping',
      'exterior-care': 'Exterior Care',
      'custom-carpentry': 'Custom Carpentry',
      'handyman-repairs': 'Handyman Repairs',
      'interior-handyman': 'Interior Handyman'
    };
    const slug = params.get('service');
    if (slug && slugMap[slug]) {
      serviceSelect.value = slugMap[slug];
    }
  }
  const estimateField = estimateForm.querySelector('[data-estimate-field]');
  const estimateInput = estimateForm.querySelector('[data-estimate-input]');
  const estimate = params.get('estimate') || sessionStorage.getItem('estimateChoice');
  if (estimate && estimateField && estimateInput) {
    estimateField.hidden = false;
    estimateInput.value = estimate;
  }
}

// ===== Form Validation & Submission =====
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    contactForm.querySelectorAll('.form-status-msg').forEach(el => el.remove());
    const btn = contactForm.querySelector('.btn-primary');
    const origText = btn ? btn.textContent : '';
    const formNote = contactForm.querySelector('[data-form-note]');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending your request…'; }
    if (formNote) formNote.textContent = 'Sending your request…';

    const formData = new FormData(contactForm);
    fetch('submit-form', {
      method: 'POST',
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData).toString()
    })
    .then((res) => {
      if (!res.ok) throw new Error(res.statusText);
      if (res.redirected) {
        window.location.href = '/success';
        return;
      }
      window.location.href = '/success';
    })
    .catch(() => {
      if (btn) { btn.disabled = false; btn.textContent = origText; }
      resetTurnstile(contactForm);
      const formMessage = document.createElement('p');
      formMessage.className = 'form-status-msg';
      formMessage.style.color = '#e53e3e';
      formMessage.style.marginTop = '0.75rem';
      formMessage.textContent = 'Form submission failed. Please try again.';
      contactForm.appendChild(formMessage);
    });
  });
}

// ===== Newsletter Subscription (supports multiple forms) =====
function bindNewsletterForm(newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (newsletterForm.parentNode) {
      newsletterForm.parentNode.querySelectorAll('.form-status-msg').forEach(el => el.remove());
    }
    const consentBox = newsletterForm.querySelector('input[name="consent"]');
    if (consentBox && !consentBox.checked) {
      const formMessage = document.createElement('p');
      formMessage.className = 'form-status-msg';
      formMessage.style.color = '#e53e3e';
      formMessage.style.marginTop = '0.75rem';
      formMessage.textContent = 'Please agree to receive updates before subscribing.';
      newsletterForm.parentNode.insertBefore(formMessage, newsletterForm.nextSibling);
      return;
    }
    const formData = new FormData(newsletterForm);
    const btn = newsletterForm.querySelector('.btn-primary');
    const origText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

    fetch('submit-form', {
      method: 'POST',
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData).toString()
    })
    .then(async (res) => {
      if (!res.ok) {
        let msg = 'Subscription failed. Please try again.';
        try { const data = await res.json(); if (data && data.error) msg = data.error; } catch {}
        throw new Error(msg);
      }
      if (btn) { btn.disabled = false; btn.textContent = origText; }
      const formMessage = document.createElement('p');
      formMessage.className = 'form-status-msg';
      formMessage.style.color = '#38a169';
      formMessage.style.marginTop = '0.75rem';
      formMessage.textContent = '✓ Thanks for subscribing! Check your email for confirmation.';
      newsletterForm.parentNode.insertBefore(formMessage, newsletterForm.nextSibling);
      newsletterForm.reset();
      resetTurnstile(newsletterForm);
    })
    .catch((err) => {
      if (btn) { btn.disabled = false; btn.textContent = origText; }
      resetTurnstile(newsletterForm);
      const formMessage = document.createElement('p');
      formMessage.className = 'form-status-msg';
      formMessage.style.color = '#e53e3e';
      formMessage.style.marginTop = '0.75rem';
      formMessage.textContent = err.message || 'Subscription failed. Please try again.';
      newsletterForm.parentNode.insertBefore(formMessage, newsletterForm.nextSibling);
    });
  });
}
document.querySelectorAll('.newsletter-form').forEach(bindNewsletterForm);

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

// ===== Lightbox =====
const lightbox = document.getElementById('lightbox');
if (lightbox) {
  const lightboxBefore = lightbox.querySelector('.comparison-img-before img');
  const lightboxAfter = lightbox.querySelector('.comparison-img-after img');
  const lightboxCaption = lightbox.querySelector('.lightbox-caption');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  const prevBtn = lightbox.querySelector('.lightbox-arrow--prev');
  const nextBtn = lightbox.querySelector('.lightbox-arrow--next');
  let currentIndex = 0;
  let projects = [];

  function buildProjectsList() {
    projects = [];
    document.querySelectorAll('.expand-btn').forEach(btn => {
      const item = btn.closest('.portfolio-item');
      const title = item ? item.querySelector('h3')?.textContent || '' : '';
      projects.push({
        before: btn.getAttribute('data-before'),
        after: btn.getAttribute('data-after'),
        title: title
      });
    });
  }

  function openLightbox(index) {
    buildProjectsList();
    if (!projects.length) return;
    currentIndex = (index + projects.length) % projects.length;
    const project = projects[currentIndex];
    if (lightboxBefore) {
      lightboxBefore.src = project.before;
      lightboxBefore.alt = 'Before: ' + project.title;
    }
    if (lightboxAfter) {
      lightboxAfter.src = project.after;
      lightboxAfter.alt = 'After: ' + project.title;
    }
    if (lightboxCaption) lightboxCaption.textContent = project.title;
    lightbox.classList.add('open');
  }

  document.querySelectorAll('.expand-btn').forEach((btn, i) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openLightbox(i);
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => lightbox.classList.remove('open'));
  }
  if (prevBtn) {
    prevBtn.addEventListener('click', () => openLightbox(currentIndex - 1));
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => openLightbox(currentIndex + 1));
  }

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.classList.remove('open');
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') lightbox.classList.remove('open');
    if (e.key === 'ArrowLeft') openLightbox(currentIndex - 1);
    if (e.key === 'ArrowRight') openLightbox(currentIndex + 1);
  });
}

// ===== Random Hero Image =====
const heroBg = document.querySelector('.hero-bg');
if (heroBg) {
  const images = [
    'images/walkwayafter.webp',
    'images/stairsafter.webp',
    'images/wallafter.webp',
    'images/after/green-house-after.webp',
    'images/after/lawn-after.webp',
    'images/after/yellow-house-after.webp'
  ];
  const randomImage = images[Math.floor(Math.random() * images.length)];
  heroBg.style.backgroundImage = `url('${randomImage}')`;
}

// ===== Homepage Portfolio Slideshow =====
(function () {
  const container = document.querySelector('.portfolio-slideshow .slideshow-container');
  if (!container) return;
  const slides = Array.from(container.querySelectorAll('.slide'));
  if (!slides.length) return;
  let idx = 0;

  function show(i) {
    idx = (i + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle('active', k === idx));
  }
  function step(n) { show(idx + n); }

  document.querySelectorAll('.portfolio-slideshow .prev').forEach(b => b.addEventListener('click', () => step(-1)));
  document.querySelectorAll('.portfolio-slideshow .next').forEach(b => b.addEventListener('click', () => step(1)));

  show(0);
  setInterval(() => step(1), 5000);
})();

// ===== Case Study Slideshow =====
(function () {
  const root = document.querySelector('.cs-slideshow');
  if (!root) return;
  const slides = Array.from(root.querySelectorAll('.slide'));
  const total = slides.length;
  if (!total) return;
  const counter = root.querySelector('.cs-slideshow-counter');
  const dotsWrap = root.querySelector('.cs-slideshow-dots');
  const prevBtn = root.querySelector('.prev');
  const nextBtn = root.querySelector('.next');
  let index = 0;
  let timer = null;
  const DELAY = 5000;

  const dots = slides.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cs-slideshow-dot';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', 'Go to photo ' + (i + 1));
    b.addEventListener('click', () => { show(i); restart(); });
    dotsWrap.appendChild(b);
    return b;
  });

  function show(i) {
    index = (i + total) % total;
    slides.forEach((s, k) => { s.style.display = k === index ? 'block' : 'none'; });
    dots.forEach((d, k) => d.classList.toggle('is-active', k === index));
    if (counter) counter.textContent = (index + 1) + ' / ' + total;
  }
  function step(n) { show(index + n); restart(); }
  function restart() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => show(index + 1), DELAY);
  }

  prevBtn.addEventListener('click', () => step(-1));
  nextBtn.addEventListener('click', () => step(1));

  // Pause auto-advance on hover
  root.addEventListener('mouseenter', () => { if (timer) clearInterval(timer); });
  root.addEventListener('mouseleave', restart);

  // Keyboard navigation
  root.setAttribute('tabindex', '0');
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  });

  // Touch swipe
  let startX = null;
  root.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
    startX = null;
  });

  show(0);
  restart();
})();

// ===== Portfolio Sort by Date (newest first by default) =====
(function () {
  const grid = document.querySelector('.portfolio-grid');
  if (!grid) return;

  function sortPortfolio(order) {
    const items = Array.from(grid.querySelectorAll('.portfolio-item'));
    items.sort((a, b) => {
      const da = a.dataset.date || '2000-01-01';
      const db = b.dataset.date || '2000-01-01';
      return order === 'newest' ? db.localeCompare(da) : da.localeCompare(db);
    });
    items.forEach((it) => grid.appendChild(it));
  }

  const sortSelect = document.getElementById('portfolioSort');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => sortPortfolio(sortSelect.value));
  }
  sortPortfolio((sortSelect && sortSelect.value) || 'newest');
})();

// ===== Portfolio Filter with Stagger =====
const portfolioGrid = document.querySelector('.portfolio-grid');
const filterBtns = document.querySelectorAll('.filter-btn');
const portfolioItems = document.querySelectorAll('.portfolio-item');
const filterCount = document.querySelector('.filter-count');
const filterEmpty = document.querySelector('.filter-empty');

function updateFilterCount(filter) {
  if (!filterCount) return;
  const total = portfolioItems.length;
  const visible = filter === 'all' ? total : [...portfolioItems].filter(item => item.dataset.service === filter).length;
  filterCount.textContent = `Showing ${visible} of ${total} projects`;
  if (filterEmpty) {
    filterEmpty.classList.toggle('visible', visible === 0);
  }
}

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;

    if (portfolioGrid) portfolioGrid.classList.add('is-filtering');

    portfolioItems.forEach((item, i) => {
      const match = filter === 'all' || item.dataset.service === filter;
      item.style.transitionDelay = match ? `${i * 60}ms` : '0ms';

      if (match) {
        item.style.display = '';
        item.classList.remove('filter-hidden');
      } else {
        item.classList.add('filter-hidden');
        setTimeout(() => {
          item.style.display = 'none';
        }, 350);
      }
    });

    setTimeout(() => {
      if (portfolioGrid) portfolioGrid.classList.remove('is-filtering');
    }, 600);

    updateFilterCount(filter);
  });
});

updateFilterCount('all');

// ===== Stats Count-Up =====
const statsSection = document.querySelector('.stats-strip');
const statNumbers = statsSection ? statsSection.querySelectorAll('.stat-num') : [];
if (statNumbers.length > 0) {
  let counted = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !counted) {
        counted = true;
        statNumbers.forEach(stat => {
          const text = stat.textContent;
          const target = parseInt(text.replace(/[^0-9]/g, '')) || 0;
          const hasPlus = text.includes('+');

          if (target === 0) return;

          let current = 0;
          const step = Math.max(1, Math.floor(target / 40));
          const timer = setInterval(() => {
            current += step;
            if (current >= target) {
              current = target;
              clearInterval(timer);
            }
            stat.textContent = (hasPlus ? '+' : '') + current;
          }, 30);
        });
        observer.disconnect();
      }
    });
  }, { threshold: 0.5 });

  const statsSection = document.querySelector('.stats-strip');
  if (statsSection) observer.observe(statsSection);
}

// ===== Review Form =====
const reviewForm = document.getElementById('reviewForm');
if (reviewForm) {
  reviewForm.addEventListener('submit', (e) => {
    e.preventDefault();
    reviewForm.querySelectorAll('.review-status-msg').forEach(el => el.remove());
    const btn = reviewForm.querySelector('.btn-primary');
    const origText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

    const formData = new FormData(reviewForm);
    fetch('submit-form', {
      method: 'POST',
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData).toString()
    })
    .then((res) => {
      if (!res.ok) throw new Error(res.statusText);
      if (btn) { btn.disabled = false; btn.textContent = origText; }
      const successMsg = document.createElement('p');
      successMsg.className = 'review-status-msg';
      successMsg.style.color = '#2e7d32';
      successMsg.style.marginTop = '0.9rem';
      successMsg.style.fontWeight = '600';
      successMsg.textContent = '✓ Thank you! Your review has been received.';
      reviewForm.appendChild(successMsg);
      reviewForm.reset();
      resetTurnstile(reviewForm);
    })
    .catch(() => {
      if (btn) { btn.disabled = false; btn.textContent = origText; }
      resetTurnstile(reviewForm);
      const errorMsg = document.createElement('p');
      errorMsg.className = 'review-status-msg';
      errorMsg.style.color = '#e53e3e';
      errorMsg.style.marginTop = '0.9rem';
      errorMsg.textContent = 'Could not submit your review. Please try again.';
      reviewForm.appendChild(errorMsg);
    });
  });
}

