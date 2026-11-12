import { defineConfig } from 'astro/config';

// The address the site is published at. Change this one line if it moves to its own domain.
export default defineConfig({
  site: 'https://puretechteam.github.io',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
