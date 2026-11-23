// The working part of "What's in this app?" (AppScan.astro): reads a dropped or chosen folder, sorts it
// (appscan.ts), counts its lines of code (loc.ts) and shows the result. The page loads only a small starter; this
// file is fetched from this site the first time a file is dragged over the page or a button is pointed at.
// Everything it reads stays in the page: nothing is sent anywhere.

import { classify, filesCount, percent, resultText, type ScanFile, type ScanResult } from './appscan.ts';
import { formatBytes } from './data.ts';
import { count, locText, render } from './loc.ts';

type Add = (file: ScanFile) => boolean;
const MAX = 100_000;
const SHOWN = 50;

export function init(box: HTMLElement) {
  const q = <T extends HTMLElement = HTMLElement>(s: string) => box.querySelector(s) as T;
  const status = q('[data-status]');
  const result = q('[data-result]');
  const row = q<HTMLTemplateElement>('[data-row]');
  let last: ScanResult;
  let loc = '';
  let runs = 0;
  let busy = false;
  let unread = 0;

  const say = (s: string, quiet = false) => {
    status.textContent = s;
    status.classList.toggle('sr-only', quiet);
  };

  async function run(name: string, walk: (add: Add) => Promise<unknown>) {
    if (busy) return;
    busy = true;
    unread = 0;
    result.hidden = true;
    box.scrollIntoView({ block: 'nearest' });
    const files: ScanFile[] = [];
    let full = false;
    say('Reading...');
    try {
      await walk((f) => {
        if (files.length >= MAX) {
          full = true;
          return false;
        }
        if (files.push(f) % 250 === 0) say(`Reading... ${filesCount(files.length)}`);
        return true;
      });
      show(name, files, full);
      if (files.length) lines(files);
    } catch {
      say('That folder could not be read.');
    }
    busy = false;
  }

  // Lines of code come after the sizes, since they mean reading the files. A newer drop cancels an older count.
  async function lines(files: ScanFile[]) {
    const id = ++runs;
    const el = q('[data-loc]');
    const now = () => id === runs;
    loc = '';
    el.textContent = 'Counting lines of code...';
    try {
      const s = await count(files, (n) => now() && (el.textContent = `Counting lines of code... ${filesCount(n)}`), () => !now());
      if (!now()) return;
      render(el, s);
      loc = locText(s);
      say(`${loc}.`, true);
    } catch {
      if (now()) el.textContent = 'The lines of code could not be counted.';
    }
  }

  function show(name: string, files: ScanFile[], full: boolean) {
    if (!files.length) return say('That folder has no files in it.');
    const r = (last = classify(name, files));
    const total = `${formatBytes(r.total)} in ${filesCount(r.count)}`;
    q('[data-name]').textContent = r.name;
    q('[data-total]').textContent = total;
    q('[data-note]').textContent =
      (r.engine === 'WebView2' ? 'It uses the WebView2 that comes with Windows, not a browser of its own. ' : '') +
      (full ? `Stopped at ${filesCount(MAX)}. ` : '') +
      (unread ? `${filesCount(unread)} could not be read. ` : '');
    q('[data-groups]').replaceChildren(
      ...r.groups.map((g) => {
        const li = row.content.firstElementChild!.cloneNode(true) as HTMLElement;
        const set = (s: string, t: string) => (li.querySelector(s)!.textContent = t);
        li.dataset.id = g.id;
        set('.scan-label', g.label);
        set('.scan-size', formatBytes(g.bytes));
        set('.scan-pct', percent(g.bytes, r.total));
        li.querySelector<HTMLElement>('.scan-bar span')!.style.width = `${r.total ? (g.bytes / r.total) * 100 : 0}%`;
        const list = li.querySelector('ol')!;
        const line = (...parts: string[]) => {
          const item = document.createElement('li');
          for (const p of parts) item.append(Object.assign(document.createElement('span'), { textContent: p }));
          list.append(item);
        };
        for (const f of g.files.slice(0, SHOWN)) line(f.path, formatBytes(f.size));
        const rest = g.files.slice(SHOWN);
        if (rest.length) line(`and ${rest.length.toLocaleString('en-US')} more`, formatBytes(rest.reduce((s, f) => s + f.size, 0)));
        return li;
      }),
    );
    say(`${r.name}: ${total}, sorted below.`, true);
    result.hidden = false;
  }

  const entries = (reader: FileSystemDirectoryReader) => new Promise<FileSystemEntry[]>((ok, no) => reader.readEntries(ok, no));
  const fileOf = (e: FileSystemEntry) =>
    new Promise<File | null>((ok) => (e as FileSystemFileEntry).file(ok, () => (unread++, ok(null))));
  async function walk(dir: FileSystemDirectoryEntry, base: string, add: Add): Promise<boolean> {
    const reader = dir.createReader();
    for (;;) {
      const batch = await entries(reader);
      if (!batch.length) return true;
      const found = await Promise.all(batch.map((e) => (e.isFile ? fileOf(e) : null)));
      for (const [i, e] of batch.entries()) {
        const path = base + e.name;
        if (e.isDirectory) {
          if (!(await walk(e as FileSystemDirectoryEntry, `${path}/`, add))) return false;
        } else if (found[i] && !add({ path, size: found[i]!.size, file: found[i]! })) return false;
      }
    }
  }

  q('[data-copy]').addEventListener('click', async (e) => {
    const b = e.currentTarget as HTMLElement;
    const text = resultText(last, loc ? [loc] : []);
    let done = false;
    try {
      await navigator.clipboard.writeText(text);
      done = true;
    } catch {
      // Older and embedded browsers: copy from a hidden text box.
      const t = Object.assign(document.createElement('textarea'), { value: text });
      t.style.cssText = 'position:fixed;opacity:0';
      document.body.append(t);
      t.select();
      done = document.execCommand('copy');
      t.remove();
    }
    b.textContent = done ? 'Copied' : 'Could not copy';
    setTimeout(() => (b.textContent = 'Copy result'), 2000);
  });
  q('[data-again]').addEventListener('click', () => {
    runs++;
    result.hidden = true;
    say('');
    q('[data-pick]').focus();
  });

  return {
    /** A dragged folder. */
    folder: (entry: FileSystemDirectoryEntry) => run(entry.name, (add) => walk(entry, '', add)),
    /** A single dragged file: say what it is and ask for the folder. */
    file(f: File) {
      result.hidden = true;
      say(
        /\.lnk$/i.test(f.name)
          ? 'That is a shortcut. Right-click it, choose Open file location, and drag that folder here.'
          : `${f.name}: ${formatBytes(f.size)}. Drop the whole folder to see what is inside.`,
      );
    },
    /** The files of a folder picked with the button, each with its path inside that folder. */
    list(list: File[]) {
      const name = list[0].webkitRelativePath.split('/')[0];
      run(name, async (add) => {
        for (const f of list) if (!add({ path: f.webkitRelativePath.slice(name.length + 1), size: f.size, file: f })) return;
      });
    },
  };
}
