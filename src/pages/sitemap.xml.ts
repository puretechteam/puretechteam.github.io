// A sitemap of every page, written by hand so it needs no package.

import type { APIRoute } from 'astro';
import { nav } from '../data/nav.ts';
import { products } from '../data/products.ts';

export const GET: APIRoute = ({ site }) => {
  const base = site?.href ?? 'http://localhost/';
  const paths = ['/', ...nav.map((n) => n.href), ...products.filter((p) => p.page).map((p) => `/software/${p.slug}/`)];
  const urls = paths.map((p) => `  <url><loc>${new URL(p, base).href}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
