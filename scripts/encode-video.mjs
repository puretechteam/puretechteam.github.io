// Prepares a video for the site: an H.264 MP4 that starts playing before it has fully downloaded,
// plus a WebP poster frame, then prints the sizes and the entry for src/data/games.ts.
//
// Usage: node scripts/encode-video.mjs <input> [name] [--poster-at <seconds>] [--out <folder>]
//   name defaults to games-teaser; out defaults to public/media.
// Needs ffmpeg and ffprobe on PATH. Uses half the CPU threads so the machine stays usable.

import { spawnSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const posterAtArg = flag('--poster-at');
const outDir = resolve(flag('--out') ?? fileURLToPath(new URL('../public/media/', import.meta.url)));
const [input, name = 'games-teaser'] = args;
if (!input) {
  console.error('Usage: node scripts/encode-video.mjs <input> [name] [--poster-at <seconds>] [--out <folder>]');
  process.exit(2);
}

function run(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`${cmd} failed: ${r.stderr || r.error}`);
  return r.stdout;
}
const probe = (file) => JSON.parse(run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]));
const mb = (bytes) => `${(bytes / 1_000_000).toFixed(1)} MB`;
const kb = (bytes) => `${(bytes / 1_000).toFixed(1)} KB`;

const source = probe(input);
const video = source.streams.find((s) => s.codec_type === 'video');
if (!video) throw new Error('no video stream in the input');
const hasAudio = source.streams.some((s) => s.codec_type === 'audio');
const duration = Number(source.format.duration);
const posterAt = posterAtArg !== undefined ? Number(posterAtArg) : Math.min(1, duration / 10);
const threads = String(Math.max(1, Math.floor(availableParallelism() / 2)));

mkdirSync(outDir, { recursive: true });
const mp4 = join(outDir, `${name}.mp4`);
const webp = join(outDir, `${name}.webp`);

const started = Date.now();
run('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-i', input,
  '-map', '0:v:0', ...(hasAudio ? ['-map', '0:a:0'] : []),
  // At most 1920 wide (sharp on a 2x screen at the width the site shows it), even sides, at most 60 fps.
  '-vf', "scale='trunc(min(1920,iw)/2)*2':-2:flags=lanczos", '-fpsmax', '60',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-maxrate', '6M', '-bufsize', '12M',
  '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-threads', threads,
  ...(hasAudio ? ['-c:a', 'aac', '-b:a', '128k'] : ['-an']),
  '-movflags', '+faststart',
  mp4,
]);
run('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-ss', String(posterAt), '-i', input, '-frames:v', '1',
  '-vf', "scale='trunc(min(1600,iw)/2)*2':-2:flags=lanczos",
  '-c:v', 'libwebp', '-quality', '78', webp,
]);

const out = probe(mp4).streams.find((s) => s.codec_type === 'video');
console.log(`
input   ${video.width}x${video.height}, ${duration.toFixed(1)} s, ${mb(statSync(input).size)}${hasAudio ? ', with sound' : ', no sound'}
video   ${out.width}x${out.height}, ${mb(statSync(mp4).size)}  ${mp4}
poster  frame at ${posterAt} s, ${kb(statSync(webp).size)}  ${webp}
took    ${((Date.now() - started) / 1000).toFixed(1)} s on ${threads} threads

For src/data/games.ts:
export const gamesVideo: GamesVideo | null = {
  src: '/media/${name}.mp4',
  poster: '/media/${name}.webp',
  width: ${out.width},
  height: ${out.height},
  label: 'TODO: what the video shows',
};`);
