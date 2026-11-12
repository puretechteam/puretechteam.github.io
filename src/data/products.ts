// Curated content. Every figure here is copied from a README or release note
// and carries the link it came from. Versions, sizes and dates are not typed
// here: they come from the GitHub snapshot.

const GH = 'https://github.com/puretechteam';

export interface Product {
  slug: string;
  repo: string;
  name: string;
  tagline: string;
  /** One measured or countable fact, shown under the tagline. */
  fact?: string;
  /** True when the site has its own page for it. */
  page: boolean;
  /** Shown in place of a version when nothing has been released. */
  status?: string;
}

export const products: Product[] = [
  {
    slug: 'latheport',
    repo: 'Latheport',
    name: 'Latheport',
    tagline: 'Convert, compress, edit or extract any file.',
    fact: 'Every result is reopened and checked against the original',
    page: true,
  },
  {
    slug: 'framekeep',
    repo: 'framekeep',
    name: 'FrameKeep',
    tagline: 'A low-power, tiny-file screen and camera recorder.',
    fact: '38 MB of RAM while idle in the tray',
    page: true,
  },
  {
    slug: 'childlock',
    repo: 'childlock',
    name: 'ChildLock',
    tagline: 'Lock your keyboard and mouse with one shortcut.',
    fact: '1,000,000 random key presses, 0 unlocks',
    page: true,
  },
  {
    slug: 'bible-widget',
    repo: 'bible-widget',
    name: 'Bible Widget',
    tagline: 'A Bible verse widget for the Windows desktop.',
    fact: '34 translations in 27 languages',
    page: true,
  },
  {
    slug: 'faraday',
    repo: 'project-faraday',
    name: 'Faraday',
    tagline: 'An offline-first password vault.',
    fact: 'Argon2id and AES-256-GCM, no network calls',
    page: true,
  },
  {
    slug: 'locast',
    repo: 'Locast',
    name: 'Locast',
    tagline: 'Local-first watch-together media sharing.',
    page: false,
    status: 'In design, no code yet',
  },
];

export interface Removed {
  name: string;
  /** Latheport version whose release notes record the removal. */
  version: string;
  /** What it used to cost, in the release notes' own words. */
  weight?: string;
}

/** Programs Latheport used to need. Each entry is a line in that version's release notes. */
export const ledger: Removed[] = [
  { name: 'Blender', version: '1.2.0', weight: '1 GB install' },
  { name: 'Calibre', version: '1.2.0', weight: '666.5 MB install' },
  { name: '7-Zip', version: '1.3.0' },
  { name: 'PyMuPDF', version: '1.3.0', weight: '37.7 MB' },
  { name: 'ImageMagick', version: '1.4.0' },
  { name: 'Pandoc', version: '1.4.0' },
  { name: 'DjVuLibre', version: '1.4.0' },
  { name: 'Ghostscript', version: '1.5.0', weight: '24 MB' },
];

/** `note` is the plain word ("version"), `ref` is what it points at ("1.5.0") and takes the value's color. */
export interface MeasureValue {
  value: number;
  text: string;
  note: string;
  ref?: string;
}

export interface Measure {
  id: string;
  product: string;
  label: string;
  before?: MeasureValue;
  after: MeasureValue;
  conditions: string;
  source: { label: string; url: string };
}

export const measures: Measure[] = [
  {
    id: 'download',
    product: 'Latheport',
    label: 'Download size',
    before: { value: 179.1, text: '179.1 MB', note: 'version', ref: '1.2.0' },
    after: { value: 78.3, text: '78.3 MB', note: 'version', ref: '1.5.0' },
    conditions:
      'The Windows zip as published. 1.3.0 was 81.7 MB and 1.4.0 was 77.0 MB. 1.5.0 added a photo editor, a video timeline and PDF tools and came to 78.3 MB. The figure shown is the current release.',
    source: { label: 'Latheport 1.3.0 release notes', url: `${GH}/Latheport/releases/tag/v1.3.0` },
  },
  {
    id: 'epub',
    product: 'Latheport',
    label: 'EPUB to PDF',
    before: { value: 8.91, text: '8.91 s', note: 'through', ref: 'Calibre' },
    after: { value: 1.4, text: '1.40 s', note: 'through', ref: 'bookport' },
    conditions:
      'Median per conversion on the same 13 books, against Calibre 9.17. Memory went from 1,138 MB to 40 MB in the same test.',
    source: { label: 'ConvertAll 1.2.0 release notes', url: `${GH}/Latheport/releases/tag/v1.2.0` },
  },
  {
    id: 'tray',
    product: 'FrameKeep',
    label: 'Memory while idle in the tray',
    before: { value: 68, text: '68 MB', note: 'version', ref: '3.0.0' },
    after: { value: 38, text: '38 MB', note: 'version', ref: '3.1.0' },
    conditions:
      'FrameKeep 3.0.0 against 3.1.0 on the same PC, with the same FFmpeg and the same 120-second desktop sample. In the same test it went from 90 wake-ups a second to 3. The raw data and how to reproduce it are in the repository.',
    source: { label: 'FrameKeep performance notes', url: `${GH}/framekeep/blob/main/docs/perf/README.md` },
  },
  {
    id: 'recording',
    product: 'FrameKeep',
    label: 'An hour of screen recording',
    before: { value: 74, text: '74 MB', note: 'H.264, as in', ref: 'version 2' },
    after: { value: 21, text: '21 MB', note: 'H.266, the', ref: 'Ultra format' },
    conditions:
      'A 30-second desktop sample (code editor, terminal and a web app), 1080p downscaled to 960 by 540 at 5 FPS, Balanced quality, on an i5-12600K. Both score 97.0 on VMAF, so the picture quality is the same. Games and video need far more.',
    source: { label: 'FrameKeep README, How small?', url: `${GH}/framekeep#how-small` },
  },
];

export interface Part {
  repo: string;
  does: string;
  replaced: string;
}

/** The four libraries Latheport's README names as its own, and what each took over. */
export const parts: Part[] = [
  { repo: 'packport', does: 'Archives, discs and disk images', replaced: '7-Zip' },
  { repo: 'bookport', does: 'Ebooks, markup, DjVu and PostScript', replaced: 'Calibre, Pandoc, DjVuLibre, Ghostscript' },
  { repo: 'pixport', does: 'Camera RAW, XCF, EXR, HDR and JPEG XL', replaced: 'ImageMagick' },
  { repo: 'meshport', does: 'FBX, USD, Alembic, 3DS and .blend', replaced: 'Blender' },
];

// ---------------------------------------------------------------- Latheport page

export const latheport = {
  intro:
    'Drop a file in, pick a format, done. Latheport converts, compresses, edits and extracts, and after each conversion it opens the result and compares what it can measure with the original.',
  formerly: 'Latheport was called ConvertAll until version 1.5. Settings, presets and watch folders carry over the first time it opens.',
  install: 'Unzip it and run Latheport\\Latheport.exe. Nothing to install.',

  needs: [
    { name: 'Windows', note: 'The download is a zip. Unzip and run.' },
    { name: 'FFmpeg', note: 'Optional. Only for sound and video. Latheport offers a one-time install from the window.' },
    { name: 'LibreOffice', note: 'Optional. Only for Office documents and drawings. Offered the same way.' },
    { name: 'gmsh', note: 'Optional. Only for STEP, IGES and BREP parts. Downloaded the first time a part needs it.' },
  ],

  kinds: [
    { kind: 'Images', sample: 'png jpg webp gif heic avif psd svg and more', engine: 'Built in' },
    { kind: 'Camera RAW, HDR, JPEG XL', sample: 'dng cr2 cr3 nef arw xcf exr hdr jxl', engine: 'Built in' },
    { kind: 'PDF', sample: 'to images, text or svg; join, split, compress', engine: 'Built in' },
    { kind: 'Ebooks', sample: 'epub mobi azw3 fb2 lit and more', engine: 'Built in' },
    { kind: 'Comics', sample: 'cbz cbr cb7 cbt', engine: 'Built in' },
    { kind: 'Markup', sample: 'md html tex rst org adoc typ', engine: 'Built in' },
    { kind: '3D models', sample: 'stl obj glb gltf fbx usd 3mf abc', engine: 'Built in' },
    { kind: 'CAD', sample: 'step iges brep dxf', engine: 'gmsh for step, iges, brep' },
    { kind: 'Archives', sample: 'zip 7z rar tar iso wim and disk images', engine: 'Built in' },
    { kind: 'Data', sample: 'json yaml toml xml csv xlsx sqlite', engine: 'Built in' },
    { kind: 'Subtitles', sample: 'srt vtt ass ssa sbv ttml', engine: 'Built in' },
    { kind: 'Fonts', sample: 'ttf otf woff woff2', engine: 'Built in' },
    { kind: 'Email, maps, contacts', sample: 'eml msg gpx kml vcf ics', engine: 'Built in' },
    { kind: 'Medical', sample: 'DICOM to png, jpg, tiff', engine: 'Built in' },
    { kind: 'Audio', sample: 'mp3 wav flac ogg opus m4a aac', engine: 'FFmpeg' },
    { kind: 'Video', sample: 'mp4 mkv webm mov avi', engine: 'FFmpeg' },
    { kind: 'Office', sample: 'docx xlsx pptx odt rtf', engine: 'LibreOffice' },
  ],

  measured: [
    {
      label: 'PostScript to PDF, 25 files',
      before: { value: 4.94, text: '4.94 s', note: 'ConvertAll', ref: '1.4.0' },
      after: { value: 2.77, text: '2.77 s', note: 'Latheport', ref: '1.5.0' },
      conditions: 'Both built, the same files on the same PC, taking turns, best of 3.',
      source: { label: 'Latheport 1.5.0 release notes', url: `${GH}/Latheport/releases/tag/v1.5.0` },
    },
    {
      label: 'DjVu to PDF, 20 books',
      before: { value: 388.8, text: '388.8 s', note: 'through', ref: 'DjVuLibre' },
      after: { value: 28.9, text: '28.9 s', note: 'through', ref: 'bookport' },
      conditions: 'The 20 books came to 146 MB instead of 2,194 MB, and the PDFs are searchable.',
      source: { label: 'ConvertAll 1.4.0 release notes', url: `${GH}/Latheport/releases/tag/v1.4.0` },
    },
    {
      label: 'EPUB to PDF',
      before: { value: 8.91, text: '8.91 s', note: 'through', ref: 'Calibre' },
      after: { value: 1.4, text: '1.40 s', note: 'through', ref: 'bookport' },
      conditions: 'Median per conversion on the same 13 books, against Calibre 9.17.',
      source: { label: 'ConvertAll 1.2.0 release notes', url: `${GH}/Latheport/releases/tag/v1.2.0` },
    },
  ],

  smartTools: [
    { name: 'Background remover', size: '190 MB' },
    { name: 'Upscaler', size: '5 MB' },
    { name: 'Text reader (OCR)', size: '10 MB' },
    { name: 'Speech recognition', size: '80 MB' },
  ],
  smartNote:
    'Four tools run a model on your computer. Nothing is sent anywhere. None is in the download: each is fetched once, the first time it is needed, after asking, and checked against its pinned SHA-256.',

  checks:
    'Every conversion is checked afterwards. Latheport opens the result the way the next program would and compares pages, frames, length, parts, triangles, records and words with the original. Only measured facts are shown, never a score. Files bigger than 200 MB are not read again just to check them.',

  limits: [
    'DWG files.',
    'Apple Pages, Numbers and Keynote, .blend, APE and RealMedia as outputs. All of them can be read.',
    'Parquet.',
    'Office macro and template variants (docm, dotx, xlsm, potx) as outputs.',
    'DICOMs compressed with JPEG Lossless (Process 14).',
    'Password-protected archives and copy-protected (DRM) books. They are refused, never unlocked.',
  ],

  license:
    "Latheport's own code is MIT. The Windows download includes libraries under their own licenses, and one of them (the x265 HEIC encoder) is GPL, so the download as a whole is distributed under the GPL's terms.",
};
