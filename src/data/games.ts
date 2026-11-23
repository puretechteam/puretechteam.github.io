// The games section. Nothing here is guessed: a field stays empty until there is a real answer.

export interface GamesVideo {
  /** Under public/, as scripts/encode-video.mjs writes it, e.g. '/media/games-teaser.mp4'. */
  src: string;
  /** The still shown before play, e.g. '/media/games-teaser.webp'. */
  poster: string;
  width: number;
  height: number;
  /** What the video shows, for people who cannot see it. */
  label: string;
}

/** The first look, once there is one. Until then the section shows the uncut block. */
export const gamesVideo: GamesVideo | null = null;

/**
 * What has been said about the game, word for word from the announcement on X (2026-11-23, post
 * 2124802882373329207). A fact that has not been announced is null and shows as ??.
 */
export const game = {
  title: 'Farther',
  about: 'A free browser game about charting an unknown world outward from a single campfire.',
  status: 'The first edition is still being drawn.',
  facts: [
    ['Title', 'Farther'],
    ['Platform', 'Browser'],
    ['Price', 'Free'],
    ['Release', null],
  ] as [string, string | null][],
};
