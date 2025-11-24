/**
 * Main Entry Point
 * Initializes all modules for the Agency Scripts library
 */

import { initCookieConsent } from "./modules/cookieConsent";
import { initWebflow } from "./modules/webflowInit";
import { initActiveLinks } from "./modules/activeLink";
import { initSeparators } from "./modules/separators";
import { initTabs } from "./modules/tabs";
import { initBiographyLang } from "./modules/biographyLang";
import { initVideoPlayers } from "./modules/videoPlayers";
import { initYouTubeThumbnails } from "./modules/youtubeThumbnails";
import { initFileDownload } from "./modules/fileDownload";

// Initialize all modules
initCookieConsent();
initWebflow();
initActiveLinks();
initSeparators();
initTabs();
initBiographyLang();
initVideoPlayers();
initYouTubeThumbnails();
initFileDownload();

