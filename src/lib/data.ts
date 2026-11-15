// Pure functions that turn the GitHub snapshot into what pages show.
// No network and no file access here, so everything is testable.

export interface Asset {
  name: string;
  size: number;
  url: string;
  digest: string | null;
}

export interface Release {
  tag: string;
  name: string | null;
  url: string;
  publishedAt: string;
  prerelease: boolean;
  draft: boolean;
  body: string;
  assets: Asset[];
}

export interface RepoSnapshot {
  description: string | null;
  url: string;
  language: string | null;
  license: string | null;
  pushedAt: string;
  releases: Release[];
  /** Every git tag on the repository. Some libraries are versioned by tag alone, with no release. */
  tags?: string[];
}

export interface Pull {
  repo: string;
  number: number;
  title: string;
  url: string;
  mergedAt: string | null;
}

export interface Snapshot {
  fetchedAt: string;
  repos: Record<string, RepoSnapshot>;
  pulls: Pull[];
}

/** Decimal units, the way download pages and the READMEs state sizes. */
export function formatBytes(bytes: number): string {
  if (bytes < 1_000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1_000)} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
}

const VERSION_TAG = /^(?:v|stable-)?(\d+(?:\.\d+)*)(?:-stable)?$/i;

/** True for tags that name a version of the program ("v1.5.0", "v2.1.0-stable"), not a build part ("ffmpeg-9.0.2-fk3"). */
export function isVersionTag(tag: string): boolean {
  return VERSION_TAG.test(tag);
}

export function versionFromTag(tag: string): string {
  return tag.match(VERSION_TAG)?.[1] ?? tag;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function published(releases: Release[]): Release[] {
  return releases
    .filter((r) => !r.draft && !r.prerelease)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function latestRelease(repo: RepoSnapshot | undefined): Release | null {
  return repo ? (published(repo.releases)[0] ?? null) : null;
}

/** Orders versions by their numbers, so 0.10.0 comes after 0.9.0. Negative when a is older than b. */
export function compareVersions(a: string, b: string): number {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * The newest version a repository has, from its published releases and its
 * version tags together. A repository with tags but no release still has one.
 */
export function latestVersion(repo: RepoSnapshot | undefined): string | null {
  if (!repo) return null;
  const names = [...published(repo.releases).map((r) => r.tag), ...(repo.tags ?? [])];
  const versions = names.filter(isVersionTag).map(versionFromTag);
  return versions.length ? versions.sort(compareVersions).at(-1)! : null;
}

export function releaseByVersion(repo: RepoSnapshot | undefined, version: string): Release | null {
  return repo?.releases.find((r) => versionFromTag(r.tag) === version) ?? null;
}

/** The file a Windows user should download: an .exe or .zip, never a checksum or a wheel. */
export function primaryAsset(release: Release | null): Asset | null {
  if (!release) return null;
  const runnable = release.assets.filter((a) => /\.(exe|zip|msi)$/i.test(a.name));
  return runnable.find((a) => /win/i.test(a.name)) ?? runnable[0] ?? null;
}

export function sha256Of(asset: Asset | null): string | null {
  const m = asset?.digest?.match(/^sha256:([0-9a-f]{64})$/i);
  return m ? m[1] : null;
}

/** Only pull requests that were merged into a repository Pure Tech does not own. */
export function upstreamPulls(pulls: Pull[], owner: string): Pull[] {
  const own = `${owner.toLowerCase()}/`;
  return pulls
    .filter((p) => p.mergedAt && !p.repo.toLowerCase().startsWith(own))
    .sort((a, b) => (b.mergedAt as string).localeCompare(a.mergedAt as string));
}

/**
 * A short line for a release, taken from the first line of its notes:
 * a heading without its date, or an opening sentence. Lists, images and
 * labels like "New:" say nothing by themselves, so those fall back to the name.
 */
export function releaseHeadline(release: Release): string {
  // Notes often open with a download line or an image, so a heading on the second line still counts.
  const opening = release.body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 2);
  const isHeading = (l: string) => /^#{1,6}\s/.test(l);
  const first = opening[0] ?? '';
  // Plain prose only: no lists, images, bold labels or links.
  const isProse = first !== '' && !isHeading(first) && !/^[-*!|<>\[]/.test(first) && !/\*\*|\]\(/.test(first) && !first.endsWith(':');
  const heading = isHeading(first) ? first : !isProse && opening[1] && isHeading(opening[1]) ? opening[1] : null;
  if (heading) {
    return heading
      .replace(/^#{1,6}\s+/, '')
      .replace(/^\d{4}-\d{2}-\d{2}:\s*/, '')
      .trim();
  }
  if (isProse) {
    const sentence = first.match(/^.{20,}?[.!?](?=\s|$)/)?.[0] ?? first;
    return sentence.length <= 180 ? sentence : first.slice(0, 177).trimEnd() + '...';
  }
  // Notes that open with a label and a list ("New look:" then points): the label and
  // the first point, up to its first full stop or colon, say what the release is about.
  const second = opening[1] ?? '';
  if (first.endsWith(':') && first.length <= 40 && /^[-*]\s/.test(second)) {
    const point = plainText(second.replace(/^[-*]\s+/, ''));
    const stop = point.search(/[.:](?:\s|$)/);
    const lead = (stop > 0 ? point.slice(0, stop) : point).trim();
    if (lead) return clip(`${first} ${lead}`, 120);
  }
  return release.name ?? release.tag;
}

/** Markdown emphasis, code marks and links removed, leaving the words. */
function plainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cuts at a word boundary and marks the cut, when the text is longer than the limit. */
function clip(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit - 3);
  return cut.slice(0, cut.lastIndexOf(' ')).trimEnd() + '...';
}

/**
 * Most recently released first. Entries with no release go last, and ties keep the order they were given in.
 */
export function byLatestRelease<T extends { repo: string }>(items: T[], snapshot: Snapshot): T[] {
  return items
    .map((item, index) => ({ item, index, at: latestRelease(snapshot.repos[item.repo])?.publishedAt ?? '' }))
    .sort((a, b) => (a.at === b.at ? a.index - b.index : a.at < b.at ? 1 : -1))
    .map((entry) => entry.item);
}

/** The headline without a leading "Name 1.2.3," so it can sit beside the name and version. */
export function releaseSummary(release: Release): string {
  const rest = releaseHeadline(release)
    .replace(/^[^,.]*?\d+\.\d+(?:\.\d+)?(?:\s*\([^)]*\))?\s*(?:[,:]\s*|$)/, '')
    .trim();
  // A bare "V2.1.0 Changelog" or a license line says nothing about the release.
  if (/^(?:v?\d[\d.]*\s+)?changelog\b/i.test(rest) || /^licensed under\b/i.test(rest)) return '';
  return rest ? rest[0].toUpperCase() + rest.slice(1) : '';
}

export interface FeedItem {
  repo: string;
  release: Release;
}

/** Every published release of the given repositories, newest first. */
export function releaseFeed(snapshot: Snapshot, repos: string[]): FeedItem[] {
  return repos
    .flatMap((repo) => published(snapshot.repos[repo]?.releases ?? []).map((release) => ({ repo, release })))
    .sort((a, b) => b.release.publishedAt.localeCompare(a.release.publishedAt));
}

/** The current download as a measure value, so the figure follows the release instead of being typed in. */
export function liveDownload(repo: RepoSnapshot | undefined): { value: number; text: string; note: string; ref: string } | null {
  const release = latestRelease(repo);
  const asset = primaryAsset(release);
  if (!release || !asset) return null;
  return { value: asset.size / 1_000_000, text: formatBytes(asset.size), note: 'version', ref: versionFromTag(release.tag) };
}

/**
 * Widths for a before bar and an after bar, as whole percentages of the larger value.
 * A figure that went up gets the longer after bar, and a zero gets no bar at all.
 */
export function barWidths(before: number, after: number): { before: number; after: number } {
  const max = Math.max(before, after);
  if (max <= 0) return { before: 0, after: 0 };
  const width = (v: number) => (v <= 0 ? 0 : Math.max(1, Math.round((v / max) * 100)));
  return { before: width(before), after: width(after) };
}

/** Share of the "before" value that the "after" value takes, as a whole percentage (1 to 100). */
export function ratioPercent(before: number, after: number): number {
  if (before <= 0) return 100;
  return Math.min(100, Math.max(1, Math.round((after / before) * 100)));
}
