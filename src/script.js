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
}

// ===== Hamburger Menu Toggle =====
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');
if (hamburger && navMenu) {
  const navLinks = navMenu.querySelectorAll('.nav-link, .dropdown-menu a');

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
    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropdown.classList.toggle('active');
        
        // Close other dropdowns
        dropdowns.forEach(other => {
          if (other !== dropdown) other.classList.remove('active');
        });
      });
    }
  });

  document.addEventListener('click', (e) => {
    // Close dropdowns when clicking outside
    if (!e.target.closest('.dropdown')) {
      dropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
    // Close mobile menu when clicking outside
    if (!e.target.closest('.nav') && navMenu.classList.contains('active')) {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
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

// ===== Form Validation & Submission =====
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('.btn-primary');
    const origText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

    const formData = new FormData(contactForm);
    fetch('/', {
      method: 'POST',
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData).toString()
    })
    .then(() => {
      window.location.href = 'success.html';
    })
    .catch(() => {
      if (btn) { btn.disabled = false; btn.textContent = origText; }
      const formMessage = document.createElement('p');
      formMessage.textContent = 'Form submission failed. Please try again.';
      contactForm.appendChild(formMessage);
    });
  });
}

// ===== Newsletter Subscription =====
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(newsletterForm);
    const btn = newsletterForm.querySelector('.btn-primary');
    const origText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

    fetch('/', {
      method: 'POST',
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData).toString()
    })
    .then(() => {
      if (btn) { btn.disabled = false; btn.textContent = origText; }
      const formMessage = document.createElement('p');
      formMessage.textContent = '✓ Thanks for subscribing! Check your email for confirmation.';
      newsletterForm.parentNode.insertBefore(formMessage, newsletterForm.nextSibling);
      newsletterForm.reset();
    })
    .catch(() => {
      if (btn) { btn.disabled = false; btn.textContent = origText; }
      const formMessage = document.createElement('p');
      formMessage.textContent = 'Subscription failed. Please try again.';
      newsletterForm.parentNode.insertBefore(formMessage, newsletterForm.nextSibling);
    });
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
    if (lightboxBefore) lightboxBefore.src = project.before;
    if (lightboxAfter) lightboxAfter.src = project.after;
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

// ===== Portfolio Slideshow =====
let slideIndex = 1;
showSlides(slideIndex);

function plusSlides(n) {
  showSlides(slideIndex += n);
}

function showSlides(n) {
  let i;
  let slides = document.getElementsByClassName("slide");
  if (slides.length > 0) {
    if (n > slides.length) {slideIndex = 1}    
    if (n < 1) {slideIndex = slides.length}
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";  
    }
    slides[slideIndex-1].style.display = "block";
  }
}

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
const statNumbers = document.querySelectorAll('.stat-num');
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

