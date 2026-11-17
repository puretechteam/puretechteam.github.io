// Refreshes src/data/x-posts.json from X's public oEmbed endpoint: no account, no key, no cost.
// The site builds from the stored copy, so visitors' browsers never contact X.
// Usage: npm run posts
//
// A post X reports as gone (deleted or protected) is dropped. Any other failure keeps the stored
// copy, so a bad moment at X never empties the section or stops a deploy.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { X_HANDLE, X_POSTS } from '../src/data/x.mjs';
import { isOwnPost, postFromOembed, postedAtFromId, shortLinks } from './x-oembed.mjs';

const headers = { 'User-Agent': 'puretech-website-build' };

/** Replaces each t.co link with the address it leads to, so visitors are not sent through X to get there. */
async function expandLinks(text) {
  for (const short of shortLinks(text)) {
    const res = await fetch(short, { headers, redirect: 'manual' });
    const target = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && target && /^https?:\/\//.test(target)) text = text.split(short).join(target);
    else console.warn(`  ${short} did not resolve (${res.status}); left as it is`);
  }
  return text;
}

const OUT = fileURLToPath(new URL('../src/data/x-posts.json', import.meta.url));
const stored = await readFile(OUT, 'utf8')
  .then((s) => JSON.parse(s).posts)
  .catch(() => []);
const storedById = new Map(stored.map((p) => [p.id, p]));

const posts = [];
for (const id of X_POSTS) {
  const url = `https://x.com/${X_HANDLE}/status/${id}`;
  const endpoint = `https://publish.twitter.com/oembed?omit_script=1&dnt=true&url=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(endpoint, { headers });
    if (res.status === 404 || res.status === 403) {
      console.log(`${id}: gone from X, dropped`);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const oembed = await res.json();
    if (!isOwnPost(oembed, X_HANDLE)) {
      console.warn(`${id}: not a post by @${X_HANDLE}, skipped`);
      continue;
    }
    const post = postFromOembed(oembed);
    posts.push({ id, url, postedAt: postedAtFromId(id), ...post, text: await expandLinks(post.text) });
    console.log(`${id}: ok`);
  } catch (err) {
    const old = storedById.get(id);
    console.warn(`${id}: ${err.message}; ${old ? 'kept the stored copy' : 'left out until the next run'}`);
    if (old) posts.push(old);
  }
}

posts.sort((a, b) => b.postedAt.localeCompare(a.postedAt));
await writeFile(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), posts }, null, 2) + '\n');
console.log(`wrote ${posts.length} of ${X_POSTS.length} posts to ${OUT}`);
