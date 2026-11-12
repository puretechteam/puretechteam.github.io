// The open-source libraries. Descriptions follow each README's opening lines.

export interface Library {
  repo: string;
  name: string;
  does: string;
  without: string;
  install: string;
  language: string;
  license: string;
  /** Which Pure Tech program is built on it, where its README or release notes say so. */
  usedIn?: { name: string; href: string };
}

export const libraries: Library[] = [
  {
    repo: 'packport',
    name: 'packport',
    does: 'Reads the archives, installers, disc and disk images 7-Zip reads, and writes RAR, Unix compress, CPIO and WIM.',
    without: 'No 7-Zip, no WinRAR, no dependencies.',
    install: 'pip install git+https://github.com/puretechteam/packport',
    language: 'Python',
    license: 'MIT',
    usedIn: { name: 'Latheport', href: '/software/latheport/' },
  },
  {
    repo: 'bookport',
    name: 'bookport',
    does: 'Reads and writes ebooks in every common and rare format, documents in nine markup languages, DjVu books, and PostScript and EPS.',
    without: 'No Calibre, no Pandoc, no DjVuLibre, no Ghostscript, no dependencies.',
    install: 'pip install git+https://github.com/puretechteam/bookport',
    language: 'Python',
    license: 'MIT',
    usedIn: { name: 'Latheport', href: '/software/latheport/' },
  },
  {
    repo: 'pixport',
    name: 'pixport',
    does: 'Reads camera RAW photos, GIMP XCF, OpenEXR, Radiance HDR and JPEG XL, and writes PNG, TIFF, EXR, HDR and JPEG XL.',
    without: 'No ImageMagick, no LibRaw.',
    install: 'pip install git+https://github.com/puretechteam/pixport',
    language: 'Python with NumPy',
    license: 'MIT',
    usedIn: { name: 'Latheport', href: '/software/latheport/' },
  },
  {
    repo: 'meshport',
    name: 'meshport',
    does: 'Reads and writes FBX, glTF, 3DS, USD, Alembic and OBJ, and reads Blender .blend files.',
    without: 'No FBX SDK, no 3D app, no compiled code.',
    install: 'pip install git+https://github.com/puretechteam/meshport',
    language: 'Python with NumPy',
    license: 'MIT',
    usedIn: { name: 'Latheport', href: '/software/latheport/' },
  },
  {
    repo: 'puretech-tray',
    name: 'puretech-tray',
    does: 'A native Windows tray icon for Python: menus, dark mode that follows Windows, and toast notifications whose buttons call your code.',
    without: 'Pure ctypes. No dependencies.',
    install: 'pip install puretech-tray',
    language: 'Python',
    license: 'MIT',
    usedIn: { name: 'FrameKeep', href: '/software/framekeep/' },
  },
  {
    repo: 'puretech-tray-dotnet',
    name: 'puretech-tray for .NET',
    does: 'The same tray icon for .NET, written straight against Win32 and WinRT. Trimming and Native AOT safe.',
    without: 'No dependencies. There is no NuGet package: reference the project.',
    install: 'dotnet add reference ../puretech-tray-dotnet/src/PureTech.Tray/PureTech.Tray.csproj',
    language: 'C#',
    license: 'MIT',
  },
  {
    repo: 'puretech-player',
    name: 'Pure Tech Player',
    does: 'A playback engine for chunked recordings. It plays a folder of hour-long files as one timeline, from 0.25x to 16x, with lossless clip export.',
    without: 'Pure Python on ctypes, no packages to install. FFmpeg does the decoding.',
    install: 'pip install git+https://github.com/puretechteam/puretech-player',
    language: 'Python',
    license: 'MIT',
    usedIn: { name: 'FrameKeep', href: '/software/framekeep/' },
  },
];
