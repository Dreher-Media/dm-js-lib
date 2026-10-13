import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const version = packageJson.version;
const plyrVersion = JSON.parse(readFileSync('./node_modules/plyr/package.json', 'utf-8')).version;

// Files from the pinned `plyr` package that the Plyr standalone bundle inlines.
// `*.mjs` is passed through as code, everything else becomes a string export.
const plyrDist = './node_modules/plyr/dist';
const vendorAssets = {
  'dm-plyr:js': { file: `${plyrDist}/plyr.polyfilled.min.mjs`, asString: false },
  'dm-plyr:css': { file: `${plyrDist}/plyr.css`, asString: true },
  'dm-plyr:svg': { file: `${plyrDist}/plyr.svg`, asString: true },
};

const vendorAssetsPlugin = {
  name: 'vendor-assets',
  resolveId(id) {
    return id in vendorAssets ? `\0${id}` : null;
  },
  load(id) {
    const asset = vendorAssets[id.slice(1)];
    if (!asset) return null;
    const text = readFileSync(asset.file, 'utf-8');
    return asset.asString ? `export default ${JSON.stringify(text)};` : text;
  },
};

// Get all standalone module files
const standaloneDir = './src/standalone';
const standaloneModules = readdirSync(standaloneDir)
  .filter((file) => file.endsWith('.ts'))
  .map((file) => {
    const moduleName = basename(file, '.ts');
    // Convert kebab-case or camelCase to PascalCase for global name
    const globalName = moduleName
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    return {
      input: join(standaloneDir, file),
      output: {
        file: `dist/standalone/${moduleName}.min.js`,
        format: 'iife',
        name: globalName,
        banner:
          moduleName === 'plyr'
            ? `/*! dm-js-lib/${moduleName} v${version} | bundles plyr v${plyrVersion} (MIT, https://github.com/sampotts/plyr) */`
            : `/*! dm-js-lib/${moduleName} v${version} */`,
      },
    };
  });

// Main bundle configuration
const mainBundle = {
  input: 'src/index.ts',
  output: {
    file: 'dist/dm-js-lib.min.js',
    format: 'iife',
    name: 'DmJsLib',
    banner: `/*! dm-js-lib v${version} */`,
  },
};

// Shared plugins
const plugins = [
  vendorAssetsPlugin,
  typescript({
    tsconfig: './tsconfig.json',
  }),
  terser(),
];

// Export array of configurations for multiple outputs
export default [
  {
    ...mainBundle,
    plugins,
  },
  ...standaloneModules.map((config) => ({
    ...config,
    plugins,
  })),
];
