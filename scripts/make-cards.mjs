// Makes the preview cards (1200 x 630 PNG) that X, Discord and others show when a page is shared.
// Usage: node scripts/make-cards.mjs
// Needs Microsoft Edge or Google Chrome (set BROWSER to its path if it is not found). Writes public/cards/<slug>.png.
// The cards carry no version or date, so a new release never makes one stale. Run this again when a
// program's name, tagline or fact changes, or a program is added.

import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ledger, products } from '../src/data/products.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, 'public', 'cards');
const work = join(root, 'node_modules', '.cards');

const browser = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => p && existsSync(p));
if (!browser) throw new Error('No Edge or Chrome found. Set BROWSER to its path.');

// Fonts go in as data URIs: a page opened from disk may not load fonts from disk.
const font = (path) =>
  `data:font/woff2;base64,${readFileSync(join(root, 'node_modules', path)).toString('base64')}`;
const archivo = font('@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2');
const martian = font('@fontsource-variable/martian-mono/files/martian-mono-latin-wdth-normal.woff2');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const MARK = `<svg viewBox="370 303 534 479" aria-hidden="true"><defs>
<linearGradient id="b" gradientUnits="userSpaceOnUse" x1="378" y1="311" x2="896" y2="586"><stop offset="0" stop-color="#0066FA"/><stop offset=".45" stop-color="#0092F2"/><stop offset=".75" stop-color="#0DBFE1"/><stop offset="1" stop-color="#20E090"/></linearGradient>
<linearGradient id="s" gradientUnits="userSpaceOnUse" x1="491" y1="422" x2="560" y2="774"><stop offset="0" stop-color="#0A84FF"/><stop offset=".6" stop-color="#0090DC"/><stop offset="1" stop-color="#18D9A8"/></linearGradient></defs>
<path fill="url(#b)" d="M378 311H758.5A137.5 137.5 0 0 1 758.5 586H552L675 502H759.5A56.5 56.5 0 0 0 759.5 389L466 393Z"/>
<path fill="#02131c" opacity=".5" d="M766 389C800 392 846 426 861 470L815 462C818 428 801 396 766 389Z"/>
<path fill="#0A6DB3" d="M500 621L552 586H588V621Z"/>
<path fill="url(#s)" d="M491 422L620 494C575 535 530 580 500 621H588V698L491 774Z"/></svg>`;
const FLAT = `<svg viewBox="370 303 534 479" aria-hidden="true" fill="currentColor"><path d="M378 311H758.5A137.5 137.5 0 0 1 758.5 586H552L675 502H759.5A56.5 56.5 0 0 0 759.5 389L466 393Z"/><path d="M491 422L620 494C575 535 530 580 500 621L552 586H588V698L491 774Z"/></svg>`;

function page({ title, line, fact, strikes, url, chip }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Archivo;src:url(${archivo}) format('woff2');font-weight:100 900;font-stretch:62% 125%}
@font-face{font-family:'Martian Mono';src:url(${martian}) format('woff2');font-weight:100 800;font-stretch:75% 112.5%}
html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#050607;color:#eef2f4}
body{position:relative;font-family:Archivo,sans-serif}
.emboss{position:absolute;right:-110px;top:-70px;width:640px;color:#0d1114}
.brand{position:absolute;left:72px;top:60px;display:flex;align-items:center;gap:16px}
.brand svg{width:46px;display:block}
.brand span{font-stretch:125%;font-weight:800;letter-spacing:.16em;font-size:21px}
.main{position:absolute;left:72px;right:72px;top:178px}
h1{margin:0;font-stretch:125%;font-weight:800;font-size:${title.length > 11 ? 100 : 116}px;letter-spacing:-.03em;line-height:.92}
.line{margin:30px 0 0;font-size:34px;line-height:1.3;color:#8b969e;max-width:940px}
.fact{margin:20px 0 0;font-family:'Martian Mono';font-stretch:87.5%;font-size:25px;font-weight:600;color:#2be38a}
.strikes{display:flex;flex-wrap:wrap;gap:6px 28px;margin-top:34px;max-width:1060px}
.strikes span{position:relative;font-stretch:125%;font-weight:800;font-size:33px;color:#66717a}
.strikes span::after{content:'';position:absolute;left:-4px;right:-4px;top:52%;height:4px;background:#2be38a}
.foot{position:absolute;left:72px;right:72px;bottom:52px;display:flex;justify-content:space-between;align-items:center;font-family:'Martian Mono';font-stretch:87.5%;font-size:21px;color:#8b969e}
.chip{background:#2be38a;color:#03130a;font-weight:700;padding:13px 22px;clip-path:polygon(0 0,100% 0,100% calc(100% - 11px),calc(100% - 11px) 100%,0 100%)}
</style></head><body>
<div class="emboss">${FLAT}</div>
<div class="brand">${MARK}<span>PURETECH</span></div>
<div class="main">
<h1>${esc(title)}</h1>
${line ? `<p class="line">${esc(line)}</p>` : ''}
${fact ? `<p class="fact">${esc(fact)}</p>` : ''}
${strikes ? `<div class="strikes">${strikes.map((s) => `<span>${esc(s)}</span>`).join('')}</div>` : ''}
</div>
<div class="foot"><span>${esc(url)}</span>${chip ? `<span class="chip">${esc(chip)}</span>` : ''}</div>
</body></html>`;
}

const cards = [
  {
    slug: 'home',
    title: 'Nothing extra.',
    // The first words of the home page.
    line: 'Independent software for Windows.',
    strikes: ledger.map((l) => l.name),
    url: 'puretechteam.github.io',
  },
  ...products
    .filter((p) => p.page)
    .map((p) => ({
      slug: p.slug,
      title: p.name,
      line: p.tagline,
      fact: p.fact,
      url: `puretechteam.github.io/software/${p.slug}`,
      chip: 'Free for Windows',
    })),
];

mkdirSync(out, { recursive: true });
mkdirSync(work, { recursive: true });
for (const card of cards) {
  const html = join(work, `${card.slug}.html`);
  const png = join(out, `${card.slug}.png`);
  writeFileSync(html, page(card));
  const r = spawnSync(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--virtual-time-budget=3000',
      `--user-data-dir=${join(work, 'profile')}`,
      '--window-size=1200,630',
      `--screenshot=${png}`,
      pathToFileURL(html).href,
    ],
    { encoding: 'utf8' },
  );
  if (!existsSync(png)) throw new Error(`no card for ${card.slug}: ${r.stderr}`);
  console.log(`${card.slug.padEnd(14)} ${(statSync(png).size / 1000).toFixed(1)} KB`);
}
rmSync(work, { recursive: true, force: true });
