// Property Care — 3-step instant quote wizard
(function () {
  'use strict';

  const wizard = document.getElementById('quote-wizard');
  if (!wizard) return;

  const panels = wizard.querySelectorAll('[data-step]');
  const indicators = wizard.querySelectorAll('[data-step-indicator]');
  const serviceCards = wizard.querySelectorAll('[data-service]');
  const extrasWrap = wizard.querySelector('[data-extras]');
  const extrasContext = wizard.querySelector('[data-extras-context]');
  const sizeInput = wizard.querySelector('[data-field="size"]');
  const unitNote = wizard.querySelector('[data-unit-note]');
  const estimatePrice = wizard.querySelector('[data-estimate-price]');
  const successBanner = wizard.querySelector('[data-banner="success"]');
  const form = wizard.querySelector('[data-submit-form]');

  const EXTRAS_BY_SERVICE = {
    'lawn-mowing-care': [
      ['mulch', 'Mulch'], ['edging', 'Edging & Weeding'], ['fertilizer', 'Fertilizer'], ['cleanup', 'Seasonal Cleanup'],
    ],
    'fence-installation': [
      ['cedar', 'Cedar Upgrade'], ['gate', 'Gate'], ['staining', 'Staining'], ['caps', 'Post Caps'],
    ],
    'property-cleanups': [
      ['debris', 'Debris Hauling'], ['fabric', 'Landscape Fabric'], ['mulch', 'Mulch Refresh'], ['trim', 'Hedge Trimming'],
    ],
    'hardscaping': [
      ['repoint', 'Paving Repairs'], ['wall', 'Retaining Wall'], ['path', 'Walkway Edging'],
    ],
    'exterior-care': [
      ['windows', 'Window Cleaning'], ['powerwash', 'Power Washing'], ['gutters', 'Gutter Cleaning'], ['rot', 'Wood Rot Repair'],
    ],
  };

  const UNIT_BY_SERVICE = {
    'lawn-mowing-care': 'square feet',
    'fence-installation': 'linear feet',
    'property-cleanups': 'square feet',
    'hardscaping': 'square feet',
    'exterior-care': 'square feet',
  };

  const quoteState = {
    step: 1,
    service_type: '',
    size: 0,
    property_type: '',
    extras: [],
    low: 0,
    high: 0,
  };

  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function getTurnstileToken() {
  const el = wizard.querySelector('.cf-turnstile');
  if (window.turnstile && el) {
    const id = (window.__turnstileWidgets || {})['quote-form'];
    try {
      return id ? window.turnstile.getResponse(id) : null;
    } catch {
      return null;
    }
  }
  return null;
}

  function goToStep(step, animate = true) {
    quoteState.step = step;
    panels.forEach((p) => { p.hidden = Number(p.dataset.step) !== step; });
    if (successBanner) successBanner.hidden = true;
    indicators.forEach((ind) => {
      const n = Number(ind.dataset.stepIndicator);
      ind.classList.toggle('is-active', n === step);
      ind.classList.toggle('is-done', n < step);
      const dot = ind.querySelector('[data-dot]');
      if (dot) dot.textContent = n < step ? '✓' : String(n);
    });
    if (animate) wizard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  serviceCards.forEach((card) => {
    card.addEventListener('click', () => {
      serviceCards.forEach((c) => {
        const selected = c === card;
        c.classList.toggle('is-selected', selected);
        c.setAttribute('aria-pressed', String(selected));
      });
      quoteState.service_type = card.dataset.service;
      const unit = UNIT_BY_SERVICE[quoteState.service_type] || 'square feet';
      if (unitNote) unitNote.textContent = unit;
      renderExtras();
      goToStep(2);
    });
  });

  function renderExtras() {
    const labels = EXTRAS_BY_SERVICE[quoteState.service_type] || [];
    extrasContext.textContent = labels.length ? '(optional)' : '';
    extrasWrap.innerHTML = labels
      .map(([id, label]) => `
        <label class="wizard-extra">
          <input type="checkbox" value="${id}" data-extra-item>
          <span>${label}</span>
        </label>`)
      .join('');
    extrasWrap.querySelectorAll('[data-extra-item]').forEach((box) => {
      box.addEventListener('change', () => {
        quoteState.extras = [...extrasWrap.querySelectorAll('[data-extra-item]:checked')].map((b) => b.value);
      });
    });
  }

  function setFieldError(wrapper, message) {
    if (!wrapper) return;
    const input = wrapper.querySelector('input, textarea');
    if (input) input.classList.toggle('field-error', !!message);
    let msg = wrapper.querySelector('.field-error-msg');
    if (!msg) {
      msg = document.createElement('small');
      msg.className = 'field-error-msg';
      msg.style.color = '#ffb3b3';
      msg.style.marginTop = '0.35rem';
      wrapper.appendChild(msg);
    }
    msg.textContent = message || '';
  }

  function validateStep2() {
    let ok = true;
    const sizeNum = Number(sizeInput.value);
    if (!sizeInput.value || !Number.isFinite(sizeNum) || sizeNum < 1) {
      setFieldError(sizeInput.closest('.wizard-field'), 'Please enter a valid size.');
      ok = false;
    } else {
      setFieldError(sizeInput.closest('.wizard-field'), '');
      quoteState.size = Math.round(sizeNum);
    }
    const selectedRadio = wizard.querySelector('input[name="property_type"]:checked');
    const group = wizard.querySelector('.wizard-group');
    if (!selectedRadio) {
      setFieldError(group, 'Please select a property type.');
      ok = false;
    } else {
      setFieldError(group, '');
      quoteState.property_type = selectedRadio.value;
    }
    return ok;
  }

  function validateStep3() {
    let ok = true;
    const required = ['customer_name', 'customer_phone', 'address'];
    required.forEach((field) => {
      const input = wizard.querySelector(`[data-field="${field}"]`);
      const value = input.value.trim();
      const rules = {
        customer_name: (v) => v.length >= 2,
        customer_phone: (v) => v.replace(/\D/g, '').length >= 10,
        address: (v) => v.length >= 5,
      };
      const wrapper = input.closest('.wizard-field');
      if (!rules[field](value)) {
        setFieldError(wrapper, field === 'customer_phone' ? 'Phone needs at least 10 digits.' : field === 'customer_name' ? 'Please enter your full name.' : 'Please enter your address.');
        ok = false;
      } else {
        setFieldError(wrapper, '');
      }
    });
    const emailInput = wizard.querySelector('[data-field="customer_email"]');
    if (emailInput.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailInput.value.trim())) {
      setFieldError(emailInput.closest('.wizard-field'), 'Please enter a valid email address.');
      ok = false;
    }
    return ok;
  }

  async function calculateEstimate() {
    if (!validateStep2()) return;

    const panel = wizard.querySelector('[data-step="2"]');
    const btn = panel.querySelector('[data-calculate]');
    btn.disabled = true;
    btn.textContent = 'Calculating…';

    try {
      const payload = {
        service_type: quoteState.service_type,
        square_footage: quoteState.size,
        property_type: quoteState.property_type,
        extras: quoteState.extras,
      };

      const headers = { 'Content-Type': 'application/json' };
      const token = getTurnstileToken();
      if (token) headers['X-Turnstile'] = token;

      const res = await fetch('/api/quote/calculate', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Request failed');

      quoteState.low = Number(body.low);
      quoteState.high = Number(body.high);
      estimatePrice.textContent = `${currency.format(body.low)} - ${currency.format(body.high)}`;
      try { sessionStorage.setItem('estimateChoice', estimatePrice.textContent); } catch (e) {}
      goToStep(3);
    } catch (err) {
      console.error(err);
      estimatePrice.textContent = '—';
      const el = wizard.querySelector('[data-step="3"]');
      const errMsg = document.createElement('p');
      errMsg.style.color = '#ffb3b3';
      errMsg.textContent = "Couldn't calculate just now — call us at (720) 707-5411.";
      el.insertBefore(errMsg, el.firstChild);
      setTimeout(() => errMsg.remove(), 6000);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Get My Estimate';
    }
  }

  async function submitQuote(e) {
    e.preventDefault();
    if (quoteState.low === 0) {
      alert("Please calculate an estimate first.");
      return;
    }
    if (!validateStep3()) return;

    const btn = wizard.querySelector('[data-submit]');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    const field = (name) => (wizard.querySelector(`[data-field="${name}"]`) || { value: '' }).value.trim();

    const payload = {
      service_type: quoteState.service_type,
      square_footage: quoteState.size,
      property_type: quoteState.property_type,
      extras: quoteState.extras,
      estimated_price_low: quoteState.low,
      estimated_price_high: quoteState.high,
      customer_name: field('customer_name'),
      customer_email: field('customer_email'),
      customer_phone: field('customer_phone'),
      address: field('address'),
      notes: field('notes'),
      subscribe: (wizard.querySelector('[data-field="subscribe"]') || {}).checked ? 'yes' : '',
    };

    try {
      const token = getTurnstileToken();
      const res = await fetch('/api/quote/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Turnstile': token || '' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Request failed');

      panels.forEach((p) => (p.hidden = true));
      indicators.forEach((ind) => ind.classList.add('is-done'));
      successBanner.hidden = false;
      wizard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error(err);
      const note = form.querySelector('.form-note');
      if (note) note.textContent = "Something went wrong — please call us at (720) 707-5411.";
      if (window.turnstile && window.__turnstileWidgets && window.__turnstileWidgets["quote-form"]) {
        window.turnstile.reset(window.__turnstileWidgets["quote-form"]);
      }
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit Quote Request';
    }
  }

  function resetWizard() {
    Object.assign(quoteState, { step: 1, service_type: '', size: 0, property_type: '', extras: [], low: 0, high: 0 });
    serviceCards.forEach((c) => { c.classList.remove('is-selected'); c.setAttribute('aria-pressed', 'false'); });
    sizeInput.value = '';
    wizard.querySelectorAll('input[name="property_type"]').forEach((r) => (r.checked = false));
    if (extrasWrap) extrasWrap.innerHTML = '';
    if (extrasContext) extrasContext.textContent = '';
    if (form) form.reset();
    if (estimatePrice) estimatePrice.textContent = '—';
    if (successBanner) successBanner.hidden = true;
    if (window.turnstile && window.__turnstileWidgets && window.__turnstileWidgets["quote-form"]) {
      window.turnstile.reset(window.__turnstileWidgets["quote-form"]);
    }
    goToStep(1);
  }

  wizard.querySelector('[data-calculate]').addEventListener('click', calculateEstimate);
  form.addEventListener('submit', submitQuote);
  wizard.querySelectorAll('[data-back]').forEach((btn) => {
    btn.addEventListener('click', () => goToStep(Number(btn.dataset.back)));
  });
  wizard.querySelector('[data-restart]').addEventListener('click', resetWizard);

  goToStep(1, false);

  const params = new URLSearchParams(window.location.search);
  if (params.get('service')) {
    const target = [...serviceCards].find((c) => c.dataset.service === params.get('service'));
    if (target) target.click();
  }
})();