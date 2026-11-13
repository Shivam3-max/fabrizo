/**
 * Local Shopify emulator for the FABRIZO theme.
 *
 * Express + LiquidJS standing in for Shopify's object graph, filters, tags,
 * storefront filtering and the /cart/*.js API, so the theme can be reviewed
 * with the real FABRIZO catalogue and no store attached.
 *
 *   npm run dev   ->  http://localhost:3840
 *   ?only=<section-key>  renders a single section of the template
 *
 * Two LiquidJS traps are handled on purpose (both fail silently):
 *   1. custom block tags use generator `*render`, never `async render`;
 *   2. `{% render %}` isolates scope, so Shopify globals go in renderOptions.globals.
 */
import express from 'express';
import { Liquid } from 'liquidjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { universes, characters } from '../data/universes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const THEME = path.join(ROOT, 'theme');
const PORT = process.env.PORT || 3840;
const CATALOG = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/catalog.json'), 'utf8'));
const readJSON = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

const fils = (v) => Math.round(Number(v || 0) * 100);
const money = (v) => `AED ${(Number(v || 0) / 100).toFixed(2)}`;
const handleize = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const field = (value) => ({ value });

/* ------------------------------ products ------------------------------ */
const img = (i, pos) => i && ({ src: i.src, width: i.width, height: i.height, alt: i.alt, aspect_ratio: i.width / i.height, position: pos, id: pos, media_type: 'image', preview_image: { src: i.src, width: i.width, height: i.height, aspect_ratio: i.width / i.height } });

const products = CATALOG.products.map((p) => {
  const images = p.images.map((i, n) => img(i, n + 1));
  const variants = p.variants.map((v) => {
    const options = [v.option1, v.option2, v.option3].filter((x) => x != null);
    const vi = v.image ? images.find((i) => i.src === v.image.split('?')[0]) || img({ src: v.image.split('?')[0], width: 1000, height: 1250, alt: '' }, 99) : null;
    return {
      id: v.id, title: v.title, option1: v.option1, option2: v.option2, option3: v.option3, options,
      price: fils(v.price), compare_at_price: v.compare_at_price ? fils(v.compare_at_price) : null,
      available: v.available, featured_image: vi, featured_media: vi, image: vi,
      url: `/products/${p.handle}?variant=${v.id}`, sku: '',
    };
  });
  const first = variants.find((v) => v.available) || variants[0];
  const options_with_values = p.options.map((o, i) => ({ name: o.name, position: i + 1, values: o.values, selected_value: first[`option${i + 1}`] }));
  const prices = variants.map((v) => v.price);
  const compares = variants.map((v) => v.compare_at_price || 0);
  return {
    id: p.id, handle: p.handle, title: p.title, vendor: p.vendor, type: p.type,
    url: `/products/${p.handle}`, available: variants.some((v) => v.available),
    description: p.body_html, content: p.body_html, tags: p.tags, created_at: p.created_at, published_at: p.created_at,
    options: p.options.map((o) => o.name), options_with_values, options_by_name: Object.fromEntries(options_with_values.map((o) => [o.name.toLowerCase(), o])),
    variants, first_available_variant: first, selected_or_first_available_variant: first, selected_variant: null,
    has_only_default_variant: variants.length === 1 && variants[0].title === 'Default Title',
    price: Math.min(...prices), price_min: Math.min(...prices), price_max: Math.max(...prices), price_varies: new Set(prices).size > 1,
    compare_at_price: first.compare_at_price, compare_at_price_max: Math.max(...compares), compare_at_price_min: Math.min(...compares),
    images, media: images, featured_image: images[0] || null, featured_media: images[0] || null,
    collections: [],
    metafields: { reviews: { rating: field(null), rating_count: field(null) }, fabrizo: { universe: field(p.universes[0] || null) } },
    _universes: p.universes, _characters: p.characters, _cols: p.collections,
  };
});
const P = (h) => products.find((x) => x.handle === h);
const variantById = new Map(products.flatMap((p) => p.variants.map((v) => [v.id, { product: p, variant: v }])));

/* ----------------------------- collections ---------------------------- */
const collections = {};
function mkCollection(handle, title, list, extra = {}) {
  collections[handle] = {
    id: Object.keys(collections).length + 1, handle, title, url: `/collections/${handle}`,
    products: list, products_count: list.length, all_products_count: list.length,
    all_types: [...new Set(list.map((p) => p.type))].filter(Boolean),
    description: extra.description || '', image: extra.image || list[0]?.featured_image || null,
    featured_image: extra.image || list[0]?.featured_image || null,
    metafields: { fabrizo: { accent: field(extra.accent || null), kanji: field(extra.kanji || null), tagline: field(extra.line || null) } },
    template_suffix: extra.template_suffix || null,
  };
  for (const p of list) if (!p.collections.find((c) => c.handle === handle)) p.collections.push({ handle, title, url: `/collections/${handle}` });
}
const newest = [...products].sort((a, b) => b.created_at.localeCompare(a.created_at));
mkCollection('all', 'All Products', newest);
for (const c of CATALOG.collections) {
  if (c.handle === 'all-products') continue;
  const list = newest.filter((p) => p._cols.includes(c.handle));
  mkCollection(c.handle, c.title, list, { description: c.description, image: c.image ? { src: c.image, width: 1200, height: 1200, alt: c.title, aspect_ratio: 1 } : null });
}
for (const u of universes) mkCollection(u.handle, u.title, newest.filter((p) => p._universes.includes(u.handle)), { accent: u.accent, kanji: u.kanji, line: u.line, description: `<p>${u.line}</p>`, template_suffix: 'anime' });
mkCollection('sale', 'Sale', newest.filter((p) => p.compare_at_price && p.compare_at_price > p.price));
mkCollection('t-shirts', 'T-Shirts', newest.filter((p) => /t-shirt|tee/i.test(p.type + ' ' + p.title) && !/hoodie|shorts|jogger|polo/i.test(p.title)));
mkCollection('oversized', 'Oversized Tees', newest.filter((p) => /oversized/i.test(p.title + p.options_with_values.map((o) => o.values.join(' ')).join(' '))));
mkCollection('custom-print', 'Custom Print', newest.filter((p) => p.type === 'Custom Print'));
mkCollection('anime-collection', collections['anime-collection']?.title || 'Anime Collection', newest.filter((p) => p._cols.includes('anime-collection') || p._universes.length), { template_suffix: 'anime' });

/* --------------------------- storefront filters ------------------------ */
const optKind = (name) => { const n = name.toLowerCase(); return /colou?r/.test(n) ? 'color' : /size/.test(n) ? 'size' : /fit|type|length/.test(n) ? 'fit' : null; };
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', '4XL'];
const normVal = (kind, v) => {
  const s = String(v).trim();
  if (kind === 'size') return s.toUpperCase();
  if (kind === 'fit') return /over/i.test(s) ? 'Oversized' : /reg/i.test(s) ? 'Regular' : s;
  return s.replace(/^nevy|^neavy/i, 'Navy').replace(/off-?\s?white/i, 'Off White').replace(/\b\w/g, (c) => c.toUpperCase()).replace(/(\w)(\w*)/g, (m, a, b) => a + b.toLowerCase());
};
function productValues(p, kind) {
  const out = new Set();
  p.options_with_values.forEach((o) => { if (optKind(o.name) === kind) o.values.forEach((v) => out.add(normVal(kind, v))); });
  return out;
}
function buildFilters(list, query, basePath) {
  const params = new URLSearchParams(query);
  const mk = (label, param, values) => ({
    label, type: 'list', param_name: param,
    active_values: values.filter((v) => v.active),
    values,
  });
  const urlWith = (param, value, add) => {
    const q = new URLSearchParams(params);
    const cur = q.getAll(param);
    q.delete(param);
    (add ? [...cur, value] : cur.filter((x) => x !== value)).forEach((x) => q.append(param, x));
    const s = q.toString();
    return basePath + (s ? `?${s}` : '');
  };
  const group = (label, param, getVals, order) => {
    const counts = new Map();
    list.forEach((p) => getVals(p).forEach((v) => counts.set(v, (counts.get(v) || 0) + 1)));
    let vals = [...counts.keys()];
    vals.sort(order || ((a, b) => a.localeCompare(b)));
    return mk(label, param, vals.map((v) => {
      const active = params.getAll(param).includes(v);
      return { label: v, value: v, count: counts.get(v), active, param_name: param, url_to_add: urlWith(param, v, true), url_to_remove: urlWith(param, v, false) };
    }));
  };
  return [
    group('Availability', 'filter.v.availability', (p) => [p.available ? 'In stock' : 'Out of stock']),
    group('Anime', 'filter.p.m.fabrizo.universe', (p) => p._universes.map((h) => universes.find((u) => u.handle === h).title)),
    group('Fit', 'filter.v.option.fit', (p) => productValues(p, 'fit')),
    group('Size', 'filter.v.option.size', (p) => productValues(p, 'size'), (a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)),
    group('Color', 'filter.v.option.color', (p) => productValues(p, 'color')),
    group('Product type', 'filter.p.product_type', (p) => [p.type]),
  ].filter((f) => f.values.length > 1 || f.active_values.length);
}
function applyFilters(list, query) {
  const params = new URLSearchParams(query);
  const checks = [
    ['filter.v.availability', (p) => [p.available ? 'In stock' : 'Out of stock']],
    ['filter.p.m.fabrizo.universe', (p) => p._universes.map((h) => universes.find((u) => u.handle === h).title)],
    ['filter.v.option.fit', (p) => [...productValues(p, 'fit')]],
    ['filter.v.option.size', (p) => [...productValues(p, 'size')]],
    ['filter.v.option.color', (p) => [...productValues(p, 'color')]],
    ['filter.p.product_type', (p) => [p.type]],
  ];
  return list.filter((p) => checks.every(([param, get]) => { const want = params.getAll(param); return !want.length || get(p).some((v) => want.includes(v)); }));
}

/* -------------------------------- menus -------------------------------- */
function resolveLink(l) {
  const m = /^\/collections\/([^/?#]+)$/.exec(l.url || '');
  const object = m && collections[m[1]] ? collections[m[1]] : null;
  const links = (l.links || []).map(resolveLink);
  return { title: l.title, url: l.url, handle: handleize(l.title), type: object ? 'collection_link' : 'http_link', object, links, active: false, child_active: false, levels: links.length ? (links.some((x) => x.links.length) ? 2 : 1) : 0 };
}
const linklists = Object.fromEntries(Object.entries(readJSON('data/menus.json')).map(([h, m]) => [h, { handle: h, title: m.title, links: m.links.map(resolveLink) }]));

/* -------------------------------- cart -------------------------------- */
const cart = { items: [], item_count: 0, total_price: 0, original_total_price: 0, total_discount: 0, currency: 'AED', note: '', requires_shipping: true };
function recalc() {
  cart.items.forEach((i) => { i.line_price = i.price * i.quantity; i.final_line_price = i.line_price; i.final_price = i.price; i.original_line_price = i.line_price; });
  cart.item_count = cart.items.reduce((n, i) => n + i.quantity, 0);
  cart.total_price = cart.items.reduce((n, i) => n + i.line_price, 0);
  cart.original_total_price = cart.total_price;
  cart.items_subtotal_price = cart.total_price;
}
function addToCart(id, quantity = 1) {
  const rec = variantById.get(Number(id));
  if (!rec) return null;
  const { product, variant } = rec;
  let line = cart.items.find((i) => i.variant_id === variant.id);
  if (line) line.quantity += quantity;
  else {
    const image = variant.featured_image || product.featured_image;
    line = {
      key: `${variant.id}:fz`, id: variant.id, variant_id: variant.id, product_id: product.id, handle: product.handle,
      product_title: product.title, variant_title: variant.title === 'Default Title' ? null : variant.title, title: product.title,
      quantity, price: variant.price, original_price: variant.price, compare_at_price: variant.compare_at_price,
      url: variant.url, image: image ? image.src : null, featured_image: image ? { url: image.src, alt: product.title } : null,
      properties: {}, product_type: product.type, variant: { ...variant }, product: { title: product.title, handle: product.handle, url: product.url },
      options_with_values: product.options_with_values.map((o, i) => ({ name: o.name, value: variant[`option${i + 1}`] })),
    };
    cart.items.push(line);
  }
  recalc();
  return line;
}
function changeCart(key, quantity) {
  const i = typeof key === 'number' && key < 1000 ? key - 1 : cart.items.findIndex((x) => x.key === key || String(x.variant_id) === String(key));
  if (i < 0 || !cart.items[i]) return;
  if (quantity <= 0) cart.items.splice(i, 1); else cart.items[i].quantity = quantity;
  recalc();
}

/* ------------------------------- engine ------------------------------- */
const engine = new Liquid({
  root: ['sections', 'snippets', 'templates', 'layout'].map((d) => path.join(THEME, d)),
  extname: '.liquid', cache: false, jsTruthy: true, strictFilters: false, strictVariables: false,
});
const F = engine.registerFilter.bind(engine);
const kw = (args) => Object.fromEntries(args.filter((a) => Array.isArray(a)));
F('asset_url', (v) => `/assets/${v}`);
F('stylesheet_tag', (v) => `<link rel="stylesheet" href="${v}">`);
F('script_tag', (v) => `<script src="${v}" defer></script>`);
F('image_url', (i, ...args) => {
  const src = typeof i === 'string' ? i : i?.src || i?.url || '';
  if (!src) return '';
  const { width } = kw(args);
  return /cdn\.shopify\.com/.test(src) && width ? `${src}${src.includes('?') ? '&' : '?'}width=${width}` : src;
});
F('img_url', (i, size) => { const src = typeof i === 'string' ? i : i?.src || ''; const w = parseInt(size, 10); return src && w ? `${src}?width=${w}` : src; });
F('image_tag', (url) => `<img src="${url}" alt="" loading="lazy">`);
F('money', money);
F('money_with_currency', money);
F('money_without_trailing_zeros', (v) => money(v).replace(/\.00$/, ''));
F('money_without_currency', (v) => (Number(v || 0) / 100).toFixed(2));
F('handle', handleize);
F('handleize', handleize);
F('json', (v) => JSON.stringify(v, (k, val) => (k.startsWith('_') || k === 'collections' ? undefined : val)));
F('t', (v) => String(v));
F('strip_html', (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
F('date', (v, fmt) => {
  const d = v === 'now' || v === 'today' ? new Date() : new Date(v);
  if (isNaN(d)) return String(v || '');
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return String(fmt || '%-d %b %Y').replace('%s', Math.floor(d.getTime() / 1000)).replace('%H', String(d.getHours()).padStart(2, '0')).replace('%M', String(d.getMinutes()).padStart(2, '0')).replace('%A', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()]).replace('%Y', d.getFullYear()).replace('%b', M[d.getMonth()]).replace('%d', String(d.getDate()).padStart(2, '0')).replace('%-d', d.getDate());
});
F('within', (url) => url);
F('link_to', (t, url) => `<a href="${url}">${t}</a>`);
F('default_errors', () => '');
F('payment_type_svg_tag', () => '');
F('font_face', () => '');
F('font_url', () => '');
F('color_to_rgb', (c) => c);
F('sort_by', (url, v) => `${url}?sort_by=${v}`);

const skipBlock = (name) => engine.registerTag(name, {
  parse(t, remain) { while (remain.length) { const x = remain.shift(); if (x.name === `end${name}`) return; } },
  render() { return ''; },
});
['schema', 'javascript', 'stylesheet'].forEach(skipBlock);

const wrapTag = (name, open, close) => engine.registerTag(name, {
  parse(token, remain) {
    this.args = token.args; this.tpls = [];
    const s = this.liquid.parser.parseStream(remain);
    s.on(`tag:end${name}`, function () { this.stop(); }).on('template', (t) => this.tpls.push(t))
      .on('end', () => { throw new Error(`{% ${name} %} not closed`); });
    s.start();
  },
  *render(ctx, emitter) {
    emitter.write(open(this.args));
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    emitter.write(close);
  },
});
wrapTag('style', () => '<style>', '</style>');
wrapTag('form', (args) => {
  const kind = (args.split(',')[0] || '').trim().replace(/^['"]|['"]$/g, '');
  const action = { product: '/cart/add', cart: '/cart', customer: '/contact', contact: '/contact', localization: '/localization' }[kind] || '/';
  const cls = (args.match(/class:\s*['"]([^'"]+)['"]/) || [])[1] || '';
  const id = (args.match(/id:\s*['"]([^'"]+)['"]/) || [])[1] || '';
  return `<form method="post" action="${action}" accept-charset="UTF-8" class="${cls}"${id ? ` id="${id}"` : ''} data-form="${kind}">`;
}, '</form>');

engine.registerTag('paginate', {
  parse(token, remain) {
    this.args = token.args; this.tpls = [];
    const s = this.liquid.parser.parseStream(remain);
    s.on('tag:endpaginate', function () { this.stop(); }).on('template', (t) => this.tpls.push(t)).on('end', () => { throw new Error('paginate not closed'); });
    s.start();
  },
  *render(ctx, emitter) {
    ctx.push({ paginate: { pages: 1, current_page: 1, parts: [], items: 0 } });
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    ctx.pop();
  },
});

function buildSection(name, source) {
  const m = source.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/);
  const section = { id: name, settings: {}, blocks: [] };
  if (!m) return section;
  let schema;
  try { schema = JSON.parse(m[1]); } catch (e) { console.warn(`  ! ${name}: schema JSON: ${e.message}`); return section; }
  const defaults = (list) => Object.fromEntries((list || []).filter((s) => s.id).map((s) => [s.id, s.default !== undefined ? s.default : (s.type === 'checkbox' ? false : '')]));
  Object.assign(section.settings, defaults(schema.settings));
  const preset = (schema.presets || [])[0];
  if (preset) {
    Object.assign(section.settings, preset.settings || {});
    section.blocks = (preset.blocks || []).map((b, i) => ({
      id: `${name}-${i}`, type: b.type, shopify_attributes: '',
      settings: { ...defaults((schema.blocks || []).find((x) => x.type === b.type)?.settings), ...(b.settings || {}) },
    }));
  }
  section._schema = schema;
  return section;
}

/* Image pickers can't be filled locally, so templates may name a product image as
   "product:<handle>:<n>" or a raw URL. Shopify ignores those strings. */
const imageRef = (v) => {
  if (typeof v !== 'string' || !v) return null;
  const m = /^product:([^:]+):?(\d+)?$/.exec(v);
  if (m) { const p = P(m[1]); return p ? p.images[Number(m[2] || 1) - 1] || p.featured_image : null; }
  if (/^https?:/.test(v)) return { src: v, width: 1600, height: 1000, alt: '', aspect_ratio: 1.6 };
  return null;
};

async function renderSection(key, def, globals) {
  const file = path.join(THEME, 'sections', `${def.type}.liquid`);
  if (!fs.existsSync(file)) return `<!-- section ${def.type} missing -->`;
  const source = fs.readFileSync(file, 'utf8');
  const section = buildSection(def.type, source);
  if (def.settings) Object.assign(section.settings, def.settings);
  if (def.blocks) {
    const order = def.block_order || Object.keys(def.blocks);
    const blockDefs = section._schema?.blocks || [];
    section.blocks = order.map((bk, i) => {
      const b = def.blocks[bk];
      const d = Object.fromEntries((blockDefs.find((x) => x.type === b.type)?.settings || []).filter((s) => s.id).map((s) => [s.id, s.default ?? '']));
      return { id: `${key}-${i}`, type: b.type, settings: { ...d, ...(b.settings || {}) }, shopify_attributes: '' };
    });
  }
  const resolve = (defs, target) => {
    for (const d of defs || []) {
      const v = target[d.id];
      if (d.type === 'collection') target[d.id] = (typeof v === 'string' && collections[v]) || null;
      if (d.type === 'product') target[d.id] = (typeof v === 'string' && P(v)) || null;
      if (d.type === 'product_list') target[d.id] = Array.isArray(v) ? v.map(P).filter(Boolean) : [];
      if (d.type === 'link_list') target[d.id] = (typeof v === 'string' && linklists[v]) || null;
      if (d.type === 'image_picker') target[d.id] = imageRef(v);
    }
  };
  resolve(section._schema?.settings, section.settings);
  for (const b of section.blocks) resolve((section._schema?.blocks || []).find((x) => x.type === b.type)?.settings, b.settings);
  delete section._schema;
  section.id = key;
  const html = await engine.parseAndRender(source, { section }, { globals });
  return `<div id="shopify-section-${key}" class="shopify-section">${html}</div>`;
}

const settingsData = JSON.parse(fs.readFileSync(path.join(THEME, 'config/settings_data.json'), 'utf8'));
const groups = Object.fromEntries(['header-group', 'footer-group', 'overlay-group']
  .filter((g) => fs.existsSync(path.join(THEME, 'sections', `${g}.json`)))
  .map((g) => [g, JSON.parse(fs.readFileSync(path.join(THEME, 'sections', `${g}.json`), 'utf8'))]));
engine.registerTag('sections', {
  parse(token) { this.name = token.args.trim().replace(/^['"]|['"]$/g, ''); },
  *render(ctx, emitter) {
    const g = groups[this.name];
    if (!g) return;
    for (const key of g.order) {
      const html = yield renderSection(`${this.name}__${key}`, g.sections[key], ctx.globals || {});
      emitter.write(html);
    }
  },
});
engine.registerTag('section', {
  parse(token) { this.name = token.args.trim().replace(/^['"]|['"]$/g, ''); },
  *render(ctx, emitter) {
    const html = yield renderSection(this.name, { type: this.name }, ctx.globals || {});
    emitter.write(html);
  },
});

/* ------------------------------- globals ------------------------------ */
const pages = readJSON('data/pages.json');
const pagesGlobal = Object.fromEntries(Object.entries(pages).map(([h, d]) => [h, { title: d.title, handle: h, content: d.content || '', url: `/pages/${h}` }]));
const settings = { ...settingsData.current };
// Shopify returns objects for link_list / collection / product theme settings.
for (const group of JSON.parse(fs.readFileSync(path.join(THEME, 'config/settings_schema.json'), 'utf8'))) {
  for (const d of group.settings || []) {
    const v = settings[d.id];
    if (typeof v !== 'string' || !v) continue;
    if (d.type === 'link_list') settings[d.id] = linklists[v] || null;
    if (d.type === 'collection') settings[d.id] = collections[v] || null;
    if (d.type === 'product') settings[d.id] = P(v) || null;
  }
}
const routes = {
  root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', cart_change_url: '/cart/change', cart_update_url: '/cart/update',
  search_url: '/search', all_products_collection_url: '/collections/all', collections_url: '/collections',
  account_url: '/account', account_login_url: '/account/login', predictive_search_url: '/search/suggest',
};
const shop = { name: 'FABRIZO FASHION', email: 'shop@fabrizofashion.com', domain: 'fabrizofashion.com', url: `http://localhost:${PORT}`, currency: 'AED', money_format: 'AED {{amount}}', enabled_payment_types: ['visa', 'master', 'american_express', 'apple_pay', 'google_pay'] };
const localization = { country: { iso_code: 'AE', name: 'United Arab Emirates', currency: { iso_code: 'AED', symbol: 'د.إ' } }, language: { iso_code: 'en', endonym_name: 'English' }, available_languages: [{ iso_code: 'en', endonym_name: 'English' }, { iso_code: 'ar', endonym_name: 'العربية' }], available_countries: [] };

const collectionsList = Object.assign(Object.values(collections), collections);
function globalsFor(extra) {
  return {
    settings, routes, shop, cart, linklists, collections: collectionsList, localization, pages: pagesGlobal,
    all_products: Object.fromEntries(products.map((p) => [p.handle, p])),
    canonical_url: shop.url + (extra.path || '/'),
    request: { design_mode: false, page_type: extra.template.split(/[./]/)[0], path: extra.path || '/', host: 'localhost', locale: { iso_code: 'en' } },
    content_for_header: '', customer: null,
    ...extra,
    template: { name: extra.template.split(/[./]/)[0], suffix: extra.template.split(/[./]/)[1] || null },
  };
}

async function renderPage(req, res, { template, page_title, page_description, data = {} }) {
  const globals = globalsFor({ template, path: req.path, page_title, page_description, ...data });
  try {
    const jsonPath = path.join(THEME, 'templates', `${template}.json`);
    const cfg = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    let order = cfg.order || Object.keys(cfg.sections);
    if (req.query.only) order = order.filter((k) => k === req.query.only || cfg.sections[k]?.type === req.query.only);
    const parts = [];
    for (const key of order) if (cfg.sections[key] && !cfg.sections[key].disabled) parts.push(await renderSection(key, cfg.sections[key], globals));
    const layout = fs.readFileSync(path.join(THEME, 'layout/theme.liquid'), 'utf8');
    const html = await engine.parseAndRender(layout, { content_for_layout: parts.join('\n') }, { globals });
    res.set('content-type', 'text/html; charset=utf-8').send(html);
  } catch (err) {
    console.error(`\n[render ${template}]`, err.message);
    res.status(500).send(`<pre style="padding:2rem;white-space:pre-wrap"><b>Render error: ${template}</b>\n\n${String(err.stack || err.message).replace(/[<>]/g, (c) => ({ '<': '&lt;', '>': '&gt;' }[c]))}</pre>`);
  }
}
const notFound = (req, res) => { res.status(404); return renderPage(req, res, { template: '404', page_title: 'Page not found' }); };

/* -------------------------------- routes ------------------------------ */
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static(path.join(THEME, 'assets'), { maxAge: 0 }));

app.get('/', (req, res) => renderPage(req, res, { template: 'index', page_title: null, page_description: 'FABRIZO FASHION — anime, Arabic calligraphy and streetwear tees from Dubai.' }));

const SORTS = {
  'price-ascending': (a, b) => a.price - b.price, 'price-descending': (a, b) => b.price - a.price,
  'title-ascending': (a, b) => a.title.localeCompare(b.title), 'created-descending': (a, b) => b.created_at.localeCompare(a.created_at),
  'best-selling': () => 0, manual: () => 0,
};
app.get('/collections', (req, res) => renderPage(req, res, { template: 'list-collections', page_title: 'Collections' }));
app.get('/collections/:handle', (req, res) => {
  const c = collections[req.params.handle];
  if (!c) return notFound(req, res);
  const sort = String(req.query.sort_by || 'manual');
  const filtered = applyFilters(c.products, req.query);
  const collection = {
    ...c, sort_by: sort, default_sort_by: 'manual',
    sort_options: [['manual', 'Featured'], ['best-selling', 'Best selling'], ['created-descending', 'Newest'], ['price-ascending', 'Price, low to high'], ['price-descending', 'Price, high to low'], ['title-ascending', 'Alphabetically, A-Z']].map(([value, name]) => ({ value, name })),
    filters: buildFilters(c.products, req.query, req.path),
    products: [...filtered].sort(SORTS[sort] || SORTS.manual), products_count: filtered.length,
  };
  const template = c.template_suffix && fs.existsSync(path.join(THEME, 'templates', `collection.${c.template_suffix}.json`)) ? `collection.${c.template_suffix}` : 'collection';
  renderPage(req, res, { template, page_title: c.title, page_description: c.description.replace(/<[^>]+>/g, ''), data: { collection } });
});

app.get('/products/:handle', (req, res) => {
  const product = P(req.params.handle);
  if (!product) return notFound(req, res);
  const v = req.query.variant && product.variants.find((x) => String(x.id) === String(req.query.variant));
  const p = v ? { ...product, selected_variant: v, selected_or_first_available_variant: v } : product;
  renderPage(req, res, { template: 'product', page_title: product.title, page_description: product.description.replace(/<[^>]+>/g, '').slice(0, 160), data: { product: p } });
});


app.get('/pages/:handle', (req, res) => {
  const def = pages[req.params.handle];
  if (!def) return notFound(req, res);
  renderPage(req, res, { template: def.template || 'page', page_title: def.title, data: { page: { title: def.title, handle: req.params.handle, content: def.content || '' } } });
});

app.get('/cart', (req, res) => renderPage(req, res, { template: 'cart', page_title: 'Your bag' }));

const haystack = (p) => [p.title, p.type, ...p.tags, ...p._universes, ...p._characters, ...p.options_with_values.flatMap((o) => o.values)].join(' ').toLowerCase();
const searchFor = (q) => { const terms = q.toLowerCase().split(/\s+/).filter(Boolean); return terms.length ? products.filter((p) => terms.every((t) => haystack(p).includes(t))) : []; };
app.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim();
  const results = searchFor(q);
  renderPage(req, res, { template: 'search', page_title: q ? `Search: ${q}` : 'Search', data: { search: { terms: q, results, results_count: results.length, performed: !!q, filters: buildFilters(results, req.query, req.path) } } });
});
app.get('/search/suggest.json', (req, res) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  const found = q ? searchFor(q) : [];
  res.json({ resources: { results: {
    products: found.slice(0, 6).map((p) => ({ title: p.title, url: p.url, price: (p.price / 100).toFixed(2), compare_at_price_max: (p.compare_at_price_max / 100).toFixed(2), image: p.featured_image?.src ? `${p.featured_image.src}?width=200` : null, type: p.type })),
    collections: q ? Object.values(collections).filter((c) => c.title.toLowerCase().includes(q)).slice(0, 4).map((c) => ({ title: c.title, url: c.url })) : [],
    queries: q ? characters.concat(universes).filter((c) => c.title.toLowerCase().startsWith(q)).slice(0, 4).map((c) => ({ text: c.title, styled_text: c.title, url: `/search?q=${encodeURIComponent(c.title)}` })) : [],
  } } });
});

app.get('/products/:handle.js', (req, res) => { const p = P(req.params.handle); if (!p) return res.status(404).json({}); res.json(JSON.parse(JSON.stringify(p, (k, v) => (k.startsWith('_') || k === 'collections' ? undefined : v)))); });
app.get('/cart.js', (req, res) => res.json(cart));
app.post('/cart/add.js', (req, res) => {
  const items = req.body.items || [{ id: req.body.id, quantity: req.body.quantity || 1 }];
  const added = items.map((i) => addToCart(i.id, Number(i.quantity) || 1)).filter(Boolean);
  if (!added.length) return res.status(422).json({ status: 422, description: 'Variant not found' });
  res.json(added.length === 1 ? added[0] : { items: added });
});
app.post('/cart/change.js', (req, res) => { changeCart(req.body.id ?? req.body.line, Number(req.body.quantity)); res.json(cart); });
app.post('/cart/update.js', (req, res) => { if (typeof req.body.note === 'string') cart.note = req.body.note; res.json(cart); });
app.post('/cart/clear.js', (req, res) => { cart.items = []; recalc(); res.json(cart); });
app.post('/cart/add', (req, res) => { addToCart(req.body.id, Number(req.body.quantity) || 1); res.redirect('/cart'); });
app.post('/contact', (req, res) => res.redirect(`${(req.get('referer') || '/').split('#')[0]}#subscribed`));
app.get('/dev/images', (req, res) => {
  const wide = req.query.wide === '1';
  const rows = products.flatMap((p) => p.images.map((i, n) => ({ p, i, n: n + 1 }))).filter((x) => !wide || x.i.width / x.i.height > 1.05);
  res.send(`<!doctype html><style>body{font:11px sans-serif;margin:8px;display:grid;grid-template-columns:repeat(8,1fr);gap:6px}img{width:100%;height:150px;object-fit:cover;display:block}</style>${rows.map((x) => `<div><img loading=lazy src="${x.i.src}?width=300"><b>${x.p.handle.slice(0, 40)}:${x.n}</b> ${x.i.width}x${x.i.height}</div>`).join('')}`);
});
app.get('/account*', (req, res) => res.redirect('/pages/contact'));
app.use(notFound);

app.listen(PORT, () => {
  console.log(`\n  FABRIZO theme  ->  http://localhost:${PORT}`);
  console.log(`  ${products.length} products, ${Object.keys(collections).length} collections\n`);
});
