/**
 * Main Entry Point
 * Initializes all modules for the Agency Scripts library
 */

import { initCookieConsent } from "./modules/cookieConsent";
import { initUtilities } from "./modules/utilities";
import { initTabs } from "./modules/tabs";
import { initLang } from "./modules/lang";
import { initVideoPlayers } from "./modules/videoPlayers";
import { initConditional } from "./modules/conditional";
import { initAccordion } from "./modules/accordion";

// Initialize all modules
initCookieConsent();
initUtilities();
initTabs();
initLang();
initVideoPlayers();
initConditional();
initAccordion();
