# Changelog

## 0.2.0 (2026-11-14)

- Added: a Games section on the home page. We have started making games, and it says so and nothing more:
  no titles, platforms or dates are given.

## 0.1.1 (2026-11-12)

- Fixed: the Libraries page now shows a version for every library. Four of the seven (meshport,
  puretech-tray, puretech-tray for .NET and Pure Tech Player) had none, because they are versioned with a
  git tag and no GitHub release. Versions are now read from tags as well as releases: 7 of 7 shown, was 3 of 7.

## 0.1.0 (2026-11-12)

The first release of the site.

- Added: the home page. It explains what "Nothing extra" means with the 8 programs Latheport no longer
  needs, each linked to the release that dropped it.
- Added: the Software page, listing every current program with its version, download size and release date.
- Added: a page each for Latheport, FrameKeep, ChildLock, Bible Widget and Faraday, with the download, its
  checksum, what the program does, what it needs, its measurements and its limits.
- Added: the Libraries page, with an install line for each of the 7 libraries.
- Added: the Upstream page, listing the 5 pull requests merged into other projects.
- Added: the Updates page and an RSS feed of every release at `/updates.xml`.
- Added: the About page, with links to GitHub, Discord and X.
- Added: on a phone, download buttons offer to send the link to your PC, with the direct download beneath.
- Added: each page's footer reports what it takes to load. Measured at build across 12 pages: 135.6 KB to
  246.3 KB, 5 to 7 requests, 0 third-party requests, no cookies. The home page is 139.7 KB.
- Added: a 1.4 second load-up screen, shown once per visit: a solid block is cut down, piece by piece, to
  the Pure Tech mark. It does not hold the page back, and it is skipped when reduced motion is on.
- Added: a sitemap and a robots file.
- Added: a light theme that follows the system setting.
- Checked: an automated accessibility scan of all 12 pages at desktop and phone widths, in dark and light,
  reports 0 problems (62 before fixes: link labels that did not match their visible text, and install
  commands that could not be scrolled by keyboard).
- Added: publishing to GitHub Pages, rebuilt daily so new releases appear by themselves.
