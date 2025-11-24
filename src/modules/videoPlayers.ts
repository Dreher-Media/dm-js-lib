/**
 * Video Players Module
 * Handles integration with Plyr, YouTube, Vimeo, and Dailymotion players
 * Manages autoplay and pause functionality across multiple players
 */

interface PlayerInstance {
  type: "youtube" | "vimeo" | "dailymotion";
  player: unknown;
}

export function initVideoPlayers(): void {
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof window.Plyr !== "undefined") {
      window.Plyr.setup("._init-plyr");
    }

    const youtubeElements = document.querySelectorAll(".youtube");
    const players: Record<string, PlayerInstance> = {};
    let init = false;

    const pauseAllPlayers = (id: string | null = null): void => {
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
    };

    const onPlay = (id: string): void => {
      pauseAllPlayers(id);
      if (typeof videoSwipers !== "undefined" && videoSwipers) {
        videoSwipers.forEach((swiper) => {
          swiper.autoplay.stop();
        });
      }
    };

    const onPause = (id: string): void => {
      if (typeof videoSwipers !== "undefined" && videoSwipers) {
        videoSwipers.forEach((swiper) => {
          swiper.autoplay.start();
        });
      }
    };

    const onYouTubeIframeAPIReady = (): void => {
      init = true;

      youtubeElements.forEach((el) => {
        el.addEventListener("click", () => {
          const customEmbed = el.querySelector("[data-custom-embed]");
          if (customEmbed) {
            el.innerHTML = customEmbed.innerHTML;
          }

          const element = el as HTMLElement;
          const id = `player_${element.dataset.id}`;
          const type = element.dataset.type as "youtube" | "vimeo" | "dailymotion";
          const videoId = element.dataset.videoId;
          const time = parseInt(element.dataset.time || "0", 10);

          if (!videoId || !type) return;

          onPlay(id);

          // YouTube Player
          if (type === "youtube" && window.YT) {
            const player = new window.YT.Player(id, {
              videoId: videoId,
              playerVars: {
                start: time,
              },
              events: {
                onReady: (event) => {
                  event.target.playVideo();
                },
                onStateChange: (event) => {
                  if (event.data === window.YT!.PlayerState.PLAYING) {
                    onPlay(id);
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
            const container = document.getElementById(id);
            if (container) {
              container.innerHTML = "";
            }

            const player = new window.Vimeo.Player(id, {
              id: videoId,
              autoplay: true,
              start: time,
            });

            player.on("play", () => onPlay(id));
            player.on("pause", () => onPause(id));

            players[id] = { type, player };
          }
          // Dailymotion Player
          else if (type === "dailymotion" && window.dailymotion) {
            window.dailymotion
              .createPlayer(id, {
                video: videoId,
                params: {
                  autoplay: 1,
                  start: time,
                  mute: false,
                },
              })
              .then((playerInstance) => {
                // Attach event listeners
                playerInstance.on("play", () => onPlay(id));
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
    };

    // Make onYouTubeIframeAPIReady available globally for YouTube API
    (window as unknown as { onYouTubeIframeAPIReady: () => void }).onYouTubeIframeAPIReady =
      onYouTubeIframeAPIReady;

    if (typeof videoSwipers !== "undefined" && videoSwipers) {
      videoSwipers.forEach((swiper) => {
        swiper.on("slideChange", () => {
          pauseAllPlayers();
        });
      });
    }

    // Fallback if YouTube API doesn't call onYouTubeIframeAPIReady
    setTimeout(() => {
      if (!init) {
        onYouTubeIframeAPIReady();
      }
    }, 500);
  });
}

