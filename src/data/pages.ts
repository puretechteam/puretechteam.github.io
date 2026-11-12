// Content for the product pages that share one template.
// Wording follows each project's README; every figure links to where it came from.

import type { ImageMetadata } from 'astro';
import type { Measure } from './products.ts';
import shotFramekeep from '../assets/shots/framekeep.png';
import shotChildlock from '../assets/shots/childlock.png';
import shotBible from '../assets/shots/bible-widget.png';
import shotFaraday from '../assets/shots/faraday.png';

const GH = 'https://github.com/puretechteam';

export interface PageContent {
  intro: string;
  /** How to run the download, in one or two sentences. */
  install: string;
  /** What Windows may say on first run, where the README mentions it. */
  firstRun?: string;
  shot: { src: ImageMetadata; alt: string };
  does: string[];
  needs: { name: string; note: string }[];
  measured?: Omit<Measure, 'id' | 'product'>[];
  /** A small table of figures with the conditions they were measured under. */
  table?: { title: string; head: string[]; rows: string[][]; note: string; source: { label: string; url: string } };
  /** A plain statement that belongs on the page, such as a correction. */
  notice?: { title: string; text: string; source: { label: string; url: string } };
  limitsTitle: string;
  limits: string[];
  license: string;
}

export const pages: Record<string, PageContent> = {
  framekeep: {
    intro:
      'A low-power, tiny-file, non-invasive screen and camera recorder for all the moments you wish you had saved.',
    install:
      'One portable file with everything inside it, FFmpeg included. Put it wherever you like and double-click it.',
    firstRun: 'Windows SmartScreen may warn about an unrecognized app the first time. Choose More info, then Run anyway.',
    shot: { src: shotFramekeep, alt: 'The FrameKeep dashboard' },
    does: [
      'Records the screen in H.266, AV1, H.265 or H.264, a new file every hour by default.',
      'Records webcams, capture cards, phones and network (RTSP) cameras around the clock, with motion marked on a timeline.',
      'Plays a whole day as one timeline in its own player, from 0.25x to 16x, with lossless clip export.',
      'Pauses when you lock the screen, step away, or bring a private app to the front.',
      'Lives in the tray, with a first-run benchmark that recommends the smallest format your CPU handles comfortably.',
    ],
    needs: [
      { name: 'Windows', note: '10 or 11, 64-bit.' },
      { name: 'CPU', note: 'Any quad-core from roughly the last 10 years. Dual-cores over 2 GHz work with the lighter formats.' },
      { name: 'Memory', note: '4 GB of RAM, 8 GB recommended for the Ultra format.' },
      { name: 'GPU', note: 'Not required. If you have one, FrameKeep uses it to capture the screen.' },
    ],
    measured: [
      {
        label: 'Memory while idle in the tray',
        before: { value: 68, text: '68 MB', note: 'version', ref: '3.0.0' },
        after: { value: 38, text: '38 MB', note: 'version', ref: '3.1.0' },
        conditions:
          'FrameKeep 3.0.0 against 3.1.0 on the same PC, with the same FFmpeg and the same 120-second desktop sample.',
        source: { label: 'FrameKeep performance notes', url: `${GH}/framekeep/blob/main/docs/perf/README.md` },
      },
      {
        label: 'Wake-ups a second in the tray',
        before: { value: 90, text: '90', note: 'version', ref: '3.0.0' },
        after: { value: 3, text: '3', note: 'version', ref: '3.1.0' },
        conditions: 'The same test as the memory figure: 3.0.0 against 3.1.0 on the same PC.',
        source: { label: 'FrameKeep performance notes', url: `${GH}/framekeep/blob/main/docs/perf/README.md` },
      },
      {
        label: 'Size of an hour of screen activity',
        before: { value: 74, text: '74 MB', note: 'H.264, as in', ref: 'version 2' },
        after: { value: 21, text: '21 MB', note: 'H.266,', ref: 'Ultra' },
        conditions:
          'A 30-second desktop sample (code editor, terminal and a web app), 1080p downscaled to 960 by 540 at 5 FPS, Balanced quality, on an i5-12600K. Both score VMAF 97.0.',
        source: { label: 'FrameKeep README, How small?', url: `${GH}/framekeep#how-small` },
      },
    ],
    table: {
      title: 'How small, by format',
      head: ['Format', 'Codec', 'Per hour', 'CPU', 'VMAF'],
      rows: [
        ['Ultra', 'H.266 / VVC', '21 MB', '2.7%', '97.0'],
        ['Smallest', 'AV1 screen-content', '32 MB', '1.0%', '97.4'],
        ['Compatible', 'H.264', '53 MB', '0.7%', '96.8'],
        ['Smaller', 'H.265 / HEVC', '61 MB', '1.1%', '96.8'],
        ['Low CPU', 'AV1 on an NVIDIA GPU', '69 MB', '0.6%', '97.5'],
      ],
      note: 'Per hour of screen activity, which is the worst case: idle time, a locked screen and auto-paused time cost close to nothing. Fast-moving content such as games and video needs far more. Your numbers will differ, and the built-in Benchmark measures them on your own PC.',
      source: { label: 'FrameKeep README', url: `${GH}/framekeep#how-small` },
    },
    limitsTitle: 'What it does not do',
    limits: [
      'It never uploads anything and has no telemetry. The only network connections it makes are to network cameras you add yourself.',
      'It never edits, converts, moves or deletes an existing desktop recording. Deleting old recordings is up to you.',
      'Desktop audio is off unless you turn it on.',
      "H.266 files do not open in Windows' built-in player or in browsers yet. FrameKeep's own player opens them, and Share copy makes an H.264 file that plays anywhere.",
    ],
    license: 'FrameKeep is MIT. The FFmpeg inside the download is a separate program under GPLv3.',
  },

  childlock: {
    intro:
      'Lock your keyboard and mouse with one shortcut, so a kid (or a cat) can bang on the keys and grab the mouse without anything happening. Whatever is on screen keeps playing. Type a secret word to unlock.',
    install: 'One exe, no installer. Put it anywhere and run it. A padlock appears in the notification area.',
    shot: { src: shotChildlock, alt: 'ChildLock settings in the dark theme' },
    does: [
      'Locks every key, including Win, Alt+Tab, Alt+F4 and the media keys, plus the whole mouse or touchpad.',
      'Or locks only the keyboard, or only the mouse.',
      'Unlocks when you type your secret word, or hold the lock hotkey (Ctrl+Alt+L) for 3 seconds.',
      'Cleaning mode blacks out every screen and locks input while you wipe the keyboard. It ends by itself after a minute.',
      'Keeps the PC awake while locked, so a video is not cut off by sleep or the screensaver.',
      'Locks from a hotkey, from the tray menu, or after a set number of idle minutes.',
    ],
    needs: [
      { name: 'Windows', note: '10 or 11, 64-bit.' },
      { name: '.NET 10', note: 'The Desktop Runtime. Windows offers to install it the first time if it is missing.' },
      { name: 'Admin rights', note: 'Optional. With them ChildLock can also block input aimed at admin windows such as Task Manager.' },
    ],
    measured: [
      {
        label: 'Random key presses without unlocking',
        after: { value: 1_000_000, text: '1,000,000', note: '0 unlocks' },
        conditions: 'A test of 1,000,000 random key presses against the default unlock word, "unlock". It never unlocked.',
        source: { label: 'ChildLock README', url: `${GH}/childlock#features` },
      },
    ],
    limitsTitle: 'What it cannot block',
    limits: [
      'Ctrl+Alt+Del. Windows reserves it and no app can block it. ChildLock treats it as your way out and unlocks.',
      'Win+L and Windows locking. If Windows locks, ChildLock unlocks itself.',
      'The power and sleep buttons. Those belong to Windows power settings.',
      'Touchpad gestures with 3 and 4 fingers have not been verified yet.',
      'Touchscreens and pens are not tested yet, and probably not fully blocked.',
      'Ending ChildLock from Task Manager. Someone at an unlocked PC can always do that.',
      'The unlock word is stored as plain text. It is a kid-proofing word, not a password.',
    ],
    license: 'ChildLock is MIT.',
  },

  'bible-widget': {
    intro:
      'A transparent desktop widget that displays Bible verses on your screen. It sits on your desktop, stays out of the way, and gives you a new verse every hour, every 15 minutes or once a day.',
    install: 'Unzip it anywhere you can write to and run BibleWidget.exe. Nothing else to install: no Python, no setup.',
    firstRun:
      'The app is not code-signed, so Windows SmartScreen may say "Windows protected your PC" the first time. Choose More info, then Run anyway.',
    shot: { src: shotBible, alt: 'The widget on the desktop' },
    does: [
      '34 Bible translations in 27 languages, and a menu in 29 languages.',
      'Drag it anywhere. It snaps to the nearest screen corner and reopens in the same spot.',
      'Find a verse, keep favorites, and look back through history.',
      'Save a verse as an image.',
      'Pick your own colors for the text, background and separator line.',
      'Updates install from inside the app. If a new version fails to start, the one you had is put back.',
    ],
    needs: [
      { name: 'Windows', note: '10 or 11.' },
      { name: 'Nothing else', note: 'The download needs nothing else.' },
    ],
    notice: {
      title: 'A correction',
      text: 'Versions 1.1.0 to 2.0.2 shipped ten Bible translations we did not have the right to share, and said that every Bible in the app was public domain. That was wrong, and we are sorry. Version 2.1.0 removes all ten. Every Bible in the app now has its license, year and source recorded.',
      source: { label: 'Bible Widget README', url: `${GH}/bible-widget#a-correction` },
    },
    limitsTitle: 'What to know',
    limits: [
      'Windows SmartScreen warns on first run, because the exe is not code-signed.',
      'Settings, favorites and history are saved next to the app, so do not unzip it into Program Files.',
      'It works offline. The only network use is the optional update check.',
    ],
    license:
      'The app is CC0 1.0. The Bible texts keep their own status: 30 are public domain and 4 are under CC BY-SA 4.0.',
  },

  faraday: {
    intro:
      'An offline-first vault for passwords, two-factor codes and cryptocurrency addresses. All key derivation and encryption happen on your machine. There are no cloud services, no network calls and no telemetry.',
    install: 'Unzip it anywhere and run Faraday.exe. No Python needed.',
    shot: { src: shotFaraday, alt: 'The Faraday overview screen, using a demo vault with made-up data' },
    does: [
      'Keeps logins, notes, cards, identities, two-factor secrets, Wi-Fi records, documents, API keys and crypto addresses.',
      'Several independent vaults, each with its own key.',
      'Live two-factor codes for stored authenticator secrets.',
      'A password and passphrase generator.',
      'Imports from Bitwarden, KeePass and KeePassXC, and exports to a single password-protected file.',
      'Locks after an idle time you choose, and when Windows locks or sleeps.',
      'Keeps an encrypted copy of the previous version before every save.',
      'A desktop app and a command line.',
    ],
    needs: [
      { name: 'Windows', note: '10 or 11 for the download.' },
      { name: 'From source', note: 'Python 3.10 or later. Linux and macOS also work this way.' },
    ],
    table: {
      title: 'How the vault is protected',
      head: ['Part', 'What is used'],
      rows: [
        ['Key derivation', 'Argon2id, with standard, high and maximum levels'],
        ['Encryption', 'AES-256-GCM, with a unique nonce for each operation'],
        ['File format', 'CBOR, a binary format'],
        ['Saves', 'Atomic writes, with rollback on failure'],
      ],
      note: 'Cryptographic correctness takes precedence over convenience. The full threat model is in the security policy.',
      source: { label: 'Faraday security policy', url: `${GH}/project-faraday/blob/main/SECURITY.md` },
    },
    limitsTitle: 'What it does not protect against',
    limits: [
      'A compromised operating system, or malware.',
      'Keyloggers and screen capture software.',
      'Live memory analysis.',
      'Social engineering.',
    ],
    license: 'Faraday is MIT.',
  },
};
