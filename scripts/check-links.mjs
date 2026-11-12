// Checks every link in the built site.
//   node scripts/check-links.mjs             internal links and #anchors only (no network)
//   node scripts/check-links.mjs --external  also requests each outside URL once

import { readFile, readdir, access } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const external = process.argv.includes('--external');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const exists = (p) => access(p).then(() => true, () => false);

const pages = (await walk(DIST)).filter((p) => p.endsWith('.html'));
const idsByFile = new Map();
const outside = new Map();
const broken = [];
let internal = 0;

for (const page of pages) {
  const html = await readFile(page, 'utf8');
  idsByFile.set(page, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
}

for (const page of pages) {
  const html = await readFile(page, 'utf8');
  const from = '/' + relative(DIST, page).split(sep).join('/').replace(/index\.html$/, '');
  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    const href = m[1].replace(/&amp;/g, '&');
    if (/^(mailto:|tel:)/.test(href)) continue;
    if (/^https?:\/\//.test(href)) {
      if (!outside.has(href)) outside.set(href, from);
      continue;
    }
    internal += 1;
    const [path, hash] = href.split('#');
    let file = page;
    if (path) {
      const clean = decodeURIComponent(path);
      file = join(DIST, clean.endsWith('/') ? clean + 'index.html' : clean);
      if (!(await exists(file))) {
        broken.push(`${from} -> ${href} (no such page)`);
        continue;
      }
    }
    if (hash && file.endsWith('.html') && !idsByFile.get(file)?.has(hash)) {
      broken.push(`${from} -> ${href} (no element with that id)`);
    }
  }
}

console.log(`${pages.length} pages, ${internal} internal links, ${outside.size} distinct outside links`);

if (external) {
  const urls = [...outside.keys()];
  let next = 0;
  const failures = [];
  const skipped = [];
  async function worker() {
    while (next < urls.length) {
      const url = urls[next++];
      // These hosts refuse automated requests, so a failure says nothing about the link.
      if (/^https:\/\/(x\.com|discord\.gg)\//.test(url)) {
        skipped.push(url);
        continue;
      }
      try {
        const res = await fetch(url.split('#')[0], {
          redirect: 'follow',
          headers: { 'User-Agent': 'link-check' },
          signal: AbortSignal.timeout(20000),
        });
        // Release downloads answer with a redirect to storage; any 2xx after following is fine.
        if (!res.ok) failures.push(`${res.status} ${url} (linked from ${outside.get(url)})`);
        await res.body?.cancel();
      } catch (err) {
        failures.push(`${err.name} ${url} (linked from ${outside.get(url)})`);
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  console.log(`outside links requested: ${urls.length - skipped.length}, not requested: ${skipped.length} (${skipped.join(', ')})`);
  broken.push(...failures);
}

if (broken.length) {
  console.error(`\n${broken.length} broken:\n  ` + broken.join('\n  '));
  process.exit(1);
}
console.log('no broken links');
