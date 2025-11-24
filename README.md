# @dreher-media/dm-js-lib

Centralized JavaScript library for Dreher.Media websites with CDN delivery.

## Installation

```bash
npm install
```

## Development

### Build

```bash
npm run build
```

This will compile TypeScript and create `dist/dm-js-lib.min.js`.

### Format Code

```bash
npm run format
```

Check formatting:

```bash
npm run format:check
```

## Release Workflow

### 1. Build and Publish

```bash
npm run release:patch   # 1.0.0 -> 1.0.1 (builds, versions, and publishes)
npm run release:minor   # 1.0.0 -> 1.1.0 (builds, versions, and publishes)
npm run release:major   # 1.0.0 -> 2.0.0 (builds, versions, and publishes)
```

The release script will:
1. Update the version in `package.json`
2. Build the project (via `prepublishOnly` hook)
3. Publish to npm

### 2. Commit and Push

```bash
git add .
git commit -m "Release v1.2.3"
git push
```

## CDN Usage

jsDelivr automatically serves from npm with full semantic versioning support:

### Pinned Version (Frozen)

```html
<script src="https://cdn.jsdelivr.net/npm/@dreher-media/dm-js-lib@1.2.3/dist/dm-js-lib.min.js"></script>
```

### Patch-Only Auto-Update

```html
<script src="https://cdn.jsdelivr.net/npm/@dreher-media/dm-js-lib@1.2.x/dist/dm-js-lib.min.js"></script>
```

Automatically updates only on patch versions (e.g., `1.2.0 → 1.2.1`), never on minor or major versions.

### Version Range

```html
<script src="https://cdn.jsdelivr.net/npm/@dreher-media/dm-js-lib@^1.2.0/dist/dm-js-lib.min.js"></script>
```

Updates to any compatible version (patches and minor versions, but not major).

### Latest (Staging)

```html
<script src="https://cdn.jsdelivr.net/npm/@dreher-media/dm-js-lib@latest/dist/dm-js-lib.min.js"></script>
```

Always points to the newest published version.

## Versioning Strategy

- All versions follow **semantic versioning (semver)**
- Published versions are **immutable** - once published to npm, never changed
- Version ranges (`@1.2.x`, `@^1.2.0`) automatically resolve to compatible versions
- `@latest` always points to the newest published version
- Multiple minor version lines can receive security patches independently

## Project Structure

```
dm-js-lib/
  src/
    types/
      global.d.ts
    modules/
      [module files]
    index.ts
  dist/
    dm-js-lib.min.js
  package.json
  tsconfig.json
  rollup.config.mjs
```

## Dependencies

- **rollup** - Build tool
- **@rollup/plugin-typescript** - TypeScript support
- **rollup-plugin-terser** - Minification
- **typescript** - TypeScript compiler
- **prettier** - Code formatter

## Publishing to npm

Before publishing, ensure you have:

1. An npm account
2. Access to the `@dreher-media` organization (or change the package name)
3. Logged in: `npm login`

Then use the release scripts which handle building and publishing automatically.

## External Dependencies (Runtime)

The library integrates with these external services (loaded separately):

- **FsCC (Finsweet Cookie Consent)** - Cookie consent management
- **Webflow** - Webflow CMS and interactions
- **Plyr** - Video player library
- **YouTube IFrame API** - YouTube player
- **Vimeo Player API** - Vimeo player
- **Dailymotion Player Library** - Dailymotion player
- **Swiper** - Carousel/slider library (optional, for video swipers)

## License

MIT

