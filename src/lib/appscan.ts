// Sorts a program's files into what it is made of: the program itself, and what it carries along with it
// (a bundled web browser, runtimes, translations, updaters...). By file name and size only: no file is read,
// so this is pure and testable. Used by the "What's in this app?" box on the home page (AppScan.astro).

import { formatBytes } from './data.ts';

export interface ScanFile {
  /** Relative to the folder that was dropped, with / between folders. */
  path: string;
  size: number;
}
export type Engine = 'Electron' | 'CEF' | 'Chromium' | 'WebView2' | null;
export interface Group {
  id: string;
  label: string;
  bytes: number;
  /** Largest first. */
  files: ScanFile[];
}
export interface ScanResult {
  name: string;
  total: number;
  count: number;
  engine: Engine;
  /** Largest first; empty groups are left out. */
  groups: Group[];
}

const LOCALE_DIR = /(^|\/)(locales?|translations|lang|languages|localization|l10n|i18n)\//;
const CULTURE_DIR = /(^|\/)([a-z]{2}(?:-[a-z]{2,4})?)\/[^/]+\.resources\.dll$/;

// [id, label, pattern on the lowercased path, condition]. The first match wins; what matches nothing is the program.
// Conditions: 'web' rules apply only when a bundled browser engine was found, 'qt' only when Qt itself is there
// (so a folder named "styles" in some other app is not taken for Qt), 'py' only when Python itself is there
// (so an app's own Python plugin is not taken for a Python runtime).
type Need = 'web' | 'qt' | 'py';
const RULES: [string, string, RegExp, Need?][] = [
  ['translations', 'Translations', new RegExp(`${LOCALE_DIR.source}|\\.(mo|qm)$|${CULTURE_DIR.source}`)],
  [
    'browser',
    'Bundled web browser',
    /\.pak$|(^|\/)(icudtl\.dat|v8_context_snapshot[^/]*\.bin|snapshot_blob\.bin|libegl\.dll|libglesv2\.dll|vk_swiftshader[^/]*|vulkan-1\.dll|dxcompiler\.dll|dxil\.dll|d3dcompiler_47\.dll|chrome_elf\.dll|libcef\.dll|ffmpeg\.dll)$/,
    'web',
  ],
  [
    'dotnet',
    '.NET runtime and libraries',
    /(^|\/)(coreclr|clrjit|clrcompression|clretwrc|hostfxr|hostpolicy|mscor[^/]*|netstandard|windowsbase|accessibility|reachframework|directwriteforwarder|uiautomation[^/]*|microsoft\.csharp|microsoft\.visualbasic[^/]*|microsoft\.win32\.[^/]*|system\.[^/]*|presentation[^/]*|[^/]*_cor3)\.dll$/,
  ],
  ['java', 'Java runtime', /(^|\/)(jre|jbr|jdk)([-_.\d][^/]*)?\/|(^|\/)jvm\.dll$/],
  ['python', 'Python runtime', /(^|\/)(python3[^/]*\.dll|python[^/]*\.zip|base_library\.zip)$/],
  ['python', 'Python runtime', /\.pyd$/, 'py'],
  [
    'qt',
    'Qt',
    /(^|\/)qt[56][^/]*\.dll$|(^|\/)(platforms|imageformats|styles|iconengines|qml|platforminputcontexts|tls|networkinformation|sqldrivers|printsupport)\//,
    'qt',
  ],
  [
    'vcrt',
    'Visual C++ runtime',
    /(^|\/)(vcruntime[^/]*|msvcp[^/]*|msvcr[^/]*|concrt[^/]*|vccorlib[^/]*|vcomp[^/]*|mfc[^/]*|ucrtbase|api-ms-win-[^/]*)\.dll$/,
  ],
  [
    'media',
    'Video and audio codecs',
    /(^|\/)((avcodec|avformat|avutil|avfilter|avdevice|swscale|swresample|postproc)[^/]*\.dll|lib(vlc|mpv)[^/]*|lib(x26[45]|vpx|dav1d|aom|svtav1|opus|mp3lame)[^/]*\.dll|ffmpeg[^/]*\.(dll|exe))$/,
  ],
  [
    'updater',
    'Updater, uninstaller and crash reporter',
    /(^|\/)(updater?|installer)\/|updat[^/]*\.exe$|(^|\/)(squirrel|setup)\.exe$|(^|\/)unins[^/]*\.(exe|dat|msg)$|crash[^/]*(report|handler)[^/]*$|(^|\/)(sentry[^/]*\.dll|breakpad[^/]*)$/,
  ],
  ['debug', 'Debug files', /\.(pdb|map)$/],
  [
    'licenses',
    'Licenses and documentation',
    /(^|\/)(licen[cs]e|copying|notice|credits|readme|third[^/]*part)[^/]*$|\.chm$|(^|\/)licen[cs]es?\//,
  ],
];

const BROWSER = RULES.find((r) => r[0] === 'browser')!;
const fileName = (p: string) => p.slice(p.lastIndexOf('/') + 1);
const folderOf = (p: string) => p.slice(0, p.lastIndexOf('/') + 1);

/**
 * Which bundled browser engine the folder carries, if any. For Electron, also the folders that hold it,
 * because there the main exe is Electron itself.
 */
export function findEngine(paths: string[]): { engine: Engine; folders: string[] } {
  const icu = paths.filter((p) => fileName(p) === 'icudtl.dat');
  if (icu.length && paths.some((p) => p.endsWith('.pak'))) {
    if (paths.some((p) => /(^|\/)resources\/app(\.asar$|\/)/.test(p))) return { engine: 'Electron', folders: icu.map(folderOf) };
    return { engine: paths.some((p) => fileName(p) === 'libcef.dll') ? 'CEF' : 'Chromium', folders: [] };
  }
  return { engine: paths.some((p) => fileName(p) === 'webview2loader.dll') ? 'WebView2' : null, folders: [] };
}

/** Distinct languages among the translation files, where their names or folders say so. */
function languages(files: ScanFile[]): number {
  const seen = new Set<string>();
  for (const { path } of files) {
    const p = path.toLowerCase();
    // A Chromium locale file is named for its language, sometimes after a prefix: "de.pak", "strings_de.pak".
    const lang = p.match(CULTURE_DIR) ?? p.match(/(^|\/)locales\/(?:[^/]*_)?([a-z]{2,3}(?:-[a-z0-9]{2,8}){0,2})\.pak$/);
    if (lang) seen.add(lang[2]);
  }
  return seen.size;
}

export function classify(name: string, files: ScanFile[]): ScanResult {
  const lower = files.map((f) => f.path.toLowerCase().replace(/\\/g, '/'));
  const { engine, folders } = findEngine(lower);
  const web = engine !== null && engine !== 'WebView2';
  const has = { web, qt: lower.some((p) => /^qt[56][^/]*\.dll$/.test(fileName(p))), py: lower.some((p) => /^python3[^/]*\.dll$/.test(fileName(p))) };

  // In an Electron app the largest exe beside icudtl.dat is Electron itself, renamed.
  const engineExe = new Set<number>();
  for (const folder of folders) {
    let best = -1;
    lower.forEach((p, i) => {
      if (folderOf(p) === folder && p.endsWith('.exe') && (best < 0 || files[i].size > files[best].size)) best = i;
    });
    if (best >= 0) engineExe.add(best);
  }

  const groups = new Map<string, Group>();
  const add = (id: string, label: string, file: ScanFile) => {
    const g = groups.get(id) ?? groups.set(id, { id, label, bytes: 0, files: [] }).get(id)!;
    g.bytes += file.size;
    g.files.push(file);
  };
  files.forEach((file, i) => {
    const p = lower[i];
    const rule = engineExe.has(i)
      ? BROWSER
      : RULES.find(([, , re, need]) => (!need || has[need]) && re.test(p));
    if (rule) add(rule[0], rule[1], file);
    else add('program', 'The program itself', file);
  });

  const out = [...groups.values()];
  for (const g of out) {
    g.files.sort((a, b) => b.size - a.size);
    if (g.id === 'browser') g.label += ` (${engine})`;
    if (g.id === 'translations') {
      const n = languages(g.files);
      if (n > 1) g.label += ` (${n} languages)`;
    }
  }
  out.sort((a, b) => b.bytes - a.bytes);
  return { name, total: files.reduce((s, f) => s + f.size, 0), count: files.length, engine, groups: out };
}

export const filesCount = (n: number) => `${n.toLocaleString('en-US')} ${n === 1 ? 'file' : 'files'}`;

/**
 * A share of the total, as people read it: "<1%" rather than "0%" for something that is there, and ">99%" rather
 * than "100%" for something that is not quite all of it.
 */
export function percent(part: number, total: number): string {
  if (!total || !part) return '0%';
  const p = (part / total) * 100;
  if (p < 1) return '<1%';
  return p > 99 && part < total ? '>99%' : `${Math.round(p)}%`;
}

/** The result as plain text, for the Copy button. */
export function resultText(r: ScanResult): string {
  const lines = [`${r.name}: ${formatBytes(r.total)} in ${filesCount(r.count)}`];
  for (const g of r.groups) lines.push(`${g.label}: ${formatBytes(g.bytes)} (${percent(g.bytes, r.total)})`);
  if (r.engine === 'WebView2') lines.push('Uses the WebView2 that comes with Windows; no browser of its own.');
  lines.push('Measured with puretechteam.github.io. Nothing was uploaded.');
  return lines.join('\n');
}
