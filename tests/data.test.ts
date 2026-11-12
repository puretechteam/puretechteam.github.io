import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  formatBytes,
  formatDate,
  isVersionTag,
  latestRelease,
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
  assert.equal(releaseHeadline(rel({ body: 'New:\n\n- a thing', name: 'App 0.2.0' })), 'App 0.2.0');
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
