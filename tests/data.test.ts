import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  barWidths,
  byLatestRelease,
  changePercent,
  isWorse,
  compareVersions,
  formatBytes,
  formatDate,
  isVersionTag,
  latestRelease,
  latestVersion,
  liveDownload,
  primaryAsset,
  ratioPercent,
  releaseByVersion,
  releaseFeed,
  releaseHeadline,
  releaseSummary,
  sha256Of,
  upstreamPulls,
  versionFromTag,
} from '../src/lib/data.ts';
import type { Release, Snapshot } from '../src/lib/data.ts';
import { ledger, measures, parts, products } from '../src/data/products.ts';
import { LIBRARY_REPOS, OWNER, ROSTER_REPOS, SOFTWARE_REPOS } from '../src/data/roster.mjs';
import { isThirdParty, resourcesOf } from '../scripts/measure-pages.mjs';
import { ATTRIBUTION_LINE, cleanBody } from '../scripts/clean.mjs';
import { decodeEntities, isOwnPost, postedAtFromId, postFromOembed, shortLinks, stripEmoji } from '../scripts/x-oembed.mjs';
import { X_HANDLE, X_POSTS } from '../src/data/x.mjs';
import { isOutside, markOutsideLinks } from '../src/lib/links.ts';

const snapshot: Snapshot = JSON.parse(readFileSync(new URL('../src/data/snapshot.json', import.meta.url), 'utf8'));

const rel = (over: Partial<Release>): Release => ({
  tag: 'v1.0.0',
  name: null,
  url: 'https://example.test/r',
  publishedAt: '2026-01-01T00:00:00Z',
  prerelease: false,
  draft: false,
  body: '',
  assets: [],
  ...over,
});

test('formatBytes uses decimal units like the READMEs do', () => {
  assert.equal(formatBytes(78_300_000), '78.3 MB');
  assert.equal(formatBytes(390_000), '390 KB');
  assert.equal(formatBytes(999), '999 B');
  assert.equal(formatBytes(1_500_000_000), '1.50 GB');
});

test('versionFromTag strips a leading v only before a digit', () => {
  assert.equal(versionFromTag('v1.5.0'), '1.5.0');
  assert.equal(versionFromTag('3.1.1'), '3.1.1');
  assert.equal(versionFromTag('vista'), 'vista');
  assert.equal(versionFromTag('stable-1.0.0'), '1.0.0');
  assert.equal(versionFromTag('v2.1.0-stable'), '2.1.0');
  assert.equal(versionFromTag('ffmpeg-9.0.2-fk3'), 'ffmpeg-9.0.2-fk3');
  assert.equal(isVersionTag('v1.5.0'), true);
  assert.equal(isVersionTag('ffmpeg-9.0.2-fk3'), false);
});

test('formatDate is day, short month, year in UTC', () => {
  assert.equal(formatDate('2026-11-12T23:59:00Z'), '12 Nov 2026');
});

test('latestRelease skips drafts and prereleases and picks the newest', () => {
  const repo = {
    description: null,
    url: '',
    language: null,
    license: null,
    pushedAt: '',
    releases: [
      rel({ tag: 'v3.0.0', publishedAt: '2026-03-01T00:00:00Z', prerelease: true }),
      rel({ tag: 'v1.0.0', publishedAt: '2026-01-01T00:00:00Z' }),
      rel({ tag: 'v2.0.0', publishedAt: '2026-02-01T00:00:00Z' }),
      rel({ tag: 'v4.0.0', publishedAt: '2026-04-01T00:00:00Z', draft: true }),
    ],
  };
  assert.equal(latestRelease(repo)?.tag, 'v2.0.0');
  assert.equal(latestRelease(undefined), null);
});

test('primaryAsset picks the runnable Windows file, never a checksum or a wheel', () => {
  const r = rel({
    assets: [
      { name: 'App-1.0-win64.zip.sha256', size: 90, url: 'a', digest: null },
      { name: 'lib-1.0-cp310-abi3-win_amd64.whl', size: 5, url: 'b', digest: null },
      { name: 'App-1.0-win64.zip', size: 100, url: 'c', digest: null },
    ],
  });
  assert.equal(primaryAsset(r)?.name, 'App-1.0-win64.zip');
  assert.equal(primaryAsset(rel({ assets: [{ name: 'x.whl', size: 1, url: 'd', digest: null }] })), null);
  assert.equal(primaryAsset(null), null);
});

test('sha256Of accepts only a full sha256 digest', () => {
  const hash = 'a'.repeat(64);
  assert.equal(sha256Of({ name: 'f', size: 1, url: 'u', digest: `sha256:${hash}` }), hash);
  assert.equal(sha256Of({ name: 'f', size: 1, url: 'u', digest: 'md5:abc' }), null);
  assert.equal(sha256Of({ name: 'f', size: 1, url: 'u', digest: null }), null);
});

test('upstreamPulls keeps merged pull requests to other owners only', () => {
  const pulls = [
    { repo: 'other/thing', number: 1, title: 'merged', url: 'u1', mergedAt: '2026-09-01T00:00:00Z' },
    { repo: 'other/thing', number: 2, title: 'open', url: 'u2', mergedAt: null },
    { repo: 'PureTechTeam/bytes', number: 3, title: 'own fork', url: 'u3', mergedAt: '2026-09-02T00:00:00Z' },
    { repo: 'else/where', number: 4, title: 'newer', url: 'u4', mergedAt: '2026-10-01T00:00:00Z' },
  ];
  assert.deepEqual(
    upstreamPulls(pulls, 'puretechteam').map((p) => p.number),
    [4, 1],
  );
});

test('releaseHeadline drops the heading marks and the date', () => {
  assert.equal(releaseHeadline(rel({ body: '### 2026-11-12: Latheport 1.5.0, an editor\n\ntext' })), 'Latheport 1.5.0, an editor');
  assert.equal(releaseHeadline(rel({ body: '- a list', name: 'ConvertAll 1.2.0' })), 'ConvertAll 1.2.0');
  assert.equal(releaseHeadline(rel({ body: '' })), 'v1.0.0');
  assert.equal(releaseHeadline(rel({ body: 'New:\n\n![a picture](x.png)', name: 'App 0.2.0' })), 'App 0.2.0');
  assert.equal(
    releaseHeadline(rel({ body: '**Download:** `App.zip` below.\n\n### 2026-11-12: App 1.5.0, an editor\n\ntext' })),
    'App 1.5.0, an editor',
  );
  assert.equal(releaseHeadline(rel({ body: 'What changed: [CHANGELOG.md](https://example.test)', name: 'lib 0.4.0' })), 'lib 0.4.0');
  assert.equal(
    releaseHeadline(rel({ body: 'App 3.0.0 is a brand new desktop app on a new core. Free and open.\n\n## Highlights' })),
    'App 3.0.0 is a brand new desktop app on a new core.',
  );
});

test('releaseSummary drops the leading name and version', () => {
  assert.equal(
    releaseSummary(rel({ body: '### 2026-11-12: Latheport 1.5.0 (was ConvertAll), a photo editor, PDF tools' })),
    'A photo editor, PDF tools',
  );
  assert.equal(releaseSummary(rel({ body: '## 2026-11-05: ConvertAll 1.4.0, no ImageMagick needed' })), 'No ImageMagick needed');
  assert.equal(releaseSummary(rel({ body: '', name: 'ConvertAll 1.2.0' })), '');
  assert.equal(releaseSummary(rel({ body: '# A correction and an apology' })), 'A correction and an apology');
  assert.equal(releaseSummary(rel({ body: '## FrameKeep 3.1.1: Recordings fix' })), 'Recordings fix');
  assert.equal(releaseSummary(rel({ body: '# V2.1.0 Changelog' })), '');
  assert.equal(releaseSummary(rel({ body: 'Licensed under GPLv3 - see LICENSE file for details' })), '');
});

test('notes that open with a label and a list get the label and the first point', () => {
  const body = 'New look:\n\n- Settings is rebuilt in the Windows 11 style: a header, one card per group.\n- New icon.\n\nFixed:\n\n- A thing.';
  assert.equal(releaseHeadline(rel({ body })), 'New look: Settings is rebuilt in the Windows 11 style');
  assert.equal(releaseSummary(rel({ body })), 'New look: Settings is rebuilt in the Windows 11 style');
  assert.equal(
    releaseSummary(rel({ body: 'New:\n\n- Lock only the keyboard, from the tray (**Lock only**) or the [hotkey](https://example.test). More.' })),
    'New: Lock only the keyboard, from the tray (Lock only) or the hotkey',
  );
  const long = 'New:\n- ' + 'word '.repeat(40) + 'end';
  const clipped = releaseHeadline(rel({ body: long }));
  assert.ok(clipped.length <= 120 && clipped.endsWith('...'), clipped);
  assert.equal(releaseHeadline(rel({ body: 'New:\n\nplain text, not a list', name: 'App 1.0.0' })), 'App 1.0.0');
});

test('byLatestRelease puts the newest release first and unreleased entries last', () => {
  const repo = (date: string | null) => ({
    description: null,
    url: '',
    language: null,
    license: null,
    pushedAt: '',
    releases: date ? [rel({ publishedAt: date })] : [],
  });
  const snap = {
    fetchedAt: '',
    pulls: [],
    repos: { a: repo('2026-10-31T00:00:00Z'), b: repo(null), c: repo('2026-11-15T00:00:00Z'), d: repo('2026-10-31T00:00:00Z') },
  };
  const order = byLatestRelease([{ repo: 'a' }, { repo: 'b' }, { repo: 'c' }, { repo: 'd' }], snap).map((x) => x.repo);
  assert.deepEqual(order, ['c', 'a', 'd', 'b']);
});

test('barWidths scales both bars to the larger value', () => {
  assert.deepEqual(barWidths(68, 38), { before: 100, after: 56 });
  assert.deepEqual(barWidths(392.7, 421.4), { before: 93, after: 100 });
  assert.deepEqual(barWidths(4, 0), { before: 100, after: 0 });
  assert.deepEqual(barWidths(1000, 1), { before: 100, after: 1 });
  assert.deepEqual(barWidths(0, 0), { before: 0, after: 0 });
});

test('ratioPercent stays between 1 and 100', () => {
  assert.equal(ratioPercent(68, 38), 56);
  assert.equal(ratioPercent(388.8, 28.9), 7);
  assert.equal(ratioPercent(1000, 1), 1);
  assert.equal(ratioPercent(10, 20), 100);
  assert.equal(ratioPercent(0, 5), 100);
});

test('releaseFeed is newest first and limited to the repos asked for', () => {
  const feed = releaseFeed(snapshot, SOFTWARE_REPOS);
  assert.ok(feed.length > 0);
  for (let i = 1; i < feed.length; i++) {
    assert.ok(feed[i - 1].release.publishedAt >= feed[i].release.publishedAt);
  }
  assert.ok(feed.every((f) => SOFTWARE_REPOS.includes(f.repo)));
});

// ---- the real snapshot and the curated content agree with each other

const INACTIVE = [
  'pixel-coord', 'autosrt', 'kiloton', 'chromaclick', 'whisperserve',
  'api-explorer', 'tech-trend-pulse', 'package-ecosystem', 'infra-map', 'nous',
];

test('the roster holds none of the inactive projects', () => {
  const roster = ROSTER_REPOS.map((r) => r.toLowerCase());
  for (const name of INACTIVE) assert.ok(!roster.includes(name), `${name} is in the roster`);
});

test('the snapshot covers exactly the roster', () => {
  assert.deepEqual(Object.keys(snapshot.repos).sort(), [...ROSTER_REPOS].sort());
});

test('every product and part points at a roster repository', () => {
  for (const p of products) assert.ok(SOFTWARE_REPOS.includes(p.repo), `${p.repo} is not software`);
  for (const p of parts) assert.ok(LIBRARY_REPOS.includes(p.repo), `${p.repo} is not a library`);
});

test('every ledger entry is backed by a line in that release', () => {
  for (const item of ledger) {
    const release = releaseByVersion(snapshot.repos.Latheport, item.version);
    assert.ok(release, `no ${item.version} release for ${item.name}`);
    assert.ok(release.body.includes(item.name), `${item.name} is not mentioned in the ${item.version} notes`);
  }
});

test('the download figure follows the latest release', () => {
  const release = latestRelease(snapshot.repos.Latheport)!;
  const asset = primaryAsset(release)!;
  const live = liveDownload(snapshot.repos.Latheport)!;
  assert.equal(live.text, formatBytes(asset.size));
  assert.equal(live.ref, versionFromTag(release.tag));
  assert.ok(measures.some((m) => m.id === 'download'));
  assert.equal(liveDownload(undefined), null);
});

test('upstream pull requests in the snapshot are all merged elsewhere', () => {
  const pulls = upstreamPulls(snapshot.pulls, OWNER);
  assert.ok(pulls.length >= 5);
  assert.ok(pulls.every((p) => p.mergedAt && !p.repo.toLowerCase().startsWith('puretechteam/')));
});

// ---- versions come from releases and from tags

test('compareVersions orders by number, not by text', () => {
  assert.ok(compareVersions('0.10.0', '0.9.0') > 0);
  assert.ok(compareVersions('1.2', '1.2.1') < 0);
  assert.equal(compareVersions('2.0', '2.0.0'), 0);
  assert.deepEqual(['0.4.1', '0.10.0', '0.2.0', '0.5.0'].sort(compareVersions), ['0.2.0', '0.4.1', '0.5.0', '0.10.0']);
});

test('latestVersion reads tags when there is no release, and ignores tags that are not versions', () => {
  const base = { description: null, url: '', language: null, license: null, pushedAt: '' };
  assert.equal(latestVersion({ ...base, releases: [], tags: ['v0.4.1', 'v0.5.0', 'v0.2.0'] }), '0.5.0');
  assert.equal(latestVersion({ ...base, releases: [], tags: ['ffmpeg-9.0.2-fk3', 'v3.1.1', 'v2.1.0-stable'] }), '3.1.1');
  assert.equal(latestVersion({ ...base, releases: [rel({ tag: 'v0.3.0' })], tags: ['v0.3.0', 'v0.4.0'] }), '0.4.0');
  assert.equal(latestVersion({ ...base, releases: [rel({ tag: 'v1.0.0' })] }), '1.0.0');
  assert.equal(latestVersion({ ...base, releases: [rel({ tag: 'v9.0.0', prerelease: true })], tags: [] }), null);
  assert.equal(latestVersion({ ...base, releases: [], tags: [] }), null);
  assert.equal(latestVersion(undefined), null);
});

test('every library on the site has a version', () => {
  for (const repo of LIBRARY_REPOS) {
    assert.ok(latestVersion(snapshot.repos[repo]), `${repo} has no version`);
  }
});

// ---- release notes are cleaned before they are stored

test('cleanBody drops copyright lines and keeps everything else', () => {
  const body = 'App - (C) 2025 Some Person\r\n\r\nLicensed under MIT\r\n© 2024 Someone\nCopyright 2023 Someone Else\nFour of them are copyrighted.';
  assert.equal(cleanBody(body), '\nLicensed under MIT\nFour of them are copyrighted.');
  assert.equal(cleanBody(null), '');
});

test('no stored release note carries a copyright line', () => {
  for (const [repo, data] of Object.entries(snapshot.repos)) {
    for (const release of data.releases) {
      const hit = release.body.split('\n').find((line) => ATTRIBUTION_LINE.test(line));
      assert.equal(hit, undefined, `${repo} ${release.tag} still has an attribution line`);
    }
  }
});

// ---- the page measurer

test('resourcesOf counts loads, not links to other pages', () => {
  const html = `
    <link rel="stylesheet" href="/a.css"><link rel="preload" href="/f.woff2" as="font">
    <link rel="canonical" href="https://example.test/"><a href="https://github.com/x">x</a>
    <script src="/s.js"></script><img src="/i.webp" alt="">`;
  assert.deepEqual(resourcesOf(html).sort(), ['/a.css', '/f.woff2', '/i.webp', '/s.js']);
});

test('isThirdParty spots absolute and protocol-relative URLs', () => {
  assert.equal(isThirdParty('https://cdn.example.test/x.js'), true);
  assert.equal(isThirdParty('//cdn.example.test/x.js'), true);
  assert.equal(isThirdParty('/_astro/x.js'), false);
});

test('a video counts its poster, and the video itself only when it is not preload="none"', () => {
  const lazy = `<video controls preload="none" poster="/media/v.webp"><source src="/media/v.mp4" type="video/mp4"></video>`;
  assert.deepEqual(resourcesOf(lazy), ['/media/v.webp']);
  const eager = `<video controls preload="auto" poster="/media/v.webp" src="/media/a.mp4"><source src="/media/v.mp4"></video>`;
  assert.deepEqual(resourcesOf(eager).sort(), ['/media/a.mp4', '/media/v.mp4', '/media/v.webp']);
});

// ---- posts from X

const oembed = (p: string, author = 'https://x.com/puretechteam') => ({
  author_url: author,
  html: `<blockquote class="twitter-tweet" data-dnt="true">${p}&mdash; Pure Tech (@puretechteam) <a href="https://x.com/puretechteam/status/1">November 15, 2026</a></blockquote>\n`,
});

test('postFromOembed keeps the words and paragraphs, drops the media link and spaces a glued link', () => {
  const post = postFromOembed(
    oembed(
      '<p lang="en" dir="ltr">ChildLock 0.3 got a makeover.<br><br>It&#39;s free for Windows:<a href="https://t.co/JTQPS5rDrP">https://t.co/JTQPS5rDrP</a> <a href="https://t.co/3H8WutmodX">pic.twitter.com/3H8WutmodX</a></p>',
    ),
  );
  assert.deepEqual(post, {
    text: "ChildLock 0.3 got a makeover.\n\nIt's free for Windows: https://t.co/JTQPS5rDrP",
    media: true,
    lang: 'en',
  });
  assert.deepEqual(shortLinks(post.text), ['https://t.co/JTQPS5rDrP']);
});

test('postFromOembed drops emoji and the hashtags a post ends on, and keeps a hashtag inside a sentence', () => {
  const post = postFromOembed(
    oembed(
      '<p lang="en" dir="ltr">🚀 We ship <a href="https://x.com/hashtag/Windows">#Windows</a> tools.<br><br>Built to last. ♻️<a href="https://x.com/hashtag/Tech">#Tech</a> <a href="https://x.com/hashtag/RightToRepair">#RightToRepair</a></p>',
    ),
  );
  assert.equal(post.text, 'We ship #Windows tools.\n\nBuilt to last.');
  assert.equal(post.media, false);
});

test('stripEmoji keeps typographic symbols and removes emoji, flags and joined sequences', () => {
  assert.equal(stripEmoji('© 2026 Pure Tech™, A ↔ B'), '© 2026 Pure Tech™, A ↔ B');
  assert.equal(stripEmoji('Locked 🔒 and ↔️ done'), 'Locked  and  done');
  assert.equal(stripEmoji('🇺🇸 👨‍💻 ok'), '  ok');
  assert.equal(decodeEntities('&lt;b&gt; &amp; &#39;x&#x27; &quot;'), `<b> & 'x' "`);
});

test('postedAtFromId reads the time out of an X post ID', () => {
  // X's own page showed this post at timestamp 1794835087000 (to the second).
  assert.equal(postedAtFromId('2122318299291672959'), '2026-11-16T13:18:07.975Z');
});

test('only posts by the account count as its own', () => {
  assert.equal(isOwnPost({ author_url: 'https://x.com/puretechteam' }, X_HANDLE), true);
  assert.equal(isOwnPost({ author_url: 'https://twitter.com/PureTechTeam' }, X_HANDLE), true);
  assert.equal(isOwnPost({ author_url: 'https://x.com/puretechteamfan' }, X_HANDLE), false);
  assert.throws(() => postFromOembed({ html: '<blockquote></blockquote>' }), /no post text/);
});

test('every stored post is one the site lists, by the account, with clean text and its real time', () => {
  const stored: { id: string; url: string; postedAt: string; text: string }[] = JSON.parse(
    readFileSync(new URL('../src/data/x-posts.json', import.meta.url), 'utf8'),
  ).posts;
  assert.ok(stored.length > 0);
  for (const p of stored) {
    assert.ok(X_POSTS.includes(p.id), `${p.id} is stored but not listed in src/data/x.mjs`);
    assert.equal(p.url, `https://x.com/${X_HANDLE}/status/${p.id}`);
    assert.equal(p.postedAt, postedAtFromId(p.id));
    assert.equal(stripEmoji(p.text), p.text, `${p.id} still has an emoji`);
    assert.deepEqual(shortLinks(p.text), [], `${p.id} still sends readers through t.co`);
  }
});

// ---- links that leave the site

test('outside links open in a new tab, and internal links, downloads and set targets are left alone', () => {
  const html = [
    '<body>',
    '<a href="https://github.com/puretechteam">GitHub</a>',
    '<a href="/software/">Software</a><a href="#main">Skip</a><a href="mailto:x@example.test">Mail</a>',
    '<a href="https://puretechteam.github.io/about/">About</a>',
    '<a class="btn" href="https://github.com/puretechteam/childlock/releases/download/v0.3.0/ChildLock.exe" data-dl>Download</a>',
    '<a href="https://example.test/file.zip" download>File</a>',
    '<a href="https://x.com/puretechteam" target="_self">X</a>',
    '</body>',
  ].join('');
  const out = markOutsideLinks(html, 'puretechteam.github.io');
  const tags = [...out.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
  assert.equal(tags[0], '<a href="https://github.com/puretechteam" rel="noopener" aria-describedby="pt-new-tab" target="_blank">');
  for (const tag of tags.slice(1)) assert.doesNotMatch(tag, /_blank|pt-new-tab/, tag);
  assert.equal(out.match(/id="pt-new-tab"/g)?.length, 1);
  assert.match(out, /<span id="pt-new-tab" hidden>Opens in a new tab<\/span><\/body>/);
});

test('a marked link keeps the rel and description it already had, and a page with no outside links gets no note', () => {
  const out = markOutsideLinks('<a href="//cdn.example.test/" rel="me" aria-describedby="hint">x</a></body>', 'puretechteam.github.io');
  assert.match(out, /rel="me noopener"/);
  assert.match(out, /aria-describedby="hint pt-new-tab"/);
  const inside = '<a href="/updates/">Updates</a></body>';
  assert.equal(markOutsideLinks(inside, 'puretechteam.github.io'), inside);
  assert.equal(isOutside('https://PURETECHTEAM.github.io/x/', 'puretechteam.github.io'), false);
});

test('when the opening says nothing, the summary comes from the first line further down that does', () => {
  // An image, then prose with bold words in it.
  assert.equal(releaseSummary(rel({ body: '![App](banner.png)\n\nFirst release. Download **App.exe** below.' })), 'First release.');
  // A download line and a heading with only the name, then a list.
  const body = '**Download:** `App.zip` below.\n### 2026-10-30: App 1.2.0\n- **Changed: Tool is no longer needed.** More words.';
  assert.equal(releaseSummary(rel({ body })), 'Changed: Tool is no longer needed');
  // A license line and a bare changelog heading, then a list.
  assert.equal(releaseSummary(rel({ body: 'Licensed under GPLv3\nv2.0.0 Changelog\n- Fixed the start.' })), 'Fixed the start');
  // Nothing but pointers stays empty.
  assert.equal(releaseSummary(rel({ body: '**Full Changelog**: https://example.test/compare' })), '');
  assert.equal(releaseSummary(rel({ body: 'What changed: [CHANGELOG.md](https://example.test)' })), '');
});

test('a worse figure is spotted in both directions, with its change', () => {
  assert.equal(isWorse(392.7, 421.4), true);
  assert.equal(isWorse(68, 38), false);
  assert.equal(isWorse(27, 34, 'higher'), false);
  assert.equal(isWorse(34, 27, 'higher'), true);
  assert.equal(changePercent(392.7, 421.4), 7);
  assert.equal(changePercent(0, 5), 0);
});
