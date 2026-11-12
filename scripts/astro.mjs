// Runs the Astro CLI with its usage telemetry switched off.
// Used by every npm script so no build of this site phones home.
process.env.ASTRO_TELEMETRY_DISABLED = '1';
await import(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url).href);
