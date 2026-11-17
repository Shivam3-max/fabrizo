/**
 * Turns the live store export (data/fab-raw.json, pulled from fabrizofashion.com
 * /products.json + /collections.json) into data/catalog.json for the local harness.
 *
 * It also works out which anime universe and character each product belongs to.
 * On the real store that grouping lives in smart collections (see docs/SHOPIFY-SETUP.md);
 * the regexes below are the same rules written as code so the preview matches.
 *
 *   node scripts/build-catalog.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { universes, characters } from '../data/universes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/fab-raw.json'), 'utf8'));

const SKIP_TYPES = /snap cart|rapid cart/i;
const SKIP_TITLES = /^(gift wrapping|shipping protection)$/i;

/* Garment type from the title. The live store's product_type is blank on most
   products, so the preview uses this; docs/GARMENT-TYPES.md lists the fix. */
export const garment = (p) => {
  const t = p.title.toLowerCase();
  if (p.product_type === 'Custom Print' || /custom print/.test(t)) return 'Custom Print';
  if (/hoodie/.test(t)) return 'Hoodie';
  if (/\bset\b|tracksuit|co-ord/.test(t) && !/reset|t-shirt set|tee set/.test(t)) return 'Set';
  if (/jogger/.test(t)) return 'Joggers';
  if (/shorts/.test(t)) return 'Shorts';
  if (/polo/.test(t)) return 'Polo';
  return 'T-Shirt';
};

const text = (p) => `${p.title} ${p.tags.join(' ')}`.toLowerCase();
const strip = (html) => String(html || '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');

const members = raw.members || {};
const products = raw.products
  .filter((p) => !SKIP_TYPES.test(p.product_type) && !SKIP_TITLES.test(p.title.trim()))
  .map((p) => {
    const t = text(p);
    const uni = universes.filter((u) => new RegExp(u.match, 'i').test(t)).map((u) => u.handle);
    const chars = characters.filter((c) => new RegExp(c.match, 'i').test(t)).map((c) => c.handle);
    const inCols = Object.entries(members).filter(([, list]) => list.includes(p.handle)).map(([h]) => h);
    return {
      id: p.id,
      handle: p.handle,
      title: p.title.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(),
      body_html: strip(p.body_html).slice(0, 4000),
      vendor: p.vendor,
      type: garment(p),
      store_type: p.product_type || '',
      tags: p.tags,
      created_at: p.created_at,
      options: p.options.map((o) => ({ name: o.name.trim(), values: o.values })),
      variants: p.variants.map((v) => ({
        id: v.id, title: v.title, option1: v.option1, option2: v.option2, option3: v.option3,
        price: v.price, compare_at_price: v.compare_at_price, available: v.available,
        image: v.featured_image ? v.featured_image.src : null,
      })),
      images: p.images.slice(0, 10).map((i) => ({ src: i.src.split('?')[0], width: i.width, height: i.height, alt: i.alt || '' })),
      universes: uni,
      characters: chars,
      collections: inCols,
    };
  });

const collections = raw.collections.map((c) => ({
  handle: c.handle, title: c.title, description: c.description || '',
  image: c.image ? c.image.src.split('?')[0] : null,
}));

fs.writeFileSync(path.join(ROOT, 'data/catalog.json'), JSON.stringify({ products, collections }, null, 0));

const count = (h) => products.filter((p) => p.universes.includes(h)).length;
console.log(`${products.length} products, ${collections.length} store collections`);
console.log(universes.map((u) => `${u.title}: ${count(u.handle)}`).join(' · '));
console.log(characters.map((c) => `${c.title}: ${products.filter((p) => p.characters.includes(c.handle)).length}`).join(' · '));
