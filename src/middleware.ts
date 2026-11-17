// Runs on every page as it is rendered, in the dev server and in the build alike.
import { defineMiddleware } from 'astro:middleware';
import { markOutsideLinks } from './lib/links.ts';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  if (!response.headers.get('content-type')?.includes('text/html')) return response;
  const html = markOutsideLinks(await response.text(), context.site?.host ?? 'puretechteam.github.io');
  return new Response(html, { status: response.status, statusText: response.statusText, headers: response.headers });
});
