// Turns X's public oEmbed answer for a post into plain text the site can set in its own type.
// Pure functions, so they are tested without the network.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: String.fromCharCode(0x2014), ndash: String.fromCharCode(0x2013), hellip: String.fromCharCode(0x2026) };

export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name) => {
    if (name[0] === '#') {
      const code = /^#x/i.test(name) ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}

// An emoji with whatever joins or modifies it. Plain symbols that are also typography (the copyright sign,
// a bare arrow) sit below U+2300 and stay, unless an emoji selector follows them.
const EMOJI =
  /(?:[\u{1F1E6}-\u{1F1FF}]|\p{Extended_Pictographic})[\u{FE0F}\u{20E3}\u{1F3FB}-\u{1F3FF}]*(?:‍\p{Extended_Pictographic}[\u{FE0F}\u{1F3FB}-\u{1F3FF}]*)*/gu;

/** Drops emoji. The site's fonts carry Latin letters only, and an emoji would fall back to a color font. */
export function stripEmoji(text) {
  return text.replace(EMOJI, (m) => (m.length === 1 && m.codePointAt(0) < 0x2300 ? m : '')).replace(/[️‍]/g, '');
}

/** The exact time a post was made, read from its ID (X IDs carry milliseconds since 4 Nov 2010). */
export function postedAtFromId(id) {
  return new Date(Number((BigInt(id) >> 22n) + 1288834974657n)).toISOString();
}

export function isOwnPost(oembed, handle) {
  return new RegExp(`^https://(?:x|twitter)\\.com/${handle}/?$`, 'i').test(oembed?.author_url ?? '');
}

/**
 * The words of a post, as paragraphs separated by a blank line. Media links come out (the post is
 * marked as having media instead), emoji come out, and so does the run of hashtags a post ends on.
 */
export function postFromOembed(oembed) {
  const html = oembed?.html ?? '';
  const p = html.match(/<p\b([^>]*)>([\s\S]*?)<\/p>/i);
  if (!p) throw new Error('no post text in the oEmbed answer');
  const lang = p[1].match(/\blang="([a-z-]+)"/i)?.[1] ?? null;
  let media = false;

  const text = p[2]
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, (_, inner) => {
      if (/^pic\.(?:x|twitter)\.com\//i.test(inner.trim())) {
        media = true;
        return '';
      }
      // X often glues a link to the word before it ("Windows:<a>"), so it gets a space.
      return ` ${inner}`;
    })
    .replace(/<[^>]+>/g, '');

  const words = stripEmoji(decodeEntities(text))
    .replace(/ /g, ' ')
    .replace(/(?:\s*#[\p{L}\p{N}_]+)+\s*$/u, '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { text: words, media, lang: lang === 'zxx' || lang === 'und' ? null : lang };
}

/** The t.co short links in a post. X routes every link through one; the build swaps in where it leads. */
export function shortLinks(text) {
  return [...new Set(text.match(/https:\/\/t\.co\/[A-Za-z0-9]+/g) ?? [])];
}
