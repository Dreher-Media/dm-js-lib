/**
 * Video Players Module - Player Management
 * Functions for initializing and managing video players
 */

import type { PlayerInstance } from "./types";

// Initialize global videoSwipers array on window object
if (typeof window !== "undefined" && typeof window.videoSwipers === "undefined") {
  window.videoSwipers = [];
}

// Monotonic counter so the same video can appear multiple times on a page
// without colliding on data-id-based keys or duplicate DOM ids.
let playerKeyCounter = 0;

// Create a reference to window.videoSwipers for direct access
// This allows the code to use videoSwipers directly while it's actually stored on window
const getVideoSwipers = (): Swiper[] | undefined => {
  return typeof window !== "undefined" ? window.videoSwipers : undefined;
};

/**
 * Initializes Plyr players and sets up event listeners
 */
export function initializePlyrPlayers(
  plyrPlayers: Plyr[],
  players: Record<string, PlayerInstance>
): void {
  if (typeof window.Plyr !== "undefined") {
    const setupPlayers = window.Plyr.setup("._init-plyr");
    plyrPlayers.push(...setupPlayers);

    // Set up Plyr player event listeners
    setupPlayers.forEach((plyrPlayer) => {
      plyrPlayer.on("play", () => {
        // When a Plyr player plays, pause all other players (exclude this one)
        pauseAllPlayers(null, plyrPlayers, players, plyrPlayer);
        const swipers = getVideoSwipers();
        if (swipers) {
          swipers.forEach((swiper) => {
            swiper.autoplay.stop();
          });
        }
      });

      plyrPlayer.on("pause", () => {
        // When a Plyr player pauses, resume swiper autoplay
        const swipers = getVideoSwipers();
        if (swipers) {
          swipers.forEach((swiper) => {
            swiper.autoplay.start();
          });
        }
      });
    });
  }
}

/**
 * Pauses all video players
 * @param id - Optional player id to exclude (for YouTube/Vimeo/Dailymotion)
 * @param plyrPlayers - Array of Plyr instances
 * @param players - Map of other player instances
 * @param excludePlyrPlayer - Optional Plyr instance to exclude (the one that is currently playing)
 */
export function pauseAllPlayers(
  id: string | null = null,
  plyrPlayers: Plyr[],
  players: Record<string, PlayerInstance>,
  excludePlyrPlayer: Plyr | null = null
): void {
  // Pause all Plyr players except the one that just started playing
  plyrPlayers.forEach((plyrPlayer) => {
    if (excludePlyrPlayer && plyrPlayer === excludePlyrPlayer) return;
    plyrPlayer.pause();
  });

  // Pause all other video players
  for (const [key, value] of Object.entries(players)) {
    if (id === key) continue;

    if (value.type === "youtube") {
      const ytPlayer = value.player as {
        pauseVideo: () => void;
      };
      ytPlayer.pauseVideo();
    } else if (value.type === "vimeo") {
      const vimeoPlayer = value.player as {
        pause: () => void;
      };
      vimeoPlayer.pause();
    } else if (value.type === "dailymotion") {
      const dmPlayer = value.player as {
        pause: () => void;
      };
      dmPlayer.pause();
    }
  }
}

/**
 * Handles play event for a player
 */
export function onPlay(
  id: string,
  plyrPlayers: Plyr[],
  players: Record<string, PlayerInstance>
): void {
  pauseAllPlayers(id, plyrPlayers, players);
  const swipers = getVideoSwipers();
  if (swipers) {
    swipers.forEach((swiper) => {
      swiper.autoplay.stop();
    });
  }
}

/**
 * Handles pause event for a player
 */
export function onPause(id: string): void {
  const swipers = getVideoSwipers();
  if (swipers) {
    swipers.forEach((swiper) => {
      swiper.autoplay.start();
    });
  }
}

/**
 * Creates a dedicated mount element for external video APIs.
 * Keeping `.youtube` as a stable wrapper prevents API libraries from replacing
 * the styled container node itself.
 */
function createPlayerMountElement(container: HTMLElement, id: string): HTMLDivElement {
  container.innerHTML = "";
  const mountElement = document.createElement("div");
  mountElement.id = id;
  mountElement.style.width = "100%";
  mountElement.style.height = "100%";
  container.appendChild(mountElement);
  return mountElement;
}

/**
 * Initializes video players (YouTube, Vimeo, Dailymotion, ARD Mediathek, other)
 */
export function initializePlayers(
  youtubeElements: NodeListOf<Element>,
  players: Record<string, PlayerInstance>,
  plyrPlayers: Plyr[]
): void {
  youtubeElements.forEach((el) => {
    if ((el as HTMLElement).dataset.dmPlayerBound === "true") return;
    (el as HTMLElement).dataset.dmPlayerBound = "true";

    // Assign a unique runtime key per element so duplicate `data-id`s
    // (e.g. the same video rendered twice on a page) don't collide.
    const id = `player_${++playerKeyCounter}`;
    (el as HTMLElement).dataset.dmPlayerKey = id;

    el.addEventListener("click", () => {
      const customEmbed = el.querySelector("[data-custom-embed]");
      if (customEmbed) {
        el.innerHTML = customEmbed.innerHTML;
      }

      const element = el as HTMLElement;
      const type = element.dataset.type as
        | "youtube"
        | "vimeo"
        | "dailymotion"
        | "ardmediathek"
        | "other";
      const videoId = element.dataset.videoId;
      const time = parseInt(element.dataset.time || "0", 10);

      if (!videoId || !type) return;

      onPlay(id, plyrPlayers, players);

      // Other (open URL in new tab, no embed)
      if (type === "other") {
        window.open(videoId, "_blank", "noopener,noreferrer");
        return;
      }

      // ARD Mediathek (iframe embed, no JS API)
      if (type === "ardmediathek") {
        const embedSrc = `https://www.ardmediathek.de/embed/${encodeURIComponent(videoId)}`;
        const iframe = document.createElement("iframe");
        iframe.src = embedSrc;
        iframe.setAttribute("allowfullscreen", "");
        iframe.setAttribute("allow", "fullscreen");
        iframe.setAttribute("frameborder", "0");
        iframe.style.width = "100%";
        iframe.style.aspectRatio = "16/9";
        element.innerHTML = "";
        element.appendChild(iframe);
        return;
      }

      // YouTube Player
      if (type === "youtube" && window.YT) {
        const mountElement = createPlayerMountElement(element, id);
        const player = new window.YT.Player(mountElement.id, {
          videoId: videoId,
          playerVars: {
            start: time,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              event.target.playVideo();
            },
            onStateChange: (event: { data: number; target: { playVideo: () => void } }) => {
              if (event.data === window.YT!.PlayerState.PLAYING) {
                onPlay(id, plyrPlayers, players);
              } else if (
                event.data === window.YT!.PlayerState.PAUSED ||
                event.data === window.YT!.PlayerState.ENDED
              ) {
                onPause(id);
              }
            },
          },
        });

        players[id] = { type, player };
      }
      // Vimeo Player
      else if (type === "vimeo" && window.Vimeo) {
        const mountElement = createPlayerMountElement(element, id);
        const player = new window.Vimeo.Player(mountElement.id, {
          id: videoId,
          autoplay: true,
          start: time,
        });

        player.on("play", () => onPlay(id, plyrPlayers, players));
        player.on("pause", () => onPause(id));

        players[id] = { type, player };
      }
      // Dailymotion Player
      else if (type === "dailymotion" && window.dailymotion) {
        const mountElement = createPlayerMountElement(element, id);
        window.dailymotion
          .createPlayer(mountElement.id, {
            video: videoId,
            params: {
              autoplay: 1,
              start: time,
              mute: false,
            },
          })
          .then((playerInstance) => {
            // Attach event listeners
            playerInstance.on("play", () => onPlay(id, plyrPlayers, players));
            playerInstance.on("pause", () => onPause(id));
            playerInstance.on("ended", () => onPause(id));

            // Store the player instance
            players[id] = { type: "dailymotion", player: playerInstance };
          })
          .catch((error) => {
            console.error("Error initializing Dailymotion player:", error);
          });
      }
    });
  });
}
