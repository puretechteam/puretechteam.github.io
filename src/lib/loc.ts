// Lines of code for "What's in this app?": counts the source files in a dropped folder, and the code an Electron
// app packs into app.asar. Files are read in the page, on the visitor's PC; nothing is sent anywhere.
// Part of the tool the home page fetches on first use (scan-ui.ts), so it costs the page nothing until then.
// The counting and parsing are pure and tested in tests/loc.test.ts.

import { DOCS, percent } from './appscan.ts';

/** Language by file extension. Data, markup and docs (json, xml, md) are not code and are left out. */
const TABLE =
  'JavaScript:js,mjs,cjs,jsx|TypeScript:ts,tsx,mts,cts|Python:py,pyw|C#:cs|C:c|C++:cpp,cc,cxx|C/C++ header:h,hpp,hh,hxx|' +
  'Rust:rs|Go:go|Java:java|Kotlin:kt,kts|Swift:swift|Ruby:rb|PHP:php|Lua:lua|GDScript:gd|Dart:dart|Scala:scala|' +
  'Haskell:hs|Elixir:ex,exs|F#:fs,fsx|Visual Basic:vb|Perl:pl,pm|R:r|Zig:zig|Shell:sh,bash,zsh|PowerShell:ps1,psm1|' +
  'Batch:bat,cmd|SQL:sql|CSS:css,scss,sass,less|HTML:html,htm|Vue:vue|Svelte:svelte|Astro:astro|' +
  'Shaders:glsl,hlsl,wgsl,vert,frag,shader';
const LANG = new Map<string, string>();
for (const row of TABLE.split('|')) {
  const [name, exts] = row.split(':');
  for (const e of exts.split(',')) LANG.set(e, name);
}

export function languageOf(path: string): string | null {
  const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
  const dot = name.lastIndexOf('.');
  return dot > 0 ? (LANG.get(name.slice(dot + 1)) ?? null) : null;
}

/** Code someone else wrote, bundled along: package folders of npm, Python and the like. */
export const isLibrary = (path: string) =>
  /(^|\/)(node_modules|bower_components|vendor|third[_-]?party|site-packages|dist-packages)\//i.test(path);

/**
 * Left out before reading: version-control folders (old copies of the code, not the code) and license texts and
 * documentation (Electron apps carry several MB of licenses as one .html file).
 */
const isSkipped = (path: string) => /(^|\/)(\.git|\.hg|\.svn)\//.test(path) || DOCS.test(path.toLowerCase());

/**
 * Left out after reading: files that only share an extension with code. A video segment (.ts) or other binary has
 * zero bytes in it, as git checks too; a Qt translation (.ts) is XML.
 */
export const looksLikeCode = (text: string) => !text.slice(0, 8000).includes('\0') && !/^\s*<\?xml/.test(text);

/** Lines in a text, and lines with something on them (blank lines do not count as code). */
export function countLines(text: string): { lines: number; code: number } {
  let lines = 0;
  let code = 0;
  let blank = true;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 10) {
      lines++;
      if (!blank) code++;
      blank = true;
    } else if (c > 32) blank = false;
  }
  if (text.length && text.charCodeAt(text.length - 1) !== 10) {
    lines++;
    if (!blank) code++;
  }
  return { lines, code };
}

/** Minified code is packed onto a few very long lines, so its line count says little about how much there is. */
export const isPacked = (bytes: number, lines: number) => bytes > 3000 && bytes / Math.max(lines, 1) > 300;

/**
 * The files packed in an Electron app.asar, from its header: a 16-byte start (two Chromium pickles), then the
 * file list as JSON. Offsets count from the end of the header. Files kept outside the archive (unpacked) are
 * on disk beside it and are counted there.
 */
export function asarLayout(start: DataView): { jsonLength: number; dataStart: number } | null {
  if (start.byteLength < 16 || start.getUint32(0, true) !== 4) return null;
  return { jsonLength: start.getUint32(12, true), dataStart: 8 + start.getUint32(4, true) };
}

export function asarFiles(json: string): { path: string; offset: number; size: number }[] {
  const out: { path: string; offset: number; size: number }[] = [];
  const walk = (node: { files?: Record<string, any> }, base: string) => {
    for (const [name, e] of Object.entries(node.files ?? {})) {
      if (e.files) walk(e, `${base}${name}/`);
      else if (!e.unpacked && !e.link && e.offset !== undefined) {
        out.push({ path: base + name, offset: Number(e.offset), size: Number(e.size) });
      }
    }
  };
  walk(JSON.parse(json), '');
  return out;
}

export interface Counted {
  path: string;
  lang: string;
  code: number;
  bytes: number;
  library: boolean;
  packed: boolean;
}
export interface LocSummary {
  code: number;
  files: number;
  library: number;
  packed: number;
  /** Largest first. */
  langs: { lang: string; code: number; files: number }[];
  /** True when the read limit was reached before every file was read. */
  stopped: boolean;
}

export function summarize(counted: Counted[], stopped = false): LocSummary {
  const by = new Map<string, { lang: string; code: number; files: number }>();
  let code = 0;
  let library = 0;
  let packed = 0;
  for (const c of counted) {
    const l = by.get(c.lang) ?? by.set(c.lang, { lang: c.lang, code: 0, files: 0 }).get(c.lang)!;
    l.code += c.code;
    l.files++;
    code += c.code;
    if (c.library) library += c.code;
    if (c.packed) packed++;
  }
  const langs = [...by.values()].sort((a, b) => b.code - a.code);
  return { code, files: counted.length, library, packed, langs, stopped };
}

const n = (x: number) => x.toLocaleString('en-US');

/** The result as plain text, for the Copy button. */
export function locText(s: LocSummary): string {
  if (!s.files) return 'Lines of code: no source code (a compiled program has none to count)';
  const lib = s.library ? `, ${percent(s.library, s.code)} of them in bundled libraries` : '';
  return `Lines of code: ${n(s.code)} in ${n(s.files)} source files${lib}`;
}

/** At most this much is read, so a huge folder cannot freeze the page. */
export const READ_LIMIT = 300_000_000;

/**
 * Reads and counts every source file, on disk and inside any .asar archive. `files` are the dropped folder's files
 * with the browser's File (or any Blob) for each. Reads a few files at a time and reports progress.
 */
export async function count(
  files: { path: string; size: number; file?: Blob }[],
  progress: (done: number) => void,
  cancelled: () => boolean = () => false,
): Promise<LocSummary> {
  const jobs: { path: string; read: () => Promise<string>; bytes: number }[] = [];
  for (const f of files) {
    if (!f.file || isSkipped(f.path)) continue;
    const blob = f.file;
    if (/\.asar$/i.test(f.path)) {
      try {
        const layout = asarLayout(new DataView(await blob.slice(0, 16).arrayBuffer()));
        if (!layout || 16 + layout.jsonLength > f.size) continue;
        const inside = asarFiles(await blob.slice(16, 16 + layout.jsonLength).text());
        for (const e of inside) {
          if (!languageOf(e.path)) continue;
          const at = layout.dataStart + e.offset;
          jobs.push({ path: `${f.path}/${e.path}`, bytes: e.size, read: () => blob.slice(at, at + e.size).text() });
        }
      } catch {
        // Not an archive this can read; its size still counts above.
      }
    } else if (languageOf(f.path)) jobs.push({ path: f.path, bytes: f.size, read: () => blob.text() });
  }

  const counted: Counted[] = [];
  let read = 0;
  let stopped = false;
  for (let i = 0; i < jobs.length && !cancelled(); i += 32) {
    const batch = jobs.slice(i, i + 32);
    read += batch.reduce((s, j) => s + j.bytes, 0);
    if (read > READ_LIMIT) {
      stopped = true;
      break;
    }
    const texts = await Promise.all(batch.map((j) => j.read().catch(() => null)));
    batch.forEach((j, k) => {
      const t = texts[k];
      if (t === null || !looksLikeCode(t)) return;
      const { lines, code } = countLines(t);
      counted.push({ path: j.path, lang: languageOf(j.path)!, code, bytes: j.bytes, library: isLibrary(j.path), packed: isPacked(t.length, lines) });
    });
    progress(counted.length);
  }
  return summarize(counted, stopped);
}

// Styles for what render() builds. They come with this file so the home page carries none of them until it is used.
const CSS =
  '.loc-head strong{color:var(--paper);font-size:1.125rem;margin-right:.5rem}' +
  '.loc-langs{display:grid;gap:.4rem;margin-top:.8rem}' +
  '.loc-langs li{display:grid;grid-template-columns:minmax(0,11rem) 7rem minmax(0,1fr);gap:.3rem 1rem;align-items:center;color:var(--paper)}' +
  '.loc-langs li>span:nth-child(2){text-align:right}' +
  '.loc-bar{height:5px;background:var(--line)}' +
  '.loc-bar span{display:block;height:100%;min-width:1px;background:var(--mist)}' +
  '.loc-note{margin-top:.8rem;max-width:48rem}' +
  '@media (max-width:620px){.loc-langs li{grid-template-columns:minmax(0,1fr) auto}.loc-bar{grid-column:1/-1}}';

/** Fills the "Lines of code" part of the result. Builds the DOM with textContent only: names come from the visitor's files. */
export function render(el: HTMLElement, s: LocSummary) {
  if (!document.getElementById('loc-css')) document.head.append(Object.assign(document.createElement('style'), { id: 'loc-css', textContent: CSS }));
  const make =(tag: string, cls: string, text = '') => Object.assign(document.createElement(tag), { className: cls, textContent: text });
  const head = make('p', 'loc-head');
  head.append(make('strong', '', 'Lines of code'), ' ');
  const notes: string[] = [];
  if (!s.files) {
    head.append(make('span', 'mono muted', 'none here'));
    notes.push(
      "No source code in this folder. A compiled program has no lines to count; drop a project's source folder to count its code.",
    );
    el.replaceChildren(head, make('p', 'mono muted loc-note', notes.join(' ')));
    return;
  }
  head.append(make('span', 'mono muted', `${n(s.code)} in ${n(s.files)} source files, not counting blank lines`));
  const list = make('ol', 'loc-langs mono');
  const top = s.langs[0].code || 1;
  for (const l of s.langs.slice(0, 8)) {
    const li = make('li', '');
    const bar = make('span', 'loc-bar');
    bar.append(make('span', ''));
    (bar.firstChild as HTMLElement).style.width = `${(l.code / top) * 100}%`;
    li.append(make('span', '', l.lang), make('span', '', n(l.code)), bar);
    list.append(li);
  }
  const rest = s.langs.slice(8);
  if (rest.length) {
    const li = make('li', '');
    li.append(make('span', '', `${rest.length} more languages`), make('span', '', n(rest.reduce((t, l) => t + l.code, 0))));
    list.append(li);
  }
  if (s.library) notes.push(`${percent(s.library, s.code)} of these lines are in bundled libraries (node_modules and the like), not the app's own code.`);
  if (s.packed) {
    notes.push(
      s.packed === 1
        ? '1 file is minified, packed onto a few long lines, so its count is low.'
        : `${n(s.packed)} files are minified, packed onto a few long lines, so their count is low.`,
    );
  }
  if (s.stopped) notes.push(`Stopped after reading ${READ_LIMIT / 1_000_000} MB; the rest was not counted.`);
  el.replaceChildren(head, list, ...(notes.length ? [make('p', 'mono muted loc-note', notes.join(' '))] : []));
}
