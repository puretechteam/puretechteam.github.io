// Runs after `astro build`. For every built page it adds up what a browser
// would load, writes those numbers into the page's footer, and fails the
// build if a budget is broken. Text files are counted gzipped, as served.

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

export const BUDGET = {
  homeBytes: 200_000,
  scriptBytes: 10_000,
  thirdParty: 0,
};

const TEXT = /\.(html|css|js|mjs|svg|json|xml|txt)$/i;

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

function transferSize(path, buf) {
  return TEXT.test(path) ? gzipSync(buf).length : buf.length;
}

/** URLs a page loads by itself: styles, scripts, icons, preloads and images. Links to other pages are not loads. */
export function resourcesOf(html) {
  const urls = new Set();
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/rel=["']?(stylesheet|preload|modulepreload|icon)/i.test(tag)) continue;
    const href = tag.match(/href=["']([^"']+)["']/i);
    if (href) urls.add(href[1]);
  }
  for (const m of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)) urls.add(m[1]);
  for (const m of html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) urls.add(m[1]);
  return [...urls];
}

export function isThirdParty(url) {
  return /^(https?:)?\/\//i.test(url);
}

function inlineScriptBytes(html) {
  let n = 0;
  for (const m of html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) n += Buffer.byteLength(m[1]);
  return n;
}

function kb(bytes) {
  return `${(bytes / 1000).toFixed(1)} KB`;
}

async function measure(htmlPath) {
  const html = await readFile(htmlPath, 'utf8');
  const urls = resourcesOf(html);
  const third = urls.filter(isThirdParty);
  let bytes = transferSize(htmlPath, Buffer.from(html));
  let script = inlineScriptBytes(html);
  let requests = 1;
  const seen = new Set();

  const add = async (url) => {
    if (isThirdParty(url) || url.startsWith('data:')) return;
    const file = join(DIST, decodeURIComponent(url.split(/[?#]/)[0]));
    if (seen.has(file)) return;
    seen.add(file);
    const buf = await readFile(file);
    bytes += transferSize(file, buf);
    requests += 1;
    if (/\.m?js$/i.test(file)) script += buf.length;
    if (/\.css$/i.test(file)) {
      for (const m of buf.toString('utf8').matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
        if (!m[1].startsWith('data:')) await add(m[1]);
      }
    }
  };
  for (const url of urls) await add(url);

  const usesCookies = /document\.cookie/.test(html);
  return { bytes, requests, third: third.length, script, usesCookies };
}

function fill(html, r) {
  const set = (key, text) => {
    html = html.replace(new RegExp(`(data-m="${key}"[^>]*>)[^<]*(<)`), `$1${text}$2`);
  };
  set('weight', `${kb(r.bytes)} to load`);
  set('requests', String(r.requests));
  set('third', String(r.third));
  set('script', r.script === 0 ? 'none' : kb(r.script));
  set('cookies', r.usesCookies || r.third > 0 ? 'check failed' : 'none');
  return html;
}

async function main() {
  const pages = (await walk(DIST)).filter((p) => p.endsWith('.html'));
  const problems = [];
  console.log('\npage'.padEnd(34) + 'load'.padStart(10) + 'requests'.padStart(10) + 'script'.padStart(10) + 'third'.padStart(7));

  for (const page of pages) {
    // Two passes: writing the numbers changes the page's own size slightly.
    let r = await measure(page);
    await writeFile(page, fill(await readFile(page, 'utf8'), r));
    r = await measure(page);
    await writeFile(page, fill(await readFile(page, 'utf8'), r));

    const route = '/' + relative(DIST, page).split(sep).join('/').replace(/index\.html$/, '');
    console.log(
      route.padEnd(33) + kb(r.bytes).padStart(10) + String(r.requests).padStart(10) + kb(r.script).padStart(10) + String(r.third).padStart(7),
    );
    if (route === '/' && r.bytes > BUDGET.homeBytes) problems.push(`${route} loads ${kb(r.bytes)}, budget ${kb(BUDGET.homeBytes)}`);
    if (r.script > BUDGET.scriptBytes) problems.push(`${route} has ${kb(r.script)} of script, budget ${kb(BUDGET.scriptBytes)}`);
    if (r.third > BUDGET.thirdParty) problems.push(`${route} makes ${r.third} third-party request(s)`);
    if (r.usesCookies) problems.push(`${route} touches document.cookie`);
  }

  if (problems.length) {
    console.error('\nBudget broken:\n  ' + problems.join('\n  '));
    process.exit(1);
  }
  console.log(`\n${pages.length} pages measured, all within budget.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
