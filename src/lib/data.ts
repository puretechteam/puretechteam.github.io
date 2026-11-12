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
  return release.name ?? release.tag;
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

/** Share of the "before" value that the "after" value takes, as a whole percentage (1 to 100). */
export function ratioPercent(before: number, after: number): number {
  if (before <= 0) return 100;
  return Math.min(100, Math.max(1, Math.round((after / before) * 100)));
}
