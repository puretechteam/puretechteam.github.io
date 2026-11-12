// An RSS feed of every release, written by hand so it needs no package.

import type { APIRoute } from 'astro';
import snapshotJson from '../data/snapshot.json';
import { products } from '../data/products.ts';
import { libraries } from '../data/libraries.ts';
import { ROSTER_REPOS } from '../data/roster.mjs';
import type { Snapshot } from '../lib/data.ts';
import { isVersionTag, releaseFeed, releaseSummary, versionFromTag } from '../lib/data.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = ({ site }) => {
  const snapshot = snapshotJson as Snapshot;
  const nameOf = (repo: string) =>
    products.find((p) => p.repo === repo)?.name ?? libraries.find((l) => l.repo === repo)?.name ?? repo;
  const home = site?.href ?? '/';

  const items = releaseFeed(snapshot, ROSTER_REPOS)
    .filter((f) => isVersionTag(f.release.tag))
    .slice(0, 40)
    .map(
      ({ repo, release }) => `    <item>
      <title>${esc(`${nameOf(repo)} ${versionFromTag(release.tag)}`)}</title>
      <link>${esc(release.url)}</link>
      <guid isPermaLink="true">${esc(release.url)}</guid>
      <pubDate>${new Date(release.publishedAt).toUTCString()}</pubDate>
      <description>${esc(releaseSummary(release))}</description>
    </item>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Pure Tech releases</title>
    <link>${esc(home)}</link>
    <description>Every release of Pure Tech software and libraries.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
