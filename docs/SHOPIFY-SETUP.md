# FABRIZO theme — going live on Shopify

The theme is in `theme/`. Upload it as an **unpublished** theme, set up the items below, preview, then publish.

## 1. Upload

- **Zip:** upload `fabrizo-theme.zip` in Online Store › Themes › Add theme › Upload zip file.
- **CLI:** run `npm run shopify:push`. This needs the Shopify CLI and a staff login, and pushes unpublished.

## 2. Anime collections (the core of the new navigation)

Create one **smart collection** per anime. Each one uses "Product title contains" conditions, with **any condition** matching:

| Collection handle | Title contains (any) |
|---|---|
| `naruto` | Naruto, Itachi, Uchiha, Minato, Nine-Tails, Kakashi, Sasuke, Akatsuki, Trust The Process |
| `jujutsu-kaisen` | Sukuna, Gojo, Satoru, Jujutsu, Maki Zen, Megumi, Itadori, King of Curses |
| `one-piece` | One Piece, Luffy, Zoro, Roronoa, King of Hell |
| `dragon-ball` | Goku, Dragon Ball, Saiyan, Vegeta, Ultra Instinct |
| `demon-slayer` | Demon Slayer, Zenitsu, Tanjiro, Tomioka, Giyu, Nezuko, Sun Breathing, First to Breathe |
| `attack-on-titan` | Attack on Titan, Levi, Eren |
| `bleach` | Bleach, Ichigo |
| `blue-lock` | Blue Lock, Bachira |
| `tokyo-revengers` | TKR, Tokyo Revengers |

For each one, set the template to **collection.anime**. That gives it the coloured anime header.

Optional collection metafields (namespace `fabrizo`) override the built-in look:
- `accent` (colour)
- `kanji` (single line text)
- `tagline` (single line text)
- `characters` (list of single line text)

Without them, the theme uses its built-in colours and Japanese titles for these 9 anime.

Also create these collections:
- `sale`: compare-at price is greater than 0.
- `t-shirts` and `oversized`: used by the menus and home page.
- `custom-print`: product type = Custom Print.

The existing collections keep their current handles.

## 3. Menus (Online Store › Navigation)

| Menu handle | Contents |
|---|---|
| `main-menu` | Top level = header tabs (Shop, Anime, Reviews, Sale). Second level = the row under the tabs. Third level = hover mega menu. Put the 9 anime collections (plus "All Anime" → `anime-collection`) under **Anime**. |
| `anime` | The 9 anime collections in the order you want them shown. **This one menu drives the whole anime system**: tab chips, mega menu, "Pick your anime", card badges, "More from …", the filter sidebar and the mobile menu. To add a new anime, create its collection and add it here. |
| `anime-characters` | One link per character → `/search?q=Itachi&type=product` (Itachi, Sukuna, Gojo, Zoro, Goku, Naruto, Luffy, Minato, Zenitsu, Giyu, Levi, Maki, Ichigo, Bachira). |
| `footer-help`, `footer-shop`, `footer-anime`, `footer-fabrizo` | The four footer columns. |

The exact link lists used in the preview are in `data/menus.json`.

## 4. Pages

Create these pages and set each one's template:

| Page | Template |
|---|---|
| `anime` | page.anime (Anime hub) |
| `reviews` | page.reviews |
| `about-us` | page.about |
| `contact` | page.contact |
| `faq` | page.faq |
| `size-guide` | page.size-guide |
| `customize-your-print` | page.custom-print |

**Put the real size chart in the `size-guide` page content.** Every product's "Size guide" drawer shows it.

## 5. "Anime" filter on collection pages (optional, recommended)

1. Create a product metafield `fabrizo.universe` (single line text).
2. Fill it per product (e.g. "Naruto"). Bulk edit or a CSV works.
3. In the Search & Discovery app, add it as a filter.

The other filters need no setup: Availability, Fit, Size, Color and Product type.

## 6. Theme settings to check before publishing

- **Offers & delivery:** the "Buy 3 get 1 / Buy 5 get 2" box is **display only**. Either create the matching automatic discount in Discounts, or switch it off. Also check the free-delivery threshold (AED 99), the delivery promise, and Tabby (off by default; only turn it on if Tabby is installed).
- **Contact & social:** add the WhatsApp number. This turns on "Order on WhatsApp" and the footer button.
- **Header:** upload a wide logo if you want the FAB mark instead of the wordmark.

## 7. Content still to replace

See `docs/BEFORE-LAUNCH.md`.
