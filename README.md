# FABRIZO — custom Shopify theme

A custom Online Store 2.0 theme for fabrizofashion.com. It is laid out like teeser.ae: Montserrat 600 uppercase headings, Italiana and Libre Baskerville italic for editorial blocks, ink #0a0a0a, red #c40500, square corners, and the same section order.

It adds anime-first navigation:
- An **Anime** tab whose row turns into colour-coded anime chips with design counts.
- An anime mega menu with universe tiles and character shortcuts.
- A "Pick your anime" hub and one-anime spotlight blocks (Naruto, Jujutsu Kaisen, One Piece…).
- Per-anime collection pages with a coloured hero and Japanese title.
- Universe badges on every card.
- "More from Naruto" on product pages.
- Character search shortcuts.

## Commands

```
npm run dev       # local preview with the real FABRIZO catalogue → http://localhost:3840
npm run check     # 1,588 static + rendered checks (needs dev running; --static works without it)
npm run catalog   # rebuild data/catalog.json from data/fab-raw.json
```

## Folders

- `theme/` is the uploadable theme.
- `dev/server.mjs` is a local Shopify emulator (Express + LiquidJS).
- `data/` holds the store export (150 products) and the menus and pages used by the preview.
- `docs/SHOPIFY-SETUP.md` covers collections, menus, pages and settings for going live.
- `docs/BEFORE-LAUNCH.md` lists placeholders and store-data fixes.

Product images in the preview come straight from FABRIZO's Shopify CDN, so they need an internet connection.

`node_modules` is a symlink to `../femzou-store/node_modules` (same two packages) because the disk is nearly full. Run `npm i` here if that folder moves.
