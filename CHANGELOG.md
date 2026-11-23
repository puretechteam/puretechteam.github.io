# Changelog

## 0.4.1 (2026-11-23)

- Changed: the Games section names the game. Farther is a free browser game about charting an unknown world
  outward from a single campfire. Title, platform and price are filled in as announced on X; the release
  date is still marked ??. The home page loads 144.4 KB (144.3 KB before), still in 6 requests.
- Changed: Merged upstream lists 9 pull requests (5 before). The 4 new ones were merged into
  erkamyaman/rust-anything on 2026-11-23.
- Changed: the newest posts from X: Latheport 2.0 being in the works, lines of code in "What's in this
  app?", and the game's name.

## 0.4.0 (2026-11-23)

- Added: "What's in this app?" now counts lines of code. Drop a project's source folder, or an Electron app
  (it reads the code packed inside `app.asar`), and it shows the lines that are not blank by language, how much
  of it is bundled libraries such as `node_modules`, and how many files are minified. On this site's own source
  it counts 6,210 lines in 54 files, the same as `grep` finds. A compiled program has no source to count, and
  the box says so. As before, everything is read on your PC and the page makes 0 requests while it works.
- Changed: the home page now loads "What's in this app?" the first time it is used, from a 3 KB starter.
  The home page loads 144.3 KB (146.6 KB before) with 4.6 KB of script (9.5 KB before), in 6 requests (5
  before: the starter is its own file) with 0 third-party. Phones never load the tool.
- Changed: the site is built with the current versions of GitHub's own actions (checkout 7, setup-node 7,
  upload-pages-artifact 5, deploy-pages 5). The old ones still targeted Node.js 20, and every daily build
  warned that GitHub had deprecated it.

## 0.3.0 (2026-11-17)

- Added: "What's in this app?" at the top of the home page, with its own "Look inside an app" button beside
  "See the software". Drag a program's folder onto the page and it shows how much of it is the program and how
  much is extra: a bundled web browser, runtimes, translations, codecs, updaters, debug files and licenses,
  with every file listed. Nothing is uploaded. The page reads file names and sizes on your PC and makes 0
  requests while it works. Copy result gives the numbers as text. On a phone it is one line, and the button is
  not shown. The home page loads 146.6 KB (141.4 KB before) with 9.5 KB of script (1.3 KB before, budget
  10 KB), still in 5 requests with 0 third-party. It adds 317 px on a laptop and 161 px on a phone; the "See
  the software" button stays where it was.
- Fixed: on a phone, the download buttons change to "Send link to my PC", but screen readers still heard
  "Download ...". The label now starts with the words on the button. An accessibility scan in phone mode
  found 5 such problems on the home page; it now finds 0 across all 12 pages, dark and light.
- Added: the newest posts from @puretechteam on the home page. Their text is copied in when the site is
  built, so the page still makes 0 third-party requests and sets no cookies. Links in the posts go straight
  to where they point instead of through t.co. The About page says how the posts get here.
- Added: a preview card for every page (1200 x 630), shown when a link to the site is shared on X, Discord
  and elsewhere: one for the home page and one for each program. Before, shared links had no picture.
- Added: a "See the software" button and the newest release in the opening screen. Both are visible without
  scrolling, on a laptop (424 px down) and on a phone (338 px down).
- Changed: releases and X posts now sit side by side in one "Lately" section, and Merged upstream shows the
  3 newest of 5 with a link to all of them. Together with a smaller list of removed programs at the top, this
  takes 403 px off the home page on a laptop and 592 px on a phone.
- Changed: a figure that got worse is no longer drawn in green, which reads as an improvement. Its "after"
  value and bar are white, with the change beside the label (ChildLock's exe size: +7%).
- Changed: on a program page, a tall screenshot sits beside the text instead of below it. ChildLock's page
  had an empty area of 644 x 758 px next to its screenshot; it is gone, and the page is 223 px shorter.
  Wide screenshots now use the full width.
- Fixed: 6 releases had no summary line because their notes open with an image, a download line or a bare
  "Changelog" heading. They now get the first sentence or point after it, such as "First release." for
  ChildLock 0.1.0. No existing summary changed.
- Added: the Games section can show a video. It loads only when someone presses play; until then the page
  carries only its poster. No video is set yet, so the section looks as it did.
- Changed: every link that leaves the site opens in a new tab (232 links on 12 pages). Internal links (256)
  and download buttons (15) work as before, so a download does not leave an empty tab behind. Screen readers
  hear that such a link opens a new tab.
- Changed: a page's own styles are inlined up to 10 KB (was 4 KB), so the home page still loads in 5 requests
  with this release's additions. Without the change it would take 6.

## 0.2.1 (2026-11-15)

- Changed: the ChildLock page is up to date with ChildLock 0.3.0: the new Settings screenshot, the ring in
  cleaning mode, and three figures from its release notes (key events let through on unlock, 4 to 0; slowest
  input callback, 1.6 ms to 0.38 ms; size of the exe, 392.7 KB to 421.4 KB).
- Changed: when a figure goes up, its bars now show that. Both bars are scaled to the larger value, so the
  after bar is the longer one. Before, an increase drew two equal bars.
- Added: the Libraries page says ChildLock is built on puretech-tray for .NET.
- Changed: the software list is ordered by latest release, newest first, on the home page and the Software
  page. It was a fixed order.
- Fixed: releases whose notes open with a label and a list ("New look:" and then points) now get a summary
  line in Latest releases and on the Updates page. ChildLock 0.3.0 and 0.2.0 had none.

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
