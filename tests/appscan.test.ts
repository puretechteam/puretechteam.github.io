// The "What's in this app?" sorting rules, on made-up folder layouts. Sizes here are test data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, findEngine, percent, resultText, type ScanFile, type ScanResult } from '../src/lib/appscan.ts';

const files = (list: Record<string, number>): ScanFile[] => Object.entries(list).map(([path, size]) => ({ path, size }));
const group = (r: ScanResult, id: string) => r.groups.find((g) => g.id === id);
const pathsIn = (r: ScanResult, id: string) => (group(r, id)?.files.map((f) => f.path) ?? []).sort();

const electron = files({
  'Update.exe': 1_900_000,
  'app-1.0.0/Some.exe': 160_000_000,
  'app-1.0.0/crashpad_handler.exe': 1_000_000,
  'app-1.0.0/resources/app.asar': 30_000_000,
  'app-1.0.0/resources/app.asar.unpacked/native.node': 500_000,
  'app-1.0.0/resources.pak': 6_000_000,
  'app-1.0.0/chrome_100_percent.pak': 150_000,
  'app-1.0.0/icudtl.dat': 10_000_000,
  'app-1.0.0/v8_context_snapshot.bin': 600_000,
  'app-1.0.0/libGLESv2.dll': 7_000_000,
  'app-1.0.0/ffmpeg.dll': 2_800_000,
  'app-1.0.0/locales/en-US.pak': 400_000,
  'app-1.0.0/locales/de.pak': 450_000,
  'app-1.0.0/locales/fr.pak': 460_000,
  'app-1.0.0/LICENSES.chromium.html': 9_000_000,
});

test('appscan: an Electron app, with the renamed Electron exe counted as the browser', () => {
  const r = classify('Some', electron);
  assert.equal(r.engine, 'Electron');
  assert.equal(r.count, 15);
  assert.equal(r.total, 230_260_000);
  assert.deepEqual(pathsIn(r, 'browser'), [
    'app-1.0.0/Some.exe',
    'app-1.0.0/chrome_100_percent.pak',
    'app-1.0.0/ffmpeg.dll',
    'app-1.0.0/icudtl.dat',
    'app-1.0.0/libGLESv2.dll',
    'app-1.0.0/resources.pak',
    'app-1.0.0/v8_context_snapshot.bin',
  ]);
  assert.equal(group(r, 'browser')!.label, 'Bundled web browser (Electron)');
  // Locale .pak files are translations, not browser: the translations rule comes first.
  assert.equal(group(r, 'translations')!.label, 'Translations (3 languages)');
  assert.deepEqual(pathsIn(r, 'updater'), ['Update.exe', 'app-1.0.0/crashpad_handler.exe']);
  assert.deepEqual(pathsIn(r, 'licenses'), ['app-1.0.0/LICENSES.chromium.html']);
  assert.deepEqual(pathsIn(r, 'program'), ['app-1.0.0/resources/app.asar', 'app-1.0.0/resources/app.asar.unpacked/native.node']);
  // Largest group first, and the largest file first inside a group.
  assert.equal(r.groups[0].id, 'browser');
  assert.equal(r.groups[0].files[0].path, 'app-1.0.0/Some.exe');
  assert.equal(r.groups.reduce((s, g) => s + g.bytes, 0), r.total);
});

test('appscan: CEF and plain Chromium are told apart from Electron, and their exe stays the program', () => {
  const cef = classify('Cef', files({ 'app.exe': 5_000_000, 'libcef.dll': 150_000_000, 'icudtl.dat': 10_000_000, 'resources.pak': 5_000_000 }));
  assert.equal(cef.engine, 'CEF');
  assert.deepEqual(pathsIn(cef, 'program'), ['app.exe']);
  assert.equal(group(cef, 'browser')!.label, 'Bundled web browser (CEF)');

  const chromium = classify('Browser', files({ 'browser.exe': 3_000_000, 'browser.dll': 200_000_000, 'icudtl.dat': 10_000_000, 'resources.pak': 5_000_000 }));
  assert.equal(chromium.engine, 'Chromium');
  assert.deepEqual(pathsIn(chromium, 'program'), ['browser.dll', 'browser.exe']);
});

test('appscan: browser files count as a browser only when an engine is really there', () => {
  const r = classify('Small', files({ 'app.exe': 2_000_000, 'WebView2Loader.dll': 160_000, 'data.pak': 100_000, 'ffmpeg.dll': 3_000_000 }));
  assert.equal(r.engine, 'WebView2');
  assert.equal(group(r, 'browser'), undefined);
  assert.deepEqual(pathsIn(r, 'media'), ['ffmpeg.dll']);
  assert.deepEqual(pathsIn(r, 'program'), ['WebView2Loader.dll', 'app.exe', 'data.pak']);
  assert.match(resultText(r), /Uses the WebView2 that comes with Windows/);
});

test('appscan: a self-contained .NET app, with satellite translations and debug files', () => {
  const r = classify(
    'Net',
    files({
      'App.exe': 150_000,
      'App.dll': 900_000,
      'App.pdb': 300_000,
      'coreclr.dll': 7_000_000,
      'hostfxr.dll': 400_000,
      'System.Private.CoreLib.dll': 15_000_000,
      'System.Text.Json.dll': 1_500_000,
      'Microsoft.Win32.Primitives.dll': 30_000,
      'PresentationFramework.dll': 16_000_000,
      'wpfgfx_cor3.dll': 2_000_000,
      'Microsoft.Extensions.Logging.dll': 60_000,
      'de/App.resources.dll': 20_000,
      'zh-Hans/PresentationFramework.resources.dll': 900_000,
    }),
  );
  assert.equal(r.engine, null);
  assert.equal(pathsIn(r, 'dotnet').length, 7);
  assert.equal(group(r, 'translations')!.label, 'Translations (2 languages)');
  assert.deepEqual(pathsIn(r, 'debug'), ['App.pdb']);
  // A library the app chose is part of the program, not the runtime.
  assert.deepEqual(pathsIn(r, 'program'), ['App.dll', 'App.exe', 'Microsoft.Extensions.Logging.dll']);
});

test('appscan: Qt folders count only when Qt is there', () => {
  const qtApp = classify(
    'Qt',
    files({
      'app.exe': 4_000_000,
      'Qt6Core.dll': 6_000_000,
      'Qt6Gui.dll': 9_000_000,
      'platforms/qwindows.dll': 900_000,
      'styles/qmodernwindowsstyle.dll': 200_000,
      'translations/qt_de.qm': 150_000,
      'vcruntime140.dll': 120_000,
      'msvcp140.dll': 560_000,
      'unins000.exe': 3_000_000,
      'unins000.dat': 50_000,
      'README.txt': 2_000,
    }),
  );
  assert.equal(pathsIn(qtApp, 'qt').length, 4);
  assert.deepEqual(pathsIn(qtApp, 'translations'), ['translations/qt_de.qm']);
  assert.deepEqual(pathsIn(qtApp, 'vcrt'), ['msvcp140.dll', 'vcruntime140.dll']);
  assert.deepEqual(pathsIn(qtApp, 'updater'), ['unins000.dat', 'unins000.exe']);
  assert.deepEqual(pathsIn(qtApp, 'licenses'), ['README.txt']);

  const noQt = classify('NoQt', files({ 'app.exe': 1_000, 'styles/main.css': 1_000, 'platforms/x.json': 1_000 }));
  assert.equal(noQt.groups.length, 1);
  assert.equal(noQt.groups[0].id, 'program');
});

test('appscan: a PyInstaller app and a Java app', () => {
  const py = classify(
    'Py',
    files({
      'app.exe': 3_000_000,
      '_internal/python312.dll': 6_000_000,
      '_internal/base_library.zip': 1_300_000,
      '_internal/_ssl.pyd': 180_000,
      '_internal/VCRUNTIME140.dll': 120_000,
    }),
  );
  assert.equal(pathsIn(py, 'python').length, 3);
  assert.deepEqual(pathsIn(py, 'vcrt'), ['_internal/VCRUNTIME140.dll']);

  const java = classify('Java', files({ 'app.exe': 500_000, 'jre/bin/server/jvm.dll': 9_000_000, 'jre/lib/modules': 40_000_000, 'app.jar': 8_000_000 }));
  assert.equal(pathsIn(java, 'java').length, 2);
  assert.deepEqual(pathsIn(java, 'program'), ['app.exe', 'app.jar']);
});

test('appscan: a program with nothing extra is 100% the program', () => {
  const r = classify('ChildLock', files({ 'ChildLock.exe': 420_841 }));
  assert.equal(r.groups.length, 1);
  assert.equal(r.groups[0].label, 'The program itself');
  assert.equal(percent(r.groups[0].bytes, r.total), '100%');
  assert.equal(
    resultText(r),
    'ChildLock: 421 KB in 1 file\nThe program itself: 421 KB (100%)\nMeasured with puretechteam.github.io. Nothing was uploaded.',
  );
});

test('appscan: Windows paths and capitals are read the same way', () => {
  assert.equal(findEngine(['app\\icudtl.dat'.replace(/\\/g, '/'), 'app/resources.pak', 'app/resources/app.asar']).engine, 'Electron');
  const r = classify('Win', files({ 'Bin\\UPDATER.EXE': 10, 'Bin\\Tool.PDB': 10 }));
  assert.deepEqual(
    r.groups.map((g) => g.id).sort(),
    ['debug', 'updater'],
  );
});

// Cases found by sorting four installed programs (names and sizes only) on 2026-11-17.
test('appscan: prefixed locale files count once per language', () => {
  const r = classify(
    'Prefixed',
    files({ 'icudtl.dat': 1, 'resources.pak': 1, 'Locales/af.pak': 1, 'Locales/copilot_overlay_strings_af.pak': 1, 'Locales/es-419.pak': 1 }),
  );
  assert.equal(group(r, 'translations')!.label, 'Translations (2 languages)');
});

test('appscan: an updater folder, an installer and video encoders', () => {
  const r = classify(
    'Editor',
    files({ 'editor.exe': 1, 'updater/GUP.exe': 1, 'updater/libcurl.dll': 1, 'Installer/setup.exe': 1, 'bin/libx264-164.dll': 1 }),
  );
  assert.deepEqual(pathsIn(r, 'updater'), ['Installer/setup.exe', 'updater/GUP.exe', 'updater/libcurl.dll']);
  assert.deepEqual(pathsIn(r, 'media'), ['bin/libx264-164.dll']);
});

test('appscan: a Python plugin without Python itself stays the program', () => {
  const r = classify('Studio', files({ 'studio.exe': 1, 'scripting/_studiopython.pyd': 1 }));
  assert.deepEqual(pathsIn(r, 'program'), ['scripting/_studiopython.pyd', 'studio.exe']);
});

test('appscan: shares read the way people say them', () => {
  assert.equal(percent(0, 100), '0%');
  assert.equal(percent(1, 1000), '<1%');
  assert.equal(percent(5, 10), '50%');
  assert.equal(percent(5, 0), '0%');
  // 580,841 of 582,841 bytes is 99.7%: not all of it, so not "100%" beside a "<1%".
  assert.equal(percent(580_841, 582_841), '>99%');
  assert.equal(percent(10, 10), '100%');
});

test('appscan: no em-dash in anything it can show', () => {
  for (const r of [classify('Some', electron), classify('X', files({ 'a.exe': 1, 'WebView2Loader.dll': 1 }))]) {
    assert.ok(!resultText(r).includes(String.fromCharCode(0x2014)));
  }
});
