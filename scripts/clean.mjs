// Release notes are copied into the snapshot and the site shows summaries
// taken from them. Old notes can open with a personal copyright line, so
// attribution lines are dropped before anything is stored.

export const ATTRIBUTION_LINE = /\(c\)\s*\d{4}|©\s*\d{4}|copyright\s*(?:\(c\)|©)?\s*\d{4}/i;

export function cleanBody(body) {
  return (body ?? '')
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) => !ATTRIBUTION_LINE.test(line))
    .join('\n');
}
