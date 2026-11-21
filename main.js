/* =========================================================
   Build Daggett Montessori Right — main.js (no dependencies)
   ========================================================= */

/* ---------- CONFIG: edit these before launch ---------- */

// Google Apps Script web-app URL (see README, "Google Sheet setup").
// If you redeploy as a NEW deployment, paste the new /exec URL here.
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyjCp2WNlY57a8bv-eTMXuVyauWJC2m8IfbIcQnp5T2PNFv5SX6uqFn_IggA22vmj97/exec';

// TODO: Replace with the campaign's real contact email (also update the footer in index.html).
const CONTACT_EMAIL = 'contact@example.com';

/* ------------------------------------------------------ */

(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const scriptReady = /^https:\/\/script\.google(usercontent)?\.com\//.test(SCRIPT_URL);

  /* ---------- Mobile nav ---------- */
  const navToggle = $('.nav-toggle');
  const nav = $('#site-nav');

  function setNav(open) {
    navToggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  }
  navToggle.addEventListener('click', () => setNav(navToggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setNav(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setNav(false); navToggle.focus(); }
  });
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('is-open') && !e.target.closest('.site-header')) setNav(false);
  });

  /* ---------- Highlight current section in nav ---------- */
  const navLinks = $$('.site-nav a');
  if ('IntersectionObserver' in window) {
    const byId = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => { a.classList.remove('is-current'); a.removeAttribute('aria-current'); });
        const link = byId.get(entry.target.id);
        if (link) { link.classList.add('is-current'); link.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach((s) => sectionObserver.observe(s));
  }

  /* ---------- Hide sticky mobile CTA while the petition is on screen ---------- */
  const mobileCta = $('#mobile-cta');
  const signSection = $('#sign-section');
  if (mobileCta && signSection && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      mobileCta.classList.toggle('is-hidden', entry.isIntersecting);
    }, { threshold: 0.05 }).observe(signSection);
  }

  /* ---------- Upgrades: collapsed on phones, open on larger screens ---------- */
  if (window.matchMedia('(min-width: 768px)').matches) {
    $$('.accordion details').forEach((d) => { d.open = true; });
  }

  /* ---------- Plan tabs (Phasing Plan is the default) ---------- */
  $$('[data-tabs]').forEach((tabsEl) => {
    const tabs = $$('[role="tab"]', tabsEl);
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));

    function select(i, focus) {
      tabs.forEach((t, j) => {
        const on = i === j;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
      });
      if (focus) tabs[i].focus();
    }

    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i, false));
      t.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = tabs.length - 1;
        if (next !== null) { e.preventDefault(); select(next, true); }
      });
    });

    // Without JavaScript both drawings stay visible; with it, show the first tab.
    select(0, false);
  });

  /* ---------- Plan sheets: full-size viewer (site plan, phasing plan) ---------- */
  const planDialog = $('#plan-dialog');
  const planLinks = $$('[data-plan-open]');
  const planFull = $('[data-plan-full]');
  const planRaw = $('[data-plan-raw]');
  let zoom = 1;
  let lastPlanLink = null;

  function setZoom(z) {
    zoom = Math.min(4, Math.max(1, z));
    planFull.style.setProperty('--zoom', zoom);
  }

  if (planDialog && typeof planDialog.showModal === 'function' && planLinks.length) {
    planLinks.forEach((link) => link.addEventListener('click', (e) => {
      e.preventDefault();
      lastPlanLink = link;
      const thumb = $('img', link);
      planFull.src = link.getAttribute('href');
      planFull.alt = thumb ? `${thumb.alt} Full size.` : 'Plan sheet, full size.';
      if (planRaw) planRaw.href = link.getAttribute('href');
      planDialog.setAttribute('aria-label', link.dataset.planLabel || 'Plan sheet, full size');
      // Phones get a 2x start so details are readable; larger screens fit to width.
      setZoom(window.innerWidth < 768 ? 2 : 1);
      planDialog.showModal();
      document.body.style.overflow = 'hidden';
      $('[data-close]', planDialog).focus();
    }));
    planDialog.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.zoom === 'in') setZoom(zoom + 0.5);
      if (btn.dataset.zoom === 'out') setZoom(zoom - 0.5);
      if ('close' in btn.dataset) planDialog.close();
    });
    planDialog.addEventListener('close', () => {
      document.body.style.overflow = '';
      if (lastPlanLink) lastPlanLink.focus();
    });
  }
  // Without <dialog> support the link simply opens the image itself.

  /* ---------- Live signature count (names are never fetched) ---------- */
  let signatureCount = null;

  function renderCount() {
    if (signatureCount === null || signatureCount < 1) return;
    const n = signatureCount.toLocaleString('en-US');
    const text = signatureCount === 1 ? '1 person has signed.' : `${n} people have signed.`;
    $$('[data-sig-count]').forEach((el) => { el.textContent = text; el.hidden = false; });
  }

  if (scriptReady) {
    fetch(`${SCRIPT_URL}?action=count`, { method: 'GET', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (typeof data.count === 'number') { signatureCount = data.count; renderCount(); }
      })
      .catch(() => { /* Count is a nice-to-have; stay hidden on failure. */ });
  }

  /* ---------- Sharing: link + full-screen QR code ---------- */
  // Share the canonical address (set by `npm run qr`), so links from preview deployments still point to the real site.
  const canonical = $('link[rel="canonical"]');
  const siteOrigin = canonical && /^https?:\/\/(?!YOUR-DOMAIN)/.test(canonical.href)
    ? new URL(canonical.href).origin
    : location.origin;
  const shareUrl = `${siteOrigin}/#sign`;
  $$('[data-site-host]').forEach((el) => { el.textContent = new URL(siteOrigin).host; });

  async function shareLink(btn) {
    const scope = btn.closest('[data-share-scope]');
    const msg = scope && $('[data-share-msg]', scope);
    const say = (t) => { if (msg) msg.textContent = t; };
    const data = { title: document.title, text: 'Ask Fort Worth ISD to pause the Daggett Montessori contract and plan it right for a K-8 Montessori. Sign the petition.', url: shareUrl };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(shareUrl);
      say('Link copied. Paste it into a text or email.');
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      say(`Share this link: ${shareUrl}`);
    }
  }

  const qrDialog = $('#qr-dialog');
  let qrOpener = null;
  function openQr(btn) {
    if (!qrDialog || typeof qrDialog.showModal !== 'function') {
      window.open('public/qr-sign.svg', '_blank', 'noopener');
      return;
    }
    qrOpener = btn;
    qrDialog.showModal();
    document.body.style.overflow = 'hidden';
    $('[data-qr-close]', qrDialog).focus();
  }
  if (qrDialog) {
    qrDialog.addEventListener('close', () => {
      document.body.style.overflow = '';
      if (qrOpener && document.contains(qrOpener)) qrOpener.focus();
    });
    // Tap anywhere (or "Done") to close.
    qrDialog.addEventListener('click', () => qrDialog.close());
  }

  // Delegated so buttons added later (the thank-you screen) work too.
  document.addEventListener('click', (e) => {
    const shareBtn = e.target.closest('[data-share]');
    if (shareBtn) { shareLink(shareBtn); return; }
    const qrBtn = e.target.closest('[data-qr-open]');
    if (qrBtn) openQr(qrBtn);
  });

  /* ---------- Petition form ---------- */
  const form = $('#petition-form');
  if (!form) return;

  const submitBtn = $('#submit-btn');
  const status = $('#form-status');
  const comment = $('#comment');
  const commentCount = $('#comment-count');
  const loadedAt = Date.now();

  // Character counter
  comment.addEventListener('input', () => {
    const len = comment.value.length;
    $('[data-count]', commentCount).textContent = len;
    commentCount.classList.toggle('is-near', len >= 450);
  });

  function setError(input, errEl, message) {
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      errEl.textContent = message;
      errEl.hidden = false;
    } else {
      input.removeAttribute('aria-invalid');
      errEl.textContent = '';
      errEl.hidden = true;
    }
  }

  function validate() {
    const checks = [
      ['firstName', (v) => (v.trim() ? '' : 'Please enter your first name.')],
      ['lastName', (v) => (v.trim() ? '' : 'Please enter your last name.')],
      ['email', (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Please check your email address, or leave it blank.')],
      ['zip', (v) => (/^\d{5}(-\d{4})?$/.test(v.trim()) ? '' : 'Please enter a 5-digit ZIP code.')],
    ];
    let firstBad = null;
    checks.forEach(([id, rule]) => {
      const input = $(`#${id}`);
      const msg = rule(input.value);
      setError(input, $(`#${id}-err`), msg);
      if (msg && !firstBad) firstBad = input;
    });
    const consent = $('#consent');
    const consentMsg = consent.checked ? '' : 'Please check this box to add your name.';
    setError(consent, $('#consent-err'), consentMsg);
    if (consentMsg && !firstBad) firstBad = consent;

    // "Send me updates" needs an email to be useful.
    const updates = $('#updates');
    if (updates.checked && !$('#email').value.trim() && !firstBad) {
      setError($('#email'), $('#email-err'), 'Add your email so we can send you updates, or uncheck the box.');
      firstBad = $('#email');
    }
    return firstBad;
  }

  // Clear an error as soon as the person fixes the field.
  form.addEventListener('input', (e) => {
    const t = e.target;
    if (t.getAttribute('aria-invalid') === 'true') {
      const err = $(`#${t.id}-err`);
      if (err) setError(t, err, '');
    }
  });

  function showStatus(html, isError) {
    status.innerHTML = html;
    status.classList.toggle('is-error', !!isError);
    status.hidden = false;
    status.focus();
  }

  function showThanks(firstName) {
    const wrap = document.createElement('div');
    wrap.className = 'thanks';
    wrap.tabIndex = -1;
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('data-share-scope', '');
    wrap.innerHTML = `
      <div class="thanks-icon" aria-hidden="true">&#10003;</div>
      <h3>Thank you${firstName ? ', ' + escapeHtml(firstName) : ''}!</h3>
      <p>Your name has been added. Now hand your phone to a neighbor: they can scan this code to sign too.</p>
      <img class="thanks-qr" src="public/qr-sign.svg" width="180" height="180" alt="QR code that opens the petition sign-up form.">
      <div class="thanks-actions">
        <button type="button" class="btn btn-primary" data-qr-open>Show full screen</button>
        <button type="button" class="btn btn-ghost" data-share>Share link</button>
        <a class="btn btn-ghost" href="flyer.html">Print a flyer</a>
      </div>
      <p class="field-help" data-share-msg aria-live="polite"></p>`;
    form.replaceWith(wrap);
    wrap.focus();

    if (signatureCount !== null) { signatureCount += 1; renderCount(); }
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const failMessage = () =>
    `Sorry, we couldn't submit your signature just now. Please check your connection and try again. ` +
    `If it keeps happening, email us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> with your name and ZIP code.`;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitBtn.disabled) return;
    status.hidden = true;

    const firstBad = validate();
    if (firstBad) { firstBad.focus(); return; }

    const fd = new FormData(form);

    // Honeypot or an instant (<3s) submit: pretend it worked, send nothing.
    if ((fd.get('website') || '').trim() || Date.now() - loadedAt < 3000) {
      showThanks('');
      return;
    }

    if (!scriptReady) {
      showStatus('The petition isn\'t connected yet (SCRIPT_URL is not set in main.js). Your signature was not saved.', true);
      return;
    }

    const payload = new URLSearchParams({
      firstName: fd.get('firstName').trim(),
      lastName: fd.get('lastName').trim(),
      email: (fd.get('email') || '').trim(),
      updates: fd.get('updates') ? 'yes' : 'no',
      zip: fd.get('zip').trim(),
      address: (fd.get('address') || '').trim(),
      relationship: fd.getAll('relationship').join('; '),
      comment: (fd.get('comment') || '').trim().slice(0, 500),
      consent: 'yes',
      website: '',
    });

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing…';

    try {
      // Apps Script doesn't send CORS headers on POST redirects, so we use no-cors.
      // The response is opaque: a resolved fetch means the request reached Google.
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: payload.toString(),
      });
      try { localStorage.setItem('daggett-signed', '1'); } catch (_) { /* ignore */ }
      showThanks(fd.get('firstName').trim());
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign the Petition';
      showStatus(failMessage(), true);
    }
  });

  // Returning signer on this device: gentle note (they can still sign for someone else's device).
  try {
    if (localStorage.getItem('daggett-signed') === '1') {
      const note = document.createElement('p');
      note.className = 'field-help';
      note.textContent = 'It looks like you already signed on this device. Thank you!';
      form.prepend(note);
    }
  } catch (_) { /* ignore */ }

  /* ---------- Direct links to /#sign ---------- */
  // Browsers jump to the hash before late layout settles. Re-align once everything has loaded.
  window.addEventListener('load', () => {
    if (location.hash === '#sign') {
      const target = document.getElementById('sign');
      if (target) target.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  });
})();
