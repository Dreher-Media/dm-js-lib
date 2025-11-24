/**
 * Video Players Module
 * Handles integration with Plyr, YouTube, Vimeo, and Dailymotion players
 * Manages autoplay and pause functionality across multiple players
 */

interface PlayerInstance {
  type: "youtube" | "vimeo" | "dailymotion";
  player: unknown;
}

/**
 * Loads a script dynamically and returns a promise that resolves when loaded
 */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Checks if at least one player of the specified type exists on the page
 */
function hasPlayersOfType(type: "youtube" | "vimeo" | "dailymotion"): boolean {
  const elements = document.querySelectorAll(".youtube");
  return Array.from(elements).some((el) => (el as HTMLElement).dataset.type === type);
}

/**
 * Loads YouTube iframe API
 * Note: The onYouTubeIframeAPIReady callback must be set up before calling this
 */
function loadYouTubeAPI(): Promise<void> {
  // Check if already loaded
  if (window.YT && typeof window.YT.Player === "function") {
    return Promise.resolve();
  }

  return loadScript("https://www.youtube.com/iframe_api").catch((error) => {
    console.error("Failed to load YouTube API:", error);
  });
}

/**
 * Loads Vimeo Player API
 */
function loadVimeoAPI(): Promise<void> {
  // Check if already loaded
  if (window.Vimeo && typeof window.Vimeo.Player === "function") {
    return Promise.resolve();
  }

  return loadScript("https://player.vimeo.com/api/player.js").catch((error) => {
    console.error("Failed to load Vimeo API:", error);
  });
}

/**
 * Loads Dailymotion Player API
 */
function loadDailymotionAPI(): Promise<void> {
  // Check if already loaded
  if (window.dailymotion && typeof window.dailymotion.createPlayer === "function") {
    return Promise.resolve();
  }

  return loadScript("https://api.dmcdn.net/all.js").catch((error) => {
    console.error("Failed to load Dailymotion API:", error);
  });
}

export function initVideoPlayers(): void {
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof window.Plyr !== "undefined") {
      window.Plyr.setup("._init-plyr");
    }

    const youtubeElements = document.querySelectorAll(".youtube");
    const players: Record<string, PlayerInstance> = {};
    let init = false;

    // Check which platforms are needed and load their APIs
    const needsYouTube = hasPlayersOfType("youtube");
    const needsVimeo = hasPlayersOfType("vimeo");
    const needsDailymotion = hasPlayersOfType("dailymotion");

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

    const initializePlayers = (): void => {
      if (init) return;
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

    // Set up YouTube API callback before loading (if needed)
    if (needsYouTube) {
      (window as unknown as { onYouTubeIframeAPIReady: () => void }).onYouTubeIframeAPIReady =
        () => {
          initializePlayers();
        };
    }

    // Load APIs in parallel if needed
    const apiPromises: Promise<void>[] = [];
    if (needsYouTube) {
      apiPromises.push(loadYouTubeAPI());
    }
    if (needsVimeo) {
      apiPromises.push(loadVimeoAPI());
    }
    if (needsDailymotion) {
      apiPromises.push(loadDailymotionAPI());
    }

    // Wait for all APIs to load, then initialize
    if (apiPromises.length > 0) {
      Promise.all(apiPromises)
        .then(() => {
          // Small delay to ensure APIs are fully ready
          // YouTube API will call onYouTubeIframeAPIReady callback (if needed)
          // For Vimeo and Dailymotion, or if YouTube is not needed, initialize after a short delay
          if (needsYouTube) {
            // YouTube callback will handle initialization
            // But set a fallback timeout in case callback doesn't fire
            setTimeout(() => {
              if (!init) {
                initializePlayers();
              }
            }, 1000);
          } else {
            // No YouTube, so initialize immediately for Vimeo/Dailymotion
            setTimeout(() => {
              initializePlayers();
            }, 100);
          }
        })
        .catch((error) => {
          console.error("Error loading video player APIs:", error);
          // Still try to initialize in case some APIs loaded
          setTimeout(() => {
            initializePlayers();
          }, 500);
        });
    } else {
      // If no APIs need to be loaded, initialize immediately
      initializePlayers();
    }

    if (typeof videoSwipers !== "undefined" && videoSwipers) {
      videoSwipers.forEach((swiper) => {
        swiper.on("slideChange", () => {
          pauseAllPlayers();
        });
      });
    }
  });
}
