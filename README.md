# Pure Tech website

The official website for Pure Tech: independent software for Windows.

The site is static. It is built with [Astro](https://astro.build), ships no client framework, makes no
third-party requests and sets no cookies. Every version, file size and date on it comes from a snapshot of
the public GitHub releases, and every measured figure links to the README or release note it was copied from.

## Pages

| Route | What it is |
|---|---|
| `/` | Home: "What's in this app?", what Latheport no longer needs, the software list, a games teaser, measured numbers, libraries, merged upstream pull requests, and "Lately": the newest releases beside the newest posts on X |
| `/software/` | Every current program with its version, download size and release date |
| `/software/<name>/` | One page per program: download, checksum, what it does, what it needs, measurements, limits |
| `/libraries/` | The open-source libraries, with install lines |
| `/upstream/` | Pull requests merged into projects Pure Tech does not own |
| `/updates/` | Every release, newest first, with an RSS feed at `/updates.xml` |
| `/about/` | How Pure Tech builds, where to find it, and how this site works |
| `/sitemap.xml`, `/robots.txt` | For search engines |

## Requirements

- Node.js 22.12 or newer (developed on 24)
- npm

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start the development server |
| `npm run build` | Build to `dist/`, then measure every page and fail if a budget is broken |
| `npm run preview` | Serve the built site locally |
| `npm test` | Run the tests |
| `npm run snapshot` | Refresh `src/data/snapshot.json` from the GitHub API |
| `npm run posts` | Refresh `src/data/x-posts.json`, the text of the posts listed in `src/data/x.mjs` |
| `node scripts/make-cards.mjs` | Make the preview cards in `public/cards/` that show when a page is shared. Needs Edge or Chrome. Run it when a program's name, tagline or fact changes, or a program is added |
| `node scripts/encode-video.mjs <file> [name]` | Encode a video for the site (H.264 MP4 and a WebP poster in `public/media/`) and print the entry for `src/data/games.ts`. Needs ffmpeg |
| `npm run check-links` | Check every internal link in the built site (add `-- --external` to request outside links too) |

Astro's usage telemetry is switched off for every command (see `scripts/astro.mjs`).

## How content gets on the site

- **What appears:** only repositories named in `src/data/roster.mjs`. Nothing else is shown.
- **Versions, sizes, dates, checksums:** `src/data/snapshot.json`, written by `npm run snapshot`. A normal
  build reads the snapshot and needs no network. A version is the newest of a repository's published
  releases and its version tags, so a library that is tagged but has no GitHub release still shows one.
- **Words and measured figures:** `src/data/products.ts`, `src/data/pages.ts` and `src/data/libraries.ts`. Each figure
  carries the link it came from.
- **Merged upstream:** pull requests by `puretechteam` that were merged into a repository Pure Tech does not
  own. Open and unmerged ones never appear.
- **Preview cards:** `public/cards/<page>.png`, 1200 x 630, one for the home page and one per program page,
  made by `scripts/make-cards.mjs` from the names, taglines and facts in `src/data/products.ts`. They carry no
  version or date, so a new release never makes one stale. Visitors never load them; only sites a link is
  shared on do.
- **Posts on X:** the posts listed in `src/data/x.mjs`. `npm run posts` copies their text from X's public
  oEmbed endpoint (no account or key) into `src/data/x-posts.json`, and the home page shows the newest two
  in the site's own type. Visitors load nothing from X. Short t.co links are replaced with where they lead,
  and emoji and the hashtags a post ends on are left out. A post deleted on X drops off at the next build;
  if X does not answer, the stored copy is kept. To show a new post, add the number at the end of its link
  to `src/data/x.mjs`.
- **Games video:** `src/data/games.ts`. While it is empty the Games section shows the "??" block. A video
  plays only when pressed (`preload="none"`), so the page carries just its poster image until then.

Set `GITHUB_TOKEN` when running `npm run snapshot` if you hit the anonymous rate limit. It is optional.

## Publishing

The site is set up for GitHub Pages, which is free for public repositories. `.github/workflows/deploy.yml`
refreshes the release data and the X posts, runs the tests, builds, and publishes `dist/`. It runs on every push to `main`,
once a day, and by hand from the Actions tab, so a new release of any program shows up without touching
this repository.

The address is set in one place: `site` in `astro.config.mjs`. The workflow expects the site at the root of
its address (a repository named `puretechteam.github.io`, or a custom domain).

## Page budgets

`npm run build` measures what a browser loads for each page (text files counted gzipped) and writes the
result into that page's footer. The build fails if:

- the home page loads more than 200 KB,
- any page has more than 10 KB of script,
- any page makes a third-party request or touches `document.cookie`.

A video counts its poster. The video file counts too unless it is set to load only when played.

## Load-up screen

The first page of a visit opens with a 1.4 second screen (`src/components/Intro.astro`), with no words: a
solid block appears, four pieces are cut away from it, and what is left is the mark, which then takes its
color. The screen cuts away diagonally. It plays once per browser session.
The page loads underneath at full speed and clicks pass through. It does not appear without JavaScript or
when the visitor has reduced motion switched on. Add `?intro` to any address to watch it again.

## What's in this app?

The box at the top of the home page (`src/components/AppScan.astro`). Drag a program's folder onto the page,
or press **Choose a folder** (or **Look inside an app** in the opening screen, which opens the same folder
dialog; without JavaScript it is a link to the box). The box shows how much of the folder is the program itself and how much is
extra: a bundled web browser (Electron, CEF or Chromium), runtimes (.NET, Java, Python, Qt, Visual C++),
translations, video and audio codecs, updaters and crash reporters, debug files, and licenses. Each line opens
to list its files. **Copy result** puts the numbers on the clipboard as plain text.

- **Private by design:** the page reads file names and sizes only, never what is in a file, and makes no
  request while it works.
- **The rules:** `src/lib/appscan.ts`, one table of file-name patterns where the first match wins. Anything
  no rule matches counts as the program itself. Browser and Qt files count only when the engine or Qt itself is
  in the folder, so an app's own `styles` folder is not mistaken for Qt. The tests in `tests/appscan.test.ts`
  cover each kind of app. The rules were checked against four installed programs: Edge, Unity Hub, OBS Studio
  and Notepad++.
- **The button** uses a folder input rather than the newer folder picker: Chrome and Edge's picker refuses
  everything in Program Files and AppData, which is where programs are installed. Chrome words the folder
  input's prompt as an upload, so the box says that nothing leaves the PC.
- **On a phone** there is nothing to drop, so the box shows one line instead and the opening-screen button is
  hidden. The phone check (touch and not
  Windows) runs in `Base.astro` before the first paint and sets `is-phone` on `<html>`.

## Links that leave the site

Every link to another site opens in a new tab. `src/middleware.ts` applies one rule to every page as it is
rendered, in the dev server and the build alike, so a new link needs nothing extra. Download buttons
(`data-dl`, or a GitHub release download) are left alone. Each marked link points screen readers at one
hidden "Opens in a new tab" note on the page.

## Design

Three motifs, each with one meaning:

- **Strike:** a green line through a word means "removed".
- **Blue and green:** blue is before, green is after. Bars are drawn to scale. A figure that got worse
  is drawn in white instead of green, with its change beside the label, so green always means better.
- **Cut:** one 45 degree corner on buttons and panels, taken from the mark.

Type is Archivo and Martian Mono, both under the SIL Open Font License and served from the site itself.
