/**
 * Video Players Module - Type Definitions
 */

interface PlayerInstance {
  type: "youtube" | "vimeo" | "dailymotion" | "ardmediathek" | "other";
  player: unknown;
}

export type { PlayerInstance };
