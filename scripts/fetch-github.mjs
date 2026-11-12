// Refreshes src/data/snapshot.json from the public GitHub API.
// The site builds from the snapshot, so a normal build needs no network.
// Usage: npm run snapshot   (set GITHUB_TOKEN to raise the rate limit; optional)

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ROSTER_REPOS, OWNER } from '../src/data/roster.mjs';
import { cleanBody } from './clean.mjs';

const API = 'https://api.github.com';
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'puretech-website-build',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

async function get(path) {
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}`);
  return res.json();
}

function slimRelease(r) {
  return {
    tag: r.tag_name,
    name: r.name,
    url: r.html_url,
    publishedAt: r.published_at,
    prerelease: r.prerelease,
    draft: r.draft,
    body: cleanBody(r.body),
    assets: (r.assets ?? []).map((a) => ({
      name: a.name,
      size: a.size,
      url: a.browser_download_url,
      digest: a.digest ?? null,
    })),
  };
}

const repos = {};
for (const repo of ROSTER_REPOS) {
  // Tags are read too: some libraries are versioned with a tag and no GitHub release.
  const [info, releases, tags] = await Promise.all([
    get(`/repos/${OWNER}/${repo}`),
    get(`/repos/${OWNER}/${repo}/releases?per_page=30`),
    get(`/repos/${OWNER}/${repo}/tags?per_page=100`),
  ]);
  repos[repo] = {
    description: info.description,
    url: info.html_url,
    language: info.language,
    license: info.license?.spdx_id ?? null,
    pushedAt: info.pushed_at,
    releases: releases.map(slimRelease),
    tags: tags.map((t) => t.name),
  };
  console.log(`${repo}: ${releases.length} releases, ${tags.length} tags`);
}

const search = await get(
  `/search/issues?q=${encodeURIComponent(`author:${OWNER} type:pr is:merged`)}&per_page=100`,
);
const pulls = search.items.map((i) => ({
  repo: i.repository_url.replace(`${API}/repos/`, ''),
  number: i.number,
  title: i.title,
  url: i.html_url,
  mergedAt: i.pull_request?.merged_at ?? null,
}));
console.log(`merged pull requests found: ${pulls.length}`);

const out = fileURLToPath(new URL('../src/data/snapshot.json', import.meta.url));
await writeFile(out, JSON.stringify({ fetchedAt: new Date().toISOString(), repos, pulls }, null, 2) + '\n');
console.log(`wrote ${out}`);
