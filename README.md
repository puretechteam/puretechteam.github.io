# Pure Tech website

The official website for Pure Tech: independent software for Windows.

The site is static. It is built with [Astro](https://astro.build), ships no client framework, makes no
third-party requests and sets no cookies. Every version, file size and date on it comes from a snapshot of
the public GitHub releases, and every measured figure links to the README or release note it was copied from.

## Pages

| Route | What it is |
|---|---|
| `/` | Home: what Latheport no longer needs, the software list, a games teaser, measured numbers, libraries, merged upstream pull requests, latest releases |
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

Set `GITHUB_TOKEN` when running `npm run snapshot` if you hit the anonymous rate limit. It is optional.

## Publishing

The site is set up for GitHub Pages, which is free for public repositories. `.github/workflows/deploy.yml`
refreshes the release data, runs the tests, builds, and publishes `dist/`. It runs on every push to `main`,
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

## Load-up screen

The first page of a visit opens with a 1.4 second screen (`src/components/Intro.astro`), with no words: a
solid block appears, four pieces are cut away from it, and what is left is the mark, which then takes its
color. The screen cuts away diagonally. It plays once per browser session.
The page loads underneath at full speed and clicks pass through. It does not appear without JavaScript or
when the visitor has reduced motion switched on. Add `?intro` to any address to watch it again.

## Design

Three motifs, each with one meaning:

- **Strike:** a green line through a word means "removed".
- **Blue and green:** blue is before, green is after. Bars are drawn to scale.
- **Cut:** one 45 degree corner on buttons and panels, taken from the mark.

Type is Archivo and Martian Mono, both under the SIL Open Font License and served from the site itself.
