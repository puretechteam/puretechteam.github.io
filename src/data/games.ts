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
