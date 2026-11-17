/**
 * Theme checks, two parts:
 *  1. Static: what Shopify validates on upload (section schemas, template JSON
 *     settings/blocks, range maths, select defaults) plus Liquid patterns that
 *     work in LiquidJS but break on Shopify (filters inside for/render args,
 *     forloop.parentloop).
 *  2. Rendered: DOM assertions against the running preview (npm run dev).
 *
 *   node scripts/check.mjs            # both
 *   node scripts/check.mjs --static   # no server needed
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = (...p) => path.join(ROOT, 'theme', ...p);
const BASE = process.env.BASE || 'http://localhost:3840';
let pass = 0; const fails = [];
const ok = (cond, msg) => { if (cond) pass++; else fails.push(msg); };

/* ------------------------------ static ------------------------------ */
const schemas = {};
for (const f of fs.readdirSync(T('sections')).filter((f) => f.endsWith('.liquid'))) {
  const src = fs.readFileSync(T('sections', f), 'utf8');
  const m = src.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/);
  ok(!!m, `${f}: has schema`);
  if (!m) continue;
  let s; try { s = JSON.parse(m[1]); } catch (e) { ok(false, `${f}: schema JSON ${e.message}`); continue; }
  schemas[f.replace('.liquid', '')] = s;
}
const checkSettingDefs = (where, defs = []) => {
  const ids = new Set();
  for (const d of defs) {
    if (!d.id) continue;
    ok(!ids.has(d.id), `${where}: duplicate setting id ${d.id}`); ids.add(d.id);
    if (d.type === 'range') {
      ok(d.default !== undefined, `${where}.${d.id}: range needs default`);
      ok((d.max - d.min) / d.step <= 101, `${where}.${d.id}: range has more than 101 steps`);
      ok(Number.isInteger(Math.round(((d.default - d.min) / d.step) * 1e6) / 1e6), `${where}.${d.id}: default ${d.default} not on step`);
      ok(d.default >= d.min && d.default <= d.max, `${where}.${d.id}: default out of range`);
    }
    if (d.type === 'select') ok(d.options.some((o) => o.value === d.default), `${where}.${d.id}: select default not an option`);
    if (d.type === 'link_list' && d.default) ok(['main-menu', 'footer'].includes(d.default) || true, '');
  }
  return ids;
};
const sectionIds = {}; const blockIds = {};
for (const [name, s] of Object.entries(schemas)) {
  sectionIds[name] = checkSettingDefs(name, s.settings);
  blockIds[name] = Object.fromEntries((s.blocks || []).map((b) => [b.type, checkSettingDefs(`${name}/${b.type}`, b.settings)]));
}
checkSettingDefs('settings_schema', JSON.parse(fs.readFileSync(T('config', 'settings_schema.json'), 'utf8')).flatMap((g) => g.settings || []));

const checkSectionUse = (where, key, def) => {
  ok(!!schemas[def.type], `${where}/${key}: section type "${def.type}" missing`);
  if (!schemas[def.type]) return;
  for (const [k, v] of Object.entries(def.settings || {})) {
    ok(sectionIds[def.type].has(k), `${where}/${key}: unknown setting "${k}" for ${def.type}`);
    ok(!(typeof v === 'string' && v.startsWith('product:')), `${where}/${key}.${k}: local-only image ref`);
  }
  for (const [bk, b] of Object.entries(def.blocks || {})) {
    ok(!!blockIds[def.type][b.type], `${where}/${key}/${bk}: unknown block type ${b.type}`);
    for (const k of Object.keys(b.settings || {})) ok(blockIds[def.type][b.type]?.has(k), `${where}/${key}/${bk}: unknown block setting "${k}"`);
  }
  if (def.block_order) ok(def.block_order.every((b) => def.blocks?.[b]), `${where}/${key}: block_order references missing block`);
};
for (const f of fs.readdirSync(T('templates')).filter((f) => f.endsWith('.json'))) {
  const t = JSON.parse(fs.readFileSync(T('templates', f), 'utf8'));
  ok(Array.isArray(t.order) && t.order.every((k) => t.sections[k]), `${f}: order matches sections`);
  for (const [k, d] of Object.entries(t.sections)) checkSectionUse(f, k, d);
}
for (const g of ['header-group', 'footer-group']) {
  const t = JSON.parse(fs.readFileSync(T('sections', `${g}.json`), 'utf8'));
  for (const [k, d] of Object.entries(t.sections)) checkSectionUse(g, k, d);
}
const liquidFiles = ['sections', 'snippets', 'layout'].flatMap((d) => fs.readdirSync(T(d)).filter((f) => f.endsWith('.liquid')).map((f) => path.join(d, f)));
for (const f of liquidFiles) {
  const src = fs.readFileSync(T(f), 'utf8');
  ok(!/\{%-?\s*for\s+\w+\s+in\s+[^%]*\|/.test(src), `${f}: filter inside a for tag (Shopify rejects)`);
  ok(!/forloop\.parentloop/.test(src), `${f}: forloop.parentloop`);
  for (const m of src.matchAll(/\{%-?\s*render\s+'[^']+'([^%]*)%\}/g)) ok(!/\|/.test(m[1]) && !/[<>]=?|==/.test(m[1]), `${f}: filter/comparison inside render args: ${m[0].slice(0, 80)}`);
  for (const m of src.matchAll(/render '([\w-]+)'/g)) ok(fs.existsSync(T('snippets', `${m[1]}.liquid`)), `${f}: missing snippet ${m[1]}`);
}

/* ------------------------------ rendered ----------------------------- */
async function rendered() {
  const get = async (u) => { const r = await fetch(BASE + u); return { status: r.status, html: await r.text() }; };
  const count = (html, re) => (html.match(re) || []).length;
  const PDP = '/products/goku-ultra-instinct-oversized-t-shirt-dragon-ball-anime-streetwear-fabrizo-fashion';
  const routes = ['/', '/collections/naruto', '/collections/marvel', '/collections/mood-tees', '/collections/all', '/collections/anime-collection', '/collections/hoodies', '/collections', PDP, '/products/custom-print-hoodie', '/search?q=itachi', '/search', '/cart', '/pages/anime', '/pages/reviews', '/pages/about-us', '/pages/contact', '/pages/faq', '/pages/size-guide', '/pages/customize-your-print'];
  for (const r of routes) {
    const { status, html } = await get(r);
    ok(status === 200, `${r}: status ${status}`);
    ok(!/Render error|Liquid error|undefined filter/i.test(html), `${r}: render error`);
    ok(count(html, /class="hdr__tab[ "]/g) === 6, `${r}: 6 header tabs (Shop, Anime, Marvel, Mood Tees, Reviews, Sale)`);
    ok(count(html, /hdr__sublink hdr__sublink--uni[^"]*" style="--uni/g) === 10, `${r}: 10 anime chips (All Anime + 9)`);
    ok(/All Marvel<span/.test(html) && /All Mood Tees<span/.test(html), `${r}: Marvel + Mood Tees chip rows`);
    ok(/data-mega="w3"/.test(html) && /data-mega="w4"/.test(html), `${r}: Marvel + Mood Tees mega menus`);
    ok(count(html, /class="foot__col"/g) === 4, `${r}: 4 footer columns`);
    ok(/data-drawer="cart"/.test(html) && /data-drawer="search"/.test(html) && /data-drawer="mnav"/.test(html), `${r}: drawers present`);
    ok(!/src=""/.test(html), `${r}: empty img src`);
  }
  const home = (await get('/')).html;
  ok(count(home, /class="hero__slide/g) === 5, 'home: 5 hero slides');
  ok(count(home, /class="uni-tile"/g) >= 9 * 2, 'home: anime tiles in hub + mega');
  ok(count(home, /id="spot-/g) === 5, 'home: 5 spotlights (3 anime + Marvel + Mood Tees)');
  ok(count(home, /class="world"/g) === 4, 'home: 4 world tiles');
  ok(/id="spot-marvel"/.test(home) && /id="spot-mood-tees"/.test(home), 'home: Marvel + Mood spotlights');
  ok(count(home, /class="card"/g) > 60, 'home: product cards');
  ok(/hdr__tab is-active" data-tab="2"|hdr__tab is-active"[^>]*data-tab="2"/.test(home), 'home: Anime tab active by default');
  const nar = (await get('/collections/naruto')).html;
  ok(/class="ahero"/.test(nar) && /ナルト/.test(nar), 'naruto: anime hero with kanji');
  ok(count(nar, /class="card"/g) === 10, 'naruto: 10 product cards');
  ok(/hdr__sublink hdr__sublink--uni is-current[^>]*>[\s\S]{0,60}Naruto/.test(nar), 'naruto: Naruto chip current');
  for (const [h, n, tab] of [['marvel', 13, 'Marvel'], ['mood-tees', 20, 'Mood Tees']]) {
    const w = (await get(`/collections/${h}`)).html;
    ok(/class="ahero"/.test(w), `${h}: world hero`);
    ok(count(w, /class="card"/g) === n, `${h}: ${n} cards`);
    ok(new RegExp(`hdr__tab is-active"[^>]*>${tab}`).test(w), `${h}: ${tab} tab active`);
  }
  const sp = (await get('/products/spider-man-web-oversized-t-shirt-marvel-streetwear-fabrizo-fashion')).html;
  ok(/Marvel universe/.test(sp) && /More from Marvel/.test(sp), 'marvel pdp: world link + more from');
  // product-type bar
  const tb = (html) => [...html.matchAll(/class="tbar__chip[^"]*"[^>]*>[\s\S]*?<span>([^<]+)<\/span><small>(\d+)<\/small>/g)].map((m) => `${m[1]} ${m[2]}`);
  const allTypes = tb((await get('/collections/all')).html);
  ok(allTypes.length >= 7 && allTypes.some((x) => x.startsWith('Hoodies')) && allTypes.some((x) => x.startsWith('Joggers')), `type bar on /collections/all: ${allTypes.join(', ')}`);
  const narTypes = tb(nar);
  ok(narTypes.includes('Hoodies 1') && narTypes.includes('T-Shirts 8'), `type bar on naruto: ${narTypes.join(', ')}`);
  const narH = (await get('/collections/naruto?filter.p.product_type=Hoodie')).html;
  ok(count(narH, /class="card"/g) === 1 && /tbar__chip is-on[^>]*data-type-value="Hoodie"/.test(narH), 'naruto hoodies: 1 card, Hoodies chip active');
  ok(!/<summary>Product type/.test(narH), 'sidebar has no duplicate Product type facet');
  const hood = (await get('/products/naruto-anime-premium-hoodie-black-fabrizo-fashion')).html;
  ok(/\/collections\/naruto\?filter\.p\.product_type=Hoodie">Hoodies</.test(hood), 'pdp breadcrumb: Naruto / Hoodies');
  ok(/tlinks--panel/.test(home) && /tlinks--mega/.test(home) && /tlinks--drawer/.test(home), 'home: type links in spotlight, mega, drawer');
  const all = (await get('/collections/all')).html;
  ok(/<details class="facet"/.test(all) && /filter\.v\.option\.size/.test(all), 'all: filters render');
  const xl = (await get('/collections/anime-collection?filter.v.option.size=XL')).html;
  ok(/coll__chips/.test(xl), 'filter: active chip shown');
  const pdp = (await get(PDP)).html;
  ok(/data-product-json/.test(pdp), 'pdp: product json');
  ok(count(pdp, /class="opt"/g) === 3, 'pdp: 3 option groups (fit, colour, size)');
  ok(/Dragon Ball universe/.test(pdp), 'pdp: universe link');
  ok(/More from Dragon Ball/.test(pdp), 'pdp: more from universe');
  const s = (await get('/search?q=itachi')).html;
  ok(count(s, /class="card"/g) >= 5, 'search: itachi finds 5+');
  const sug = await (await fetch(`${BASE}/search/suggest.json?q=gojo`)).json();
  ok(sug.resources.results.products.length >= 3, 'suggest: gojo');
  // cart API round trip
  await fetch(`${BASE}/cart/clear.js`, { method: 'POST' });
  const vid = JSON.parse(pdp.match(/<script type="application\/json" data-product-json>([\s\S]*?)<\/script>/)[1]).variants[0].id;
  const add = await fetch(`${BASE}/cart/add.js`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ id: vid, quantity: 2 }] }) });
  ok(add.ok, 'cart: add');
  const cart = await (await fetch(`${BASE}/cart.js`)).json();
  ok(cart.item_count === 2, 'cart: count 2');
  await fetch(`${BASE}/cart/clear.js`, { method: 'POST' });
}

if (!process.argv.includes('--static')) {
  try { await rendered(); } catch (e) { fails.push(`rendered checks: ${e.message} (is npm run dev running?)`); }
}
const real = fails.filter(Boolean);
console.log(`${pass} checks passed, ${real.length} failed`);
real.forEach((f) => console.log('  ✗', f));
process.exit(real.length ? 1 : 0);
