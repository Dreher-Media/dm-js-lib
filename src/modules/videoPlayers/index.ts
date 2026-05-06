/**
 * Video Players Module
 * Handles integration with Plyr, YouTube, Vimeo, Dailymotion, ARD Mediathek, and other (open in new tab)
 * Manages autoplay and pause functionality across multiple players
 */

import {
  hasPlyrPlayers,
  hasPlayersOfType,
  loadPlyrAPI,
  loadYouTubeAPI,
  loadVimeoAPI,
  loadDailymotionAPI,
} from "./apiLoaders";
import { initializePlyrPlayers, initializePlayers, pauseAllPlayers } from "./playerManagement";
import { initYouTubeThumbnails } from "./thumbnails";
import type { PlayerInstance } from "./types";

let players: Record<string, PlayerInstance> = {};
let plyrPlayers: Plyr[] = [];

export function initVideoPlayers(): void {
  // Initialize YouTube thumbnail upgrades
  initYouTubeThumbnails();

  document.addEventListener("DOMContentLoaded", () => {
    const youtubeElements = document.querySelectorAll(".youtube");
    let init = false;

    // Check which platforms are needed and load their APIs
    const needsPlyr = hasPlyrPlayers();
    const needsYouTube = hasPlayersOfType("youtube");
    const needsVimeo = hasPlayersOfType("vimeo");
    const needsDailymotion = hasPlayersOfType("dailymotion");

    const initializeAllPlayers = (): void => {
      if (init) return;
      init = true;
      initializePlayers(youtubeElements, players, plyrPlayers);
    };

    // Set up YouTube API callback before loading (if needed)
    if (needsYouTube) {
      (window as unknown as { onYouTubeIframeAPIReady: () => void }).onYouTubeIframeAPIReady =
        () => {
          initializeAllPlayers();
        };
    }

    // Load APIs in parallel if needed
    const apiPromises: Promise<void>[] = [];
    if (needsPlyr) {
      apiPromises.push(loadPlyrAPI());
    }
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
          // Initialize Plyr players if needed
          if (needsPlyr) {
            initializePlyrPlayers(plyrPlayers);
          }

          // Small delay to ensure APIs are fully ready
          // YouTube API will call onYouTubeIframeAPIReady callback (if needed)
          // For Vimeo and Dailymotion, or if YouTube is not needed, initialize after a short delay
          if (needsYouTube) {
            // YouTube callback will handle initialization
            // But set a fallback timeout in case callback doesn't fire
            setTimeout(() => {
              if (!init) {
                initializeAllPlayers();
              }
            }, 1000);
          } else {
            // No YouTube, so initialize immediately for Vimeo/Dailymotion/ARD Mediathek
            setTimeout(() => {
              initializeAllPlayers();
            }, 100);
          }
        })
        .catch((error) => {
          console.error("Error loading video player APIs:", error);
          // Still try to initialize in case some APIs loaded
          if (needsPlyr && typeof window.Plyr !== "undefined") {
            initializePlyrPlayers(plyrPlayers);
          }
          setTimeout(() => {
            initializeAllPlayers();
          }, 500);
        });
    } else {
      // If no APIs need to be loaded (or only ARD Mediathek), initialize immediately
      // Check if Plyr is already available (might be loaded externally)
      if (needsPlyr && typeof window.Plyr !== "undefined") {
        initializePlyrPlayers(plyrPlayers);
      }
      initializeAllPlayers();
    }

    // Set up Swiper integration
    const swipers = typeof window !== "undefined" ? window.videoSwipers : undefined;
    if (swipers) {
      swipers.forEach((swiper) => {
        swiper.on("slideChange", () => {
          pauseAllPlayers(null, plyrPlayers, players);
        });
      });
    }

    window.dmReinitVideoPlayers = (container: HTMLElement) => {
      const elements = container.querySelectorAll<Element>(".youtube");
      initializePlayers(elements, players, plyrPlayers);
    };
  });
}
