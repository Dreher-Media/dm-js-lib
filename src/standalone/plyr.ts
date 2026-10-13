/**
 * Plyr - Standalone Entry Point
 * Plyr 3.x with its stylesheet and icon sprite in a single file. See ./plyr/index.ts.
 *
 * The three imports are resolved by the build (see rollup.config.mjs) from the pinned
 * `plyr` devDependency; nothing is fetched at runtime.
 */

import Plyr from 'dm-plyr:js';
import css from 'dm-plyr:css';
import sprite from 'dm-plyr:svg';
import { installPlyr } from './plyr/index';

installPlyr(Plyr, css, sprite);
