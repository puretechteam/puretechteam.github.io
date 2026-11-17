// Every link that leaves the site opens in a new tab. It is one rule applied to every page as it is
// rendered (src/middleware.ts), so a link added later cannot be missed. Downloads are left alone: a
// download sent to a new tab only leaves an empty tab behind.

/** The id of the hidden note that tells screen reader users a link opens a new tab. */
export const NEW_TAB_NOTE = 'pt-new-tab';

/** True for an address on another host. Relative links, #anchors and mailto: are not outside. */
export function isOutside(href: string, siteHost: string): boolean {
  const host = href.match(/^(?:https?:)?\/\/([^/?#]+)/i)?.[1];
  return !!host && host.toLowerCase() !== siteHost.toLowerCase();
}

function isDownload(tag: string, href: string): boolean {
  return /\sdata-dl\b|\sdownload\b/i.test(tag) || /\/releases\/download\//i.test(href);
}

/** Adds what a link needs to open in a new tab, keeping any rel or aria-describedby it already has. */
function markTag(tag: string): string {
  const append = (name: string, value: string) => {
    const existing = new RegExp(`\\s${name}=(["'])(.*?)\\1`, 'i');
    if (!existing.test(tag)) return tag.replace(/>$/, ` ${name}="${value}">`);
    return tag.replace(existing, (whole, q: string, v: string) =>
      v.split(/\s+/).includes(value) ? whole : ` ${name}=${q}${`${v} ${value}`.trim()}${q}`,
    );
  };
  tag = append('rel', 'noopener');
  tag = append('aria-describedby', NEW_TAB_NOTE);
  return tag.replace(/>$/, ' target="_blank">');
}

export function markOutsideLinks(html: string, siteHost: string): string {
  let marked = 0;
  const out = html.replace(/<a\b[^>]*>/gi, (tag) => {
    const href = tag.match(/\shref=(["'])(.*?)\1/i)?.[2];
    if (!href || !isOutside(href, siteHost) || isDownload(tag, href) || /\starget=/i.test(tag)) return tag;
    marked += 1;
    return markTag(tag);
  });
  if (marked === 0 || out.includes(`id="${NEW_TAB_NOTE}"`)) return out;
  return out.replace(/<\/body>/i, `<span id="${NEW_TAB_NOTE}" hidden>Opens in a new tab</span></body>`);
}
