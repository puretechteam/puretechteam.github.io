import { defineConfig } from 'astro/config';

// The address the site is published at. Change this one line if it moves to its own domain.
export default defineConfig({
  site: 'https://puretechteam.github.io',
  trailingSlash: 'always',
  build: { format: 'directory' },
  // A page's own styles are inlined up to 10 KB, which saves the home page a blocking request (its styles are 9.1 KB
  // with the app check). The shared stylesheet (12 KB) stays a file, so it is cached once for every page.
  vite: { build: { assetsInlineLimit: 10240 } },
});
