# Developer Documentation

This document is for developers working on or contributing to the dm-js-lib codebase.

## Table of Contents

- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Code Organization](#code-organization)
- [Build System](#build-system)
- [Module Architecture](#module-architecture)
- [Contributing](#contributing)
- [Release Process](#release-process)

## Project Structure

```
dm-js-lib/
├── src/
│   ├── index.ts                 # Main entry point - initializes all modules
│   ├── modules/                 # Built-in modules (included in main bundle)
│   │   ├── utilities/           # Combined utilities module (4 utilities)
│   │   │   ├── index.ts
│   │   │   └── README.md
│   │   ├── cookieConsent/
│   │   │   ├── index.ts
│   │   │   └── README.md
│   │   ├── lang/
│   │   │   ├── index.ts
│   │   │   ├── utils.ts
│   │   │   ├── core.ts
│   │   │   └── README.md
│   │   ├── tabs/
│   │   │   ├── index.ts
│   │   │   ├── utils.ts
│   │   │   ├── core.ts
│   │   │   └── README.md
│   │   ├── accordion/
│   │   │   ├── index.ts
│   │   │   └── README.md
│   │   └── videoPlayers/
│   │       ├── index.ts
│   │       ├── types.ts
│   │       ├── apiLoaders.ts
│   │       ├── playerManagement.ts
│   │       ├── thumbnails.ts
│   │       └── README.md
│   ├── standalone/              # Standalone modules (loaded separately)
│   │   ├── filter.ts            # Entry point for filter module
│   │   ├── filter/               # Filter module implementation
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── cache.ts
│   │   │   ├── filters.ts
│   │   │   ├── persistence.ts
│   │   │   ├── controls.ts
│   │   │   ├── apply.ts
│   │   │   ├── api.ts
│   │   │   └── README.md
│   │   ├── previewDetailSwitcher.ts  # Entry point
│   │   └── previewDetailSwitcher/   # Preview detail switcher implementation
│   │       ├── index.ts
│   │       └── README.md
│   ├── types/                   # TypeScript type definitions
│   │   └── global.d.ts
│   └── utils/                   # Shared utilities
│       └── loadResource.ts
├── dist/                        # Build output
│   ├── dm-js-lib.min.js
│   └── standalone/
├── package.json
├── tsconfig.json
├── rollup.config.mjs
└── README.md                    # User-facing documentation
```

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development Commands

```bash
# Build the library
npm run build

# Format code
npm run format

# Check code formatting
npm run format:check
```

## Code Organization

### Module Structure

Each module follows a consistent structure:

1. **Simple modules** (single file):
   - `index.ts` - Contains all module logic

2. **Complex modules** (multiple files):
   - `index.ts` - Main initialization and public API
   - `types.ts` - TypeScript type definitions
   - `utils.ts` - Helper functions
   - `core.ts` - Core business logic
   - Additional files as needed (e.g., `cache.ts`, `persistence.ts`)

### Code Style

- **TypeScript**: Strict mode enabled
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Line Length**: Max 100 characters
- **Functions**: Arrow functions for callbacks
- **Exports**: Named exports preferred over default exports

### Module Guidelines

1. **Self-contained**: Each module should work independently
2. **No side effects**: Modules should only initialize when explicitly called
3. **Data attributes**: Use `data-*` attributes for configuration
4. **Event-driven**: Use DOM events for communication
5. **Accessibility**: Include ARIA attributes where appropriate

## Build System

### Rollup Configuration

The project uses Rollup for bundling:

- **Entry**: `src/index.ts`
- **Output**: `dist/dm-js-lib.min.js`
- **Plugins**:
  - `@rollup/plugin-typescript` - TypeScript compilation
  - `@rollup/plugin-terser` - Minification

### TypeScript Configuration

- **Target**: ES2020
- **Module**: ES2020
- **Strict**: Enabled
- **Lib**: DOM, ES2020

### Build Output

The build process:
1. Compiles TypeScript to JavaScript
2. Bundles all modules into a single file
3. Minifies the output
4. Creates source maps (for debugging)

## Module Architecture

### Initialization Pattern

All modules follow this initialization pattern:

```typescript
export function initModuleName(): void {
  document.addEventListener("DOMContentLoaded", () => {
    // Module initialization code
  });
}
```

### Module Registration

Modules are registered in `src/index.ts`:

```typescript
import { initModuleName } from "./modules/moduleName";

// Initialize all modules
initModuleName();
```

### Data Attribute Pattern

Modules use data attributes for configuration:

```typescript
// Find elements with data attribute
document.querySelectorAll("[data-module-attribute]").forEach((element) => {
  // Process element
});
```

### Event Handling

Modules dispatch custom events for extensibility:

```typescript
const event = new CustomEvent("module:event", {
  detail: { /* event data */ },
});
element.dispatchEvent(event);
```

## Contributing

### Adding a New Built-in Module

1. Create a new directory in `src/modules/`
2. Create `index.ts` with the module initialization function
3. Export the function: `export function initModuleName(): void { ... }`
4. Add the import and initialization call to `src/index.ts`
5. Create a user-facing `README.md` in the module directory
6. Follow the existing code style and patterns

### Adding a New Standalone Module

1. Create a directory in `src/standalone/moduleName/` with `index.ts` and `README.md`
2. Create `src/standalone/moduleName.ts` as the entry point that exports from the directory
3. The rollup config will automatically detect `.ts` files in `src/standalone/` and build them
4. The global name is auto-generated from the filename (e.g., `filter.ts` → `Filter`)
5. Create comprehensive documentation in the module's `README.md`
6. Include standalone usage instructions in the README

### Code Quality

- **TypeScript**: All code must be properly typed
- **Linting**: Code should pass TypeScript compiler checks
- **Formatting**: Use Prettier (configured in `.prettierrc`)
- **Testing**: Test modules in a real browser environment

### Documentation

- **User README**: Each module needs a `README.md` with usage examples
- **Code Comments**: Add JSDoc comments for exported functions
- **Type Definitions**: Use TypeScript types for better IDE support

## Release Process

### Versioning

The project follows [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Scripts

```bash
# Patch release (1.0.0 -> 1.0.1)
npm run release:patch

# Minor release (1.0.0 -> 1.1.0)
npm run release:minor

# Major release (1.0.0 -> 2.0.0)
npm run release:major
```

### Release Workflow

1. **Update version**: `npm version [patch|minor|major]`
2. **Build**: Automatically runs via `prepublishOnly` hook
3. **Publish**: `npm publish`
4. **Push**: Commits and tags are pushed to remote

### Patching Old Versions

To patch an older version while main has moved forward:

```bash
# 1. Checkout the old version
git checkout v1.2.0

# 2. Create patch branch
git checkout -b patch-1.2.1

# 3. Make fixes and release
npm version patch
npm publish
git push origin patch-1.2.1 --follow-tags

# 4. Return to main
git checkout main
```

## External Dependencies

### Runtime Dependencies

These are loaded separately (not bundled):

- **FsCC (Finsweet Cookie Consent)** - For cookie consent module
- **Webflow** - For Webflow initialization module
- **Plyr** - Loaded dynamically for video players
- **YouTube IFrame API** - Loaded dynamically
- **Vimeo Player API** - Loaded dynamically
- **Dailymotion Player Library** - Loaded dynamically
- **Swiper** - Optional, for video carousels

### Development Dependencies

- **rollup** - Build tool
- **@rollup/plugin-typescript** - TypeScript support
- **@rollup/plugin-terser** - Minification
- **typescript** - TypeScript compiler
- **prettier** - Code formatter

## Type Definitions

Global types are defined in `src/types/global.d.ts`:

```typescript
// Example global type extension
declare global {
  interface Window {
    Webflow?: {
      push: (callback: () => void) => void;
    };
    FsCC?: {
      consentController: {
        on: (event: string, callback: () => void) => void;
      };
      store: {
        consents: Record<string, boolean>;
      };
    };
  }
}
```

## Testing

Currently, modules are tested manually in browser environments. For development:

1. Build the library: `npm run build`
2. Include in a test HTML page
3. Test functionality in browser DevTools
4. Verify in multiple browsers

## Troubleshooting

### Build Errors

- **TypeScript errors**: Check `tsconfig.json` settings
- **Import errors**: Verify module paths are correct
- **Missing types**: Add type definitions to `src/types/global.d.ts`

### Runtime Issues

- **Module not initializing**: Check browser console for errors
- **Data attributes not working**: Verify attribute names match exactly
- **Events not firing**: Check event listener setup and DOM readiness

## Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Rollup Documentation](https://rollupjs.org/)
- [Semantic Versioning](https://semver.org/)
