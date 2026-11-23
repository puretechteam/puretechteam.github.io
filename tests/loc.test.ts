// Lines of code for "What's in this app?". Folder contents here are made up for the tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asarFiles, asarLayout, count, countLines, isLibrary, isPacked, languageOf, locText, looksLikeCode, summarize } from '../src/lib/loc.ts';

/** An app.asar laid out the way Electron's asar tool writes one: two pickles, the JSON file list, then the data. */
function makeAsar(files: Record<string, string>, unpacked: string[] = []): Uint8Array {
  const enc = new TextEncoder();
  const root: any = { files: {} };
  const chunks: Uint8Array[] = [];
  let offset = 0;
  for (const [path, text] of Object.entries(files)) {
    const parts = path.split('/');
    let node = root;
    for (const dir of parts.slice(0, -1)) node = node.files[dir] ??= { files: {} };
    const bytes = enc.encode(text);
    node.files[parts.at(-1)!] = { size: bytes.length, offset: String(offset) };
    chunks.push(bytes);
    offset += bytes.length;
  }
  for (const path of unpacked) root.files[path] = { size: 10, unpacked: true };
  const json = enc.encode(JSON.stringify(root));
  const padded = Math.ceil(json.length / 4) * 4;
  const headerPickle = new Uint8Array(8 + padded);
  const hv = new DataView(headerPickle.buffer);
  hv.setUint32(0, 4 + padded, true);
  hv.setUint32(4, json.length, true);
  headerPickle.set(json, 8);
  const sizePickle = new Uint8Array(8);
  const sv = new DataView(sizePickle.buffer);
  sv.setUint32(0, 4, true);
  sv.setUint32(4, headerPickle.length, true);
  const out = new Uint8Array(8 + headerPickle.length + offset);
  out.set(sizePickle, 0);
  out.set(headerPickle, 8);
  let at = 8 + headerPickle.length;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

test('loc: languages come from the extension, and data files are not code', () => {
  assert.equal(languageOf('src/app.ts'), 'TypeScript');
  assert.equal(languageOf('GAME/Player.GD'), 'GDScript');
  assert.equal(languageOf('lib/x.min.js'), 'JavaScript');
  assert.equal(languageOf('include/x.h'), 'C/C++ header');
  assert.equal(languageOf('package.json'), null);
  assert.equal(languageOf('README.md'), null);
  assert.equal(languageOf('Makefile'), null);
  assert.equal(languageOf('.gitignore'), null);
  assert.equal(languageOf('folder.js/readme'), null);
});

test('loc: lines are counted the way editors number them, and blank lines are not code', () => {
  assert.deepEqual(countLines(''), { lines: 0, code: 0 });
  assert.deepEqual(countLines('a'), { lines: 1, code: 1 });
  assert.deepEqual(countLines('a\n'), { lines: 1, code: 1 });
  assert.deepEqual(countLines('a\n\nb'), { lines: 3, code: 2 });
  assert.deepEqual(countLines('a\r\n\r\nb\r\n'), { lines: 3, code: 2 });
  assert.deepEqual(countLines('  \n\t\n'), { lines: 2, code: 0 });
});

test('loc: bundled libraries and minified files are told apart', () => {
  assert.equal(isLibrary('resources/app.asar/node_modules/react/index.js'), true);
  assert.equal(isLibrary('src/vendor/zlib/inflate.c'), true);
  assert.equal(isLibrary('Lib/site-packages/numpy/core.py'), true);
  assert.equal(isLibrary('src/app.js'), false);
  assert.equal(isPacked(100_000, 2), true);
  assert.equal(isPacked(100_000, 3_000), false);
  assert.equal(isPacked(2_000, 1), false);
});

test('loc: reads the file list out of an app.asar header', () => {
  const asar = makeAsar({ 'main.js': 'a\nb\n', 'node_modules/x/i.js': 'c\n' }, ['native.node']);
  const layout = asarLayout(new DataView(asar.buffer, 0, 16))!;
  assert.ok(layout);
  const json = new TextDecoder().decode(asar.slice(16, 16 + layout.jsonLength));
  const files = asarFiles(json);
  // The unpacked file lives on disk beside the archive, so it is not listed as inside it.
  assert.deepEqual(
    files.map((f) => f.path),
    ['main.js', 'node_modules/x/i.js'],
  );
  const main = files[0];
  const text = new TextDecoder().decode(asar.slice(layout.dataStart + main.offset, layout.dataStart + main.offset + main.size));
  assert.equal(text, 'a\nb\n');
  assert.equal(asarLayout(new DataView(new Uint8Array(16).buffer)), null);
});

test('loc: counts a folder on disk and the code inside its app.asar, skipping .git and non-code', async () => {
  const asar = makeAsar({ 'main.js': 'one\ntwo\n\nthree\n', 'node_modules/lib/index.js': 'x\ny\n', 'icon.png': 'not code' });
  const blob = (s: string | Uint8Array) => new Blob([s]);
  const files = [
    { path: 'src/game.gd', text: 'func _ready():\n\tpass\n\n' },
    { path: 'src/util.ts', text: 'export const a = 1;\n' },
    { path: '.git/objects/old.ts', text: 'old\nold\nold\n' },
    { path: 'logo.png', text: 'png' },
  ].map((f) => ({ path: f.path, size: f.text.length, file: blob(f.text) }));
  files.push({ path: 'resources/app.asar', size: asar.length, file: blob(asar) });
  let progress = 0;
  const s = await count(files, (n) => (progress = n));
  assert.equal(s.files, 4);
  assert.equal(s.code, 2 + 1 + 3 + 2);
  assert.equal(s.library, 2);
  assert.equal(progress, 4);
  assert.deepEqual(
    s.langs.map((l) => `${l.lang} ${l.code}`),
    ['JavaScript 5', 'GDScript 2', 'TypeScript 1'],
  );
  assert.equal(s.stopped, false);
});

test('loc: license pages, binaries and XML that share an extension with code are left out', async () => {
  const nul = String.fromCharCode(0);
  assert.equal(looksLikeCode('const a = 1;\n'), true);
  assert.equal(looksLikeCode('G@' + nul + nul + 'binary video segment'), false);
  assert.equal(looksLikeCode('<?xml version="1.0"?>\n<TS version="2.1">\n'), false);
  assert.equal(looksLikeCode('<!doctype html>\n<p>hi</p>\n'), true);
  const blob = (s: string) => new Blob([s]);
  const files = [
    { path: 'main.js', text: 'a\nb\n' },
    { path: 'LICENSES.chromium.html', text: '<p>MIT</p>\n'.repeat(50) },
    { path: 'licenses/zlib.c', text: 'not counted\n' },
    { path: 'media/intro.ts', text: 'G@' + nul + 'x\ny\n' },
    { path: 'i18n/app_de.ts', text: '<?xml version="1.0"?>\n<TS/>\n' },
    { path: 'third_party/zlib/inflate.c', text: 'int x;\n' },
  ].map((f) => ({ path: f.path, size: f.text.length, file: blob(f.text) }));
  const s = await count(files, () => {});
  assert.deepEqual(
    s.langs.map((l) => `${l.lang} ${l.code}`),
    ['JavaScript 2', 'C 1'],
  );
  assert.equal(s.library, 1);
});

test('loc: the copied text, with and without code, has no em-dash', () => {
  const some = summarize([
    { path: 'a.js', lang: 'JavaScript', code: 900, bytes: 9000, library: true, packed: false },
    { path: 'b.js', lang: 'JavaScript', code: 100, bytes: 1000, library: false, packed: true },
  ]);
  assert.equal(locText(some), 'Lines of code: 1,000 in 2 source files, 90% of them in bundled libraries');
  assert.equal(some.packed, 1);
  const none = summarize([]);
  assert.equal(locText(none), 'Lines of code: no source code (a compiled program has none to count)');
  for (const t of [locText(some), locText(none)]) assert.ok(!t.includes(String.fromCharCode(0x2014)));
});
