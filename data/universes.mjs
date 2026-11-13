/**
 * Anime universes and characters that FABRIZO currently sells.
 *
 * `match` is the rule used to put a product in the universe. On Shopify each
 * universe is a smart collection with the same words as "Title contains" OR
 * conditions (docs/SHOPIFY-SETUP.md lists them). `accent` and `kanji` become
 * collection metafields fabrizo.accent / fabrizo.kanji.
 */
export const universes = [
  { handle: 'naruto', title: 'Naruto', kanji: 'ナルト', accent: '#f26b1d', match: '\\bnaruto\\b|itachi|uchiha|minato|nine-tails|kakashi|sasuke|akatsuki|madara|hokage|trust the process', line: 'Hidden Leaf legends. Itachi, Minato and the Nine-Tails.' },
  { handle: 'jujutsu-kaisen', title: 'Jujutsu Kaisen', kanji: '呪術廻戦', accent: '#6b2fd6', match: 'sukuna|gojo|satoru|jujutsu|maki zen|megumi|itadori|king of curses', line: 'Sukuna, Gojo and the cursed-energy drops.' },
  { handle: 'one-piece', title: 'One Piece', kanji: 'ワンピース', accent: '#d62828', match: 'one piece|luffy|\\bzoro\\b|roronoa|shanks|king of hell', line: 'Straw Hat crew. Luffy, Zoro and the Pirate King.' },
  { handle: 'dragon-ball', title: 'Dragon Ball', kanji: 'ドラゴンボール', accent: '#f5a300', match: 'goku|dragon ball|saiyan|vegeta|ultra instinct', line: 'Ultra Instinct, Super Saiyan Blue, pure power.' },
  { handle: 'demon-slayer', title: 'Demon Slayer', kanji: '鬼滅の刃', accent: '#1f8a70', match: 'demon slayer|zenitsu|tanjiro|tomioka|giyu|nezuko|sun breathing|first to breathe|rengoku', line: 'Breathing styles. Zenitsu, Giyu and the Sun.' },
  { handle: 'attack-on-titan', title: 'Attack on Titan', kanji: '進撃の巨人', accent: '#7a5c3a', match: 'attack on titan|\\blevi\\b|\\beren\\b|survey corps', line: 'Survey Corps. Levi Ackerman, humanity’s strongest.' },
  { handle: 'bleach', title: 'Bleach', kanji: 'ブリーチ', accent: '#3b3b3b', match: '\\bbleach\\b|ichigo|kurosaki', line: 'Soul Reapers. Ichigo Kurosaki.' },
  { handle: 'blue-lock', title: 'Blue Lock', kanji: 'ブルーロック', accent: '#1d4ed8', match: 'blue lock|bachira|isagi', line: 'Ego first. Meguru Bachira.' },
  { handle: 'tokyo-revengers', title: 'Tokyo Revengers', kanji: '東京卍リベンジャーズ', accent: '#e11d74', match: '\\btkr\\b|tokyo revengers|\\bmikey\\b', line: 'Toman racing drift.' },
];

export const characters = [
  { handle: 'itachi', title: 'Itachi', universe: 'naruto', match: 'itachi' },
  { handle: 'naruto-uzumaki', title: 'Naruto', universe: 'naruto', match: '\\bnaruto\\b.*(nine-tails|believe|trust)|nine-tails|believe it|naruto anime premium hoodie' },
  { handle: 'minato', title: 'Minato', universe: 'naruto', match: 'minato' },
  { handle: 'sukuna', title: 'Sukuna', universe: 'jujutsu-kaisen', match: 'sukuna' },
  { handle: 'gojo', title: 'Gojo', universe: 'jujutsu-kaisen', match: 'gojo' },
  { handle: 'maki', title: 'Maki', universe: 'jujutsu-kaisen', match: 'maki zen' },
  { handle: 'zoro', title: 'Zoro', universe: 'one-piece', match: '\\bzoro\\b|king of hell' },
  { handle: 'luffy', title: 'Luffy', universe: 'one-piece', match: 'luffy|pirate king' },
  { handle: 'goku', title: 'Goku', universe: 'dragon-ball', match: 'goku|ultra instinct' },
  { handle: 'zenitsu', title: 'Zenitsu', universe: 'demon-slayer', match: 'zenitsu' },
  { handle: 'giyu', title: 'Giyu', universe: 'demon-slayer', match: 'tomioka|giyu' },
  { handle: 'levi', title: 'Levi', universe: 'attack-on-titan', match: '\\blevi\\b' },
  { handle: 'ichigo', title: 'Ichigo', universe: 'bleach', match: 'ichigo' },
  { handle: 'bachira', title: 'Bachira', universe: 'blue-lock', match: 'bachira' },
];
