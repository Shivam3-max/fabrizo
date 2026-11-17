/* FABRIZO theme.js — vanilla, no dependencies. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const F = window.Fabrizo || {};
  const money = (fils) => {
    const v = (Number(fils || 0) / 100).toFixed(2);
    return (F.moneyFormat || 'AED {{amount}}').replace(/\{\{\s*amount[^}]*\}\}/, v);
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shortTitle = (t) => String(t || '').split(' – ')[0].split(' | ')[0].split(' — ')[0].replace(/^(Fabrizo Fashion|FABRIZO FASHION)\s+/i, '').trim() || t;
  const sizeQuery = (src, w) => (src && /cdn\.shopify\.com|\/cdn\/shop\//.test(src) ? `${src}${src.includes('?') ? '&' : '?'}width=${w}` : src);

  /* ---------------- toast ---------------- */
  const toastEl = $('[data-toast]');
  let toastT;
  function toast(html) {
    if (!toastEl) return;
    toastEl.innerHTML = html;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2600);
  }

  /* ---------------- drawers ---------------- */
  const overlay = $('[data-overlay]');
  let openName = null;
  let lastFocus = null;
  function openDrawer(name) {
    const el = $(`[data-drawer="${name}"]`);
    if (!el) return false;
    closeDrawer(true);
    lastFocus = document.activeElement;
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    overlay?.classList.add('is-on');
    document.body.classList.add('is-locked');
    openName = name;
    const focusEl = el.querySelector('[data-search-input]') || el;
    setTimeout(() => focusEl.focus({ preventScroll: true }), 60);
    if (name === 'cart') renderCart();
    return true;
  }
  function closeDrawer(silent) {
    if (!openName) return;
    const el = $(`[data-drawer="${openName}"]`);
    el?.classList.remove('is-open');
    el?.setAttribute('aria-hidden', 'true');
    $('.coll__side.is-open')?.classList.remove('is-open');
    overlay?.classList.remove('is-on');
    document.body.classList.remove('is-locked');
    openName = null;
    if (!silent && lastFocus) lastFocus.focus?.({ preventScroll: true });
  }
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (o) {
      if (openDrawer(o.dataset.open)) e.preventDefault();
      return;
    }
    if (e.target.closest('[data-close]') || e.target === overlay) closeDrawer();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeDrawer(); closeMega(); } });

  /* ---------------- announcement ---------------- */
  const ann = $('[data-ann]');
  if (ann) {
    const msgs = $$('.ann__msg', ann);
    let i = 0;
    const show = (n) => { msgs[i].classList.remove('is-on'); i = (n + msgs.length) % msgs.length; msgs[i].classList.add('is-on'); };
    $('[data-ann-next]', ann)?.addEventListener('click', () => show(i + 1));
    $('[data-ann-prev]', ann)?.addEventListener('click', () => show(i - 1));
    if (msgs.length > 1) setInterval(() => { if (!document.hidden && !ann.matches(':hover')) show(i + 1); }, 4500);
  }

  /* ---------------- header: tab preview, mega menus, sub-row scroll ---------------- */
  const header = $('[data-header]');
  let megaT;
  function closeMega() { $$('.mega.is-open').forEach((m) => m.classList.remove('is-open')); }
  if (header) {
    const rows = $$('[data-subrow]', header);
    const activeRow = rows.find((r) => r.classList.contains('is-on'));
    const showRow = (n) => rows.forEach((r) => r.classList.toggle('is-on', r.dataset.subrow === String(n)));
    $$('.hdr__tab', header).forEach((tab) => {
      tab.addEventListener('mouseenter', () => { if ($(`[data-subrow="${tab.dataset.tab}"]`, header)) showRow(tab.dataset.tab); });
    });
    header.addEventListener('mouseleave', () => {
      megaT = setTimeout(() => { closeMega(); if (activeRow) showRow(activeRow.dataset.subrow); }, 180);
    });
    header.addEventListener('mouseenter', () => clearTimeout(megaT));
    $$('[data-mega-trigger]', header).forEach((t) => {
      const panel = $(`[data-mega="${t.dataset.megaTrigger}"]`, header);
      if (!panel) return;
      let hoverT;
      t.addEventListener('mouseenter', () => { hoverT = setTimeout(() => { closeMega(); panel.classList.add('is-open'); }, 120); });
      t.addEventListener('mouseleave', () => clearTimeout(hoverT));
      t.addEventListener('focus', () => { closeMega(); panel.classList.add('is-open'); });
    });
    $$('.hdr__sublink, .hdr__tab', header).forEach((el) => {
      if (!el.dataset.megaTrigger) el.addEventListener('mouseenter', () => closeMega());
    });
    $('[data-subnext]', header)?.addEventListener('click', () => {
      const row = rows.find((r) => r.classList.contains('is-on') && r.offsetParent) || rows.find((r) => r.offsetParent);
      row?.scrollBy({ left: row.clientWidth * 0.6, behavior: 'smooth' });
    });
    const syncNext = () => {
      const row = rows.find((r) => getComputedStyle(r).display !== 'none');
      const btn = $('[data-subnext]', header);
      if (row && btn) btn.hidden = row.scrollWidth <= row.clientWidth + 4 || row.scrollLeft + row.clientWidth >= row.scrollWidth - 4;
    };
    rows.forEach((r) => r.addEventListener('scroll', syncNext, { passive: true }));
    addEventListener('resize', syncNext);
    syncNext();
    // keep the current chip in view
    rows.forEach((r) => { const cur = $('.is-current', r); if (cur) r.scrollLeft = Math.max(0, cur.offsetLeft - 40); });
    const setH = () => document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
    setH(); addEventListener('resize', setH);
  }

  /* ---------------- search ---------------- */
  const hdrSearch = $('[data-hdr-search] input[name="q"]');
  const searchInput = $('[data-search-input]');
  if (hdrSearch) {
    const hints = (hdrSearch.dataset.searchHint || '').split(',').map((s) => s.trim()).filter(Boolean);
    const base = hdrSearch.placeholder;
    let h = 0;
    if (hints.length) setInterval(() => { if (document.activeElement !== hdrSearch && !hdrSearch.value) { hdrSearch.placeholder = `Search “${hints[h++ % hints.length]}”`; } }, 2600);
    hdrSearch.addEventListener('blur', () => { if (!hdrSearch.value) hdrSearch.placeholder = base; });
    hdrSearch.addEventListener('focus', () => {
      openDrawer('search');
      if (searchInput) { searchInput.value = hdrSearch.value; suggest(searchInput.value); }
    });
  }
  const resBox = $('[data-search-results]');
  const resHead = $('[data-search-heading]');
  const resAll = $('[data-search-all]');
  let sugT, sugCtl;
  async function suggest(q) {
    if (!resBox) return;
    q = q.trim();
    if (!q) return;
    sugCtl?.abort();
    sugCtl = new AbortController();
    try {
      const url = `${F.routes.suggest}?q=${encodeURIComponent(q)}&resources[type]=product,collection,query&resources[limit]=6`;
      const r = await fetch(url, { signal: sugCtl.signal });
      const d = await r.json();
      const res = d.resources?.results || {};
      const prods = res.products || [];
      resHead.textContent = prods.length ? `Products for “${q}”` : `No products for “${q}”`;
      resBox.innerHTML = prods.map((p) => `
        <a class="srch__item" href="${esc(p.url)}">
          ${p.image ? `<img src="${esc(sizeQuery(p.image, 160))}" alt="" width="56" height="70">` : '<span></span>'}
          <span><b>${esc(shortTitle(p.title))}</b><span class="price"><span class="price__now">${esc(money(Math.round(Number(p.price) * 100)))}</span></span></span>
        </a>`).join('') + (res.collections || []).map((c) => `<a class="pill" href="${esc(c.url)}">${esc(c.title)}</a>`).join('');
      if (resAll) { resAll.hidden = !prods.length; resAll.href = `${F.routes.search}?q=${encodeURIComponent(q)}&type=product`; }
    } catch (e) { /* aborted */ }
  }
  searchInput?.addEventListener('input', () => { clearTimeout(sugT); sugT = setTimeout(() => suggest(searchInput.value), 180); });

  /* ---------------- cart ---------------- */
  const countEls = () => $$('[data-cart-count]');
  async function getCart() { const r = await fetch(`${F.routes.cart}.js`, { headers: { Accept: 'application/json' } }); return r.json(); }
  function offerText(count) {
    if (!F.offerOn) return '';
    const [t1, t2] = F.offerTiers;
    if (count >= t2.buy + t2.free) return `<b>${t2.free} free tees unlocked.</b> Applied at checkout.`;
    if (count >= t1.buy + t1.free) return `<b>${t1.free} free tee unlocked.</b> Add ${t2.buy + t2.free - count} more for ${t2.free} free.`;
    const need = t1.buy + t1.free - count;
    return `Add ${need} more tee${need === 1 ? '' : 's'} and get <b>${t1.free} free</b>. Applied automatically.`;
  }
  async function renderCart(cart) {
    cart = cart || await getCart();
    countEls().forEach((el) => { el.textContent = cart.item_count; el.dataset.count = cart.item_count; });
    const cnt = $('[data-cart-count-text]'); if (cnt) cnt.textContent = `(${cart.item_count})`;
    const total = $('[data-cart-total]'); if (total) total.textContent = money(cart.total_price);
    const left = Math.max(0, F.freeShipping - cart.total_price);
    $$('[data-ship-text]').forEach((el) => { el.innerHTML = left > 0 ? `Add <b>${money(left)}</b> more to unlock free delivery` : '<b>Free UAE delivery unlocked</b>'; });
    $$('[data-ship-fill]').forEach((el) => { el.style.width = `${Math.min(100, (cart.total_price / F.freeShipping) * 100)}%`; });
    const ot = $('[data-offer-text]'); if (ot) ot.innerHTML = offerText(cart.item_count);
    const box = $('[data-cart-lines]');
    const foot = $('[data-cart-foot]');
    if (!box) return cart;
    if (!cart.items.length) {
      let links = [];
      try { links = JSON.parse($('[data-cart-empty-links]')?.textContent || '[]'); } catch (e) { /* noop */ }
      box.innerHTML = `<div class="cart-empty"><h3>Your bag is empty</h3><p>Start with your favourite anime.</p>${links.map((l) => `<a class="pill" href="${esc(l.u)}">${esc(l.t)}</a>`).join('')}</div>`;
      if (foot) foot.hidden = true;
      return cart;
    }
    if (foot) foot.hidden = false;
    box.innerHTML = cart.items.map((it, n) => {
      const img = it.image || it.featured_image?.url;
      const vt = it.variant_title && it.variant_title !== 'Default Title' ? it.variant_title : '';
      return `<div class="line" data-line="${n + 1}">
        <a class="line__img" href="${esc(it.url)}">${img ? `<img src="${esc(sizeQuery(img, 200))}" alt="" width="76" height="95">` : ''}</a>
        <div>
          <a class="line__t" href="${esc(it.url)}">${esc(shortTitle(it.product_title))}</a>
          ${vt ? `<p class="line__v">${esc(vt)}</p>` : ''}
          <div class="line__row">
            <div class="qty"><button type="button" data-q="-1" aria-label="Decrease">−</button><input type="number" min="0" value="${it.quantity}" aria-label="Quantity" data-qin><button type="button" data-q="1" aria-label="Increase">+</button></div>
            <span class="price"><span class="price__now">${money(it.final_line_price ?? it.line_price)}</span></span>
          </div>
          <button type="button" class="line__rm" data-rm>Remove</button>
        </div>
      </div>`;
    }).join('');
    return cart;
  }
  async function changeLine(line, quantity) {
    const r = await fetch(F.routes.cartChange, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ line, quantity }) });
    renderCart(await r.json());
  }
  document.addEventListener('click', (e) => {
    const lineEl = e.target.closest('[data-line]');
    if (!lineEl) return;
    const line = Number(lineEl.dataset.line);
    const input = $('[data-qin]', lineEl);
    if (e.target.closest('[data-q]')) changeLine(line, Math.max(0, Number(input.value) + Number(e.target.closest('[data-q]').dataset.q)));
    if (e.target.closest('[data-rm]')) changeLine(line, 0);
  });
  document.addEventListener('change', (e) => { const lineEl = e.target.closest('[data-line]'); if (lineEl && e.target.matches('[data-qin]')) changeLine(Number(lineEl.dataset.line), Math.max(0, Number(e.target.value))); });

  async function addToCart(id, quantity = 1, btn) {
    btn?.setAttribute('aria-busy', 'true');
    try {
      const r = await fetch(F.routes.cartAdd, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ items: [{ id: Number(id), quantity }] }) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); toast(esc(d.description || 'Could not add to bag')); return false; }
      openDrawer('cart');
      return true;
    } finally { btn?.removeAttribute('aria-busy'); }
  }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-add]');
    if (!b) return;
    e.preventDefault();
    if (await addToCart(b.dataset.add, 1, b)) { b.classList.add('is-added'); setTimeout(() => b.classList.remove('is-added'), 1400); }
  });

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-quick-toggle]');
    if (!t) return;
    e.preventDefault();
    const top = t.closest('.card__top');
    $$('.card__top.is-quick').forEach((x) => { if (x !== top) x.classList.remove('is-quick'); });
    top.classList.toggle('is-quick');
  });

  /* footer menus: accordions on phones, open columns on desktop */
  const footAcc = () => $$('[data-foot-acc]').forEach((d) => { if (innerWidth >= 750) d.open = true; else if (!d.dataset.touched) d.open = false; });
  $$('[data-foot-acc] summary').forEach((s) => s.addEventListener('click', (e) => { if (innerWidth >= 750) e.preventDefault(); else s.parentElement.dataset.touched = '1'; }));
  footAcc(); addEventListener('resize', footAcc);

  /* ---------------- wishlist (this device only) ---------------- */
  const WKEY = 'fabrizo:wishlist';
  const readW = () => { try { return JSON.parse(localStorage.getItem(WKEY) || '[]'); } catch (e) { return []; } };
  const writeW = (l) => { try { localStorage.setItem(WKEY, JSON.stringify(l)); } catch (e) { /* storage blocked */ } };
  const syncW = () => { const l = readW(); $$('[data-wish]').forEach((b) => b.setAttribute('aria-pressed', l.includes(b.dataset.wish) ? 'true' : 'false')); };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-wish]');
    if (!b) return;
    e.preventDefault();
    const l = readW();
    const h = b.dataset.wish;
    const on = !l.includes(h);
    writeW(on ? [...l, h] : l.filter((x) => x !== h));
    syncW();
    toast(on ? 'Saved to your wishlist' : 'Removed from wishlist');
  });
  syncW();

  /* ---------------- rails ---------------- */
  $$('[data-rail]').forEach((rail) => {
    const track = $('[data-rail-track]', rail);
    const prev = $('[data-rail-prev]', rail);
    const next = $('[data-rail-next]', rail);
    if (!track) return;
    const media = $('.card__media', track);
    if (media) rail.style.setProperty('--media-h', `${media.offsetHeight / 2}px`);
    const sync = () => {
      if (prev) prev.disabled = track.scrollLeft < 4;
      if (next) next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    };
    prev?.addEventListener('click', () => track.scrollBy({ left: -track.clientWidth * 0.9 }));
    next?.addEventListener('click', () => track.scrollBy({ left: track.clientWidth * 0.9 }));
    track.addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', () => { const m = $('.card__media', track); if (m) rail.style.setProperty('--media-h', `${m.offsetHeight / 2}px`); sync(); });
    sync();
  });

  /* ---------------- hero ---------------- */
  $$('[data-hero]').forEach((hero) => {
    const slides = $$('[data-slide]', hero);
    const dots = $$('[data-hero-dot]', hero);
    if (slides.length < 2) return;
    let i = 0;
    const go = (n) => {
      slides[i].classList.remove('is-on'); dots[i]?.classList.remove('is-on');
      i = (n + slides.length) % slides.length;
      slides[i].classList.add('is-on'); dots[i]?.classList.add('is-on');
    };
    $('[data-hero-next]', hero)?.addEventListener('click', () => go(i + 1));
    $('[data-hero-prev]', hero)?.addEventListener('click', () => go(i - 1));
    dots.forEach((d, n) => d.addEventListener('click', () => go(n)));
    const secs = Number(hero.dataset.autoplay || 0);
    if (secs > 0 && !matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(() => { if (!document.hidden && !hero.matches(':hover')) go(i + 1); }, secs * 1000);
    let x0 = null;
    hero.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); x0 = null; });
  });

  /* ---------------- product tabs ---------------- */
  $$('[data-ptabs]').forEach((sec) => {
    const tabs = $$('[data-ptab]', sec);
    tabs.forEach((t) => t.addEventListener('click', () => {
      tabs.forEach((x) => x.setAttribute('aria-selected', x === t ? 'true' : 'false'));
      $$('[data-ptab-panel]', sec).forEach((p) => { p.hidden = p.dataset.ptabPanel !== t.dataset.ptab; if (!p.hidden) $$('[data-ptab-all]', sec).forEach((a) => { a.href = p.dataset.url; }); });
    }));
  });

  /* ---------------- reels ---------------- */
  $$('[data-reel]').forEach((r) => {
    const v = $('video', r);
    if (!v) return;
    r.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      if (v.paused) { $$('[data-reel] video').forEach((o) => { if (o !== v) { o.pause(); o.closest('[data-reel]').classList.remove('is-playing'); } }); v.muted = false; v.play(); r.classList.add('is-playing'); } else { v.pause(); r.classList.remove('is-playing'); }
    });
  });

  /* ---------------- product-type bar: one type at a time, keeps other filters ---------------- */
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-tbar] a');
    if (!chip || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    const u = new URL(location.href);
    u.searchParams.delete('filter.p.product_type');
    u.searchParams.delete('page');
    if (chip.dataset.typeValue && !chip.classList.contains('is-on')) u.searchParams.append('filter.p.product_type', chip.dataset.typeValue);
    const qs = u.searchParams.toString();
    location.href = u.pathname + (qs ? '?' + qs : '');
  });
  $$('[data-tbar-row]').forEach((row) => { const on = $('.is-on', row); if (on && on.offsetLeft > row.clientWidth - 60) row.scrollLeft = on.offsetLeft - 20; });

  /* ---------------- collection: filters drawer, density, sort, find ---------------- */
  const side = $('[data-coll-side]');
  $('[data-open-filters]')?.addEventListener('click', () => { side?.classList.add('is-open'); overlay?.classList.add('is-on'); openName = 'filters'; document.body.classList.add('is-locked'); });
  $$('[data-close-filters]').forEach((b) => b.addEventListener('click', () => { side?.classList.remove('is-open'); overlay?.classList.remove('is-on'); document.body.classList.remove('is-locked'); openName = null; }));
  $$('[data-density]').forEach((b) => b.addEventListener('click', () => {
    const grid = $('[data-coll-grid]');
    if (!grid) return;
    grid.style.setProperty('--cols', b.dataset.density);
    $$('[data-density]').forEach((x) => x.classList.toggle('is-on', x === b));
    try { localStorage.setItem('fabrizo:density', b.dataset.density); } catch (e) { /* noop */ }
  }));
  try { const d = localStorage.getItem('fabrizo:density'); if (d && innerWidth > 989) $(`[data-density="${d}"]`)?.click(); } catch (e) { /* noop */ }
  $('[data-sort]')?.addEventListener('change', (e) => { const u = new URL(location.href); u.searchParams.set('sort_by', e.target.value); location.href = u; });
  const findIn = $('[data-coll-find]');
  findIn?.addEventListener('input', () => {
    const q = findIn.value.trim().toLowerCase();
    $$('[data-coll-grid] [data-card]').forEach((c) => { c.hidden = q && !c.textContent.toLowerCase().includes(q) && !c.dataset.handle.includes(q); });
  });

  /* ---------------- product page ---------------- */
  const pdp = $('[data-pdp]');
  if (pdp && ($('#pdp-form', pdp) || $('form[data-form="product"]', pdp))) {
    let product;
    try { product = JSON.parse($('[data-product-json]', pdp).textContent); } catch (e) { product = null; }
    const form = $('#pdp-form', pdp) || $('form[data-form="product"]', pdp);
    const idInput = $('input[name="id"]', form);
    const addBtn = $('[data-pdp-add]', pdp);
    const priceBox = $('[data-pdp-price]', pdp);
    const track = $('[data-gal-track]', pdp);
    const thumbs = $$('[data-gal-thumb]', pdp);
    const counter = $('[data-gal-counter]', pdp);
    const slides = $$('[data-gal-slide]', pdp);

    const goSlide = (n, smooth = true) => {
      if (!track || !slides[n]) return;
      track.scrollTo({ left: slides[n].offsetLeft, behavior: smooth ? 'smooth' : 'auto' });
    };
    const syncThumbs = () => {
      if (!track) return;
      const n = Math.round(track.scrollLeft / track.clientWidth);
      thumbs.forEach((t, k) => t.classList.toggle('is-on', k === n));
      $$('.gal__dots i', pdp).forEach((d, k) => d.classList.toggle('is-on', k === n));
      if (counter) counter.textContent = `${n + 1} / ${slides.length}`;
      thumbs[n]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    track?.addEventListener('scroll', () => { clearTimeout(track._t); track._t = setTimeout(syncThumbs, 60); }, { passive: true });
    thumbs.forEach((t, k) => t.addEventListener('click', () => goSlide(k)));
    $('[data-gal-prev]', pdp)?.addEventListener('click', () => track.scrollBy({ left: -track.clientWidth }));
    $('[data-gal-next]', pdp)?.addEventListener('click', () => track.scrollBy({ left: track.clientWidth }));

    // lightbox
    const lb = $('[data-lightbox]');
    slides.forEach((s, k) => s.addEventListener('click', () => {
      if (!lb) return;
      const lt = $('[data-lightbox-track]', lb);
      lt.innerHTML = slides.map((x) => `<img src="${esc(sizeQuery($('img', x).dataset.full || $('img', x).src, 1800))}" alt="">`).join('');
      lb.classList.add('is-on'); document.body.classList.add('is-locked');
      requestAnimationFrame(() => { lt.scrollLeft = lt.clientWidth * k; });
    }));
    $('[data-lightbox-close]')?.addEventListener('click', () => { lb.classList.remove('is-on'); document.body.classList.remove('is-locked'); });

    // variant picking
    const selected = {};
    $$('[data-opt]', pdp).forEach((g) => { const on = $('.is-on', g); if (on) selected[g.dataset.opt] = on.dataset.value; });
    const findVariant = () => product?.variants.find((v) => v.options.every((val, k) => selected[k] === undefined || selected[k] === val));
    const availabilityFor = (pos, value) => product?.variants.some((v) => v.available && v.options[pos] === value && v.options.every((val, k) => k === pos || selected[k] === undefined || selected[k] === val));
    const refresh = () => {
      const v = findVariant();
      $$('[data-opt]', pdp).forEach((g) => {
        const pos = Number(g.dataset.opt);
        $$('[data-value]', g).forEach((b) => {
          b.classList.toggle('is-on', selected[pos] === b.dataset.value);
          b.classList.toggle('is-out', !availabilityFor(pos, b.dataset.value));
        });
        const lab = $('[data-opt-label]', g); if (lab) lab.textContent = selected[pos] || '';
      });
      if (!v) { addBtn.disabled = true; addBtn.textContent = 'Unavailable'; return; }
      idInput.value = v.id;
      addBtn.disabled = !v.available;
      addBtn.textContent = v.available ? addBtn.dataset.label : 'Sold out';
      if (priceBox) {
        const sale = v.compare_at_price && v.compare_at_price > v.price;
        priceBox.className = `price${sale ? ' price--sale' : ''}`;
        priceBox.innerHTML = `<span class="price__now">${money(v.price)}</span>${sale ? `<s class="price__was">${money(v.compare_at_price)}</s><span class="price__off">-${Math.floor((1 - v.price / v.compare_at_price) * 100 + 1e-9)}%</span>` : ''}`;
      }
      $$('[data-tabby]').forEach((el) => { el.textContent = money(Math.round(v.price / 4)); });
      $$('[data-sticky-price]').forEach((el) => { el.textContent = money(v.price); });
      const u = new URL(location.href); u.searchParams.set('variant', v.id); history.replaceState(null, '', u);
      if (v.featured_image) {
        const src = v.featured_image.src.split('?')[0];
        const k = slides.findIndex((s) => ($('img', s).dataset.full || '').split('?')[0] === src);
        if (k > -1) goSlide(k);
      }
    };
    $$('[data-opt]', pdp).forEach((g) => g.addEventListener('click', (e) => {
      const b = e.target.closest('[data-value]');
      if (!b) return;
      selected[g.dataset.opt] = b.dataset.value;
      refresh();
    }));
    if (product) refresh();

    // quantity
    const qin = $('[data-pdp-qty]', pdp);
    $$('[data-pdp-q]', pdp).forEach((b) => b.addEventListener('click', () => { qin.value = Math.max(1, Number(qin.value) + Number(b.dataset.pdpQ)); }));

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await addToCart(idInput.value, Math.max(1, Number(qin?.value || 1)), addBtn);
    });
    $('[data-sticky-add]')?.addEventListener('click', () => form?.requestSubmit());
    const sticky = $('[data-sticky-buy]');
    if (sticky && addBtn && 'IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => sticky.classList.toggle('is-on', !en.isIntersecting && en.boundingClientRect.top < 0)).observe(addBtn);
    }

    // offer slider
    const offer = $('[data-offer]', pdp);
    if (offer) {
      const os = $$('.offer__slide', offer); const od = $$('.offer__dots i', offer); let k = 0;
      if (os.length > 1) setInterval(() => { os[k].classList.remove('is-on'); od[k]?.classList.remove('is-on'); k = (k + 1) % os.length; os[k].classList.add('is-on'); od[k]?.classList.add('is-on'); }, 3800);
    }

    // order-by countdown (same-day dispatch cut-off)
    const eta = $('[data-cutoff]', pdp);
    if (eta) {
      const cut = Number(eta.dataset.cutoff || 16);
      const tick = () => {
        const n = new Date(); const t = new Date(n); t.setHours(cut, 0, 0, 0); if (n > t) t.setDate(t.getDate() + 1);
        const m = Math.floor((t - n) / 60000);
        eta.textContent = `${Math.floor(m / 60)}h ${m % 60}m`;
      };
      tick(); setInterval(tick, 30000);
    }
    // free delivery bar on PDP
    getCart().then((c) => renderCart(c));

    // WhatsApp order
    $('[data-wa-order]', pdp)?.addEventListener('click', (e) => {
      if (!F.whatsapp) return;
      e.preventDefault();
      const v = findVariant();
      const msg = `Hi FABRIZO, I want to order: ${shortTitle(product.title)}${v && v.title !== 'Default Title' ? ` (${v.title})` : ''} — ${location.href}`;
      open(`https://wa.me/${F.whatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    });
  }

  /* ---------------- mobile nav tabs ---------------- */
  $$('[data-mtab]').forEach((t) => t.addEventListener('click', () => {
    $$('[data-mtab]').forEach((x) => { x.classList.toggle('is-on', x === t); x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
    $$('[data-mpanel]').forEach((p) => { p.hidden = p.dataset.mpanel !== t.dataset.mtab; });
  }));

  /* ---------------- newsletter confirmation ---------------- */
  if (location.hash === '#subscribed') {
    $$('.news__form').forEach((f) => { f.outerHTML = '<p class="news__ok">You’re in. Watch your inbox for the next drop.</p>'; });
  }

  /* ---------------- reveal ---------------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('[data-reveal]').forEach((el) => io.observe(el));
  } else $$('[data-reveal]').forEach((el) => el.classList.add('is-in'));

  getCart().then((c) => countEls().forEach((el) => { el.textContent = c.item_count; el.dataset.count = c.item_count; })).catch(() => {});
})();
