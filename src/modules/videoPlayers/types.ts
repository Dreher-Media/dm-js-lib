/**
 * Video Players Module - Type Definitions
 */

interface PlayerInstance {
  type: "youtube" | "vimeo" | "dailymotion";
  player: unknown;
}

export type { PlayerInstance };
