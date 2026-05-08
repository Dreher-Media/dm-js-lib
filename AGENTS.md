# AGENTS.md — dm-js-lib

This file describes how to work on `@dreher-media/dm-js-lib` for both human contributors and AI coding agents.

The top section is **self-contained** — everything an external contributor needs to open a useful PR is here, without following links into private resources. The "Standards" section below it links to internal Dreher.Media docs that are private; those links resolve only for authenticated members of the org.

---

## Quick start (everyone)

This is a small TypeScript library bundled to a single CDN-distributable file (`dist/dm-js-lib.min.js`) plus a few standalone helpers. It's published to npm as `@dreher-media/dm-js-lib`.

### Setup

```bash
npm install
```

### Develop

- Source lives in `src/`.
- `npm run typecheck` — TypeScript with `--noEmit`.
- `npm run format` / `npm run format:check` — Prettier write / check.
- `npm run verify` — `format:check` + `typecheck`. **Run this before opening a PR.**
- `npm run build` — Rollup bundle into `dist/`.

A `prepare` (Husky) hook runs `prettier --write` on staged files at commit time. If it complains, fix the issue and re-stage. **Don't `git commit --no-verify`** — fix the underlying problem, or fix the hook.

### Pull requests

Target `main`. Use the [PR template](.github/pull_request_template.md): Summary, Why, Test plan, Risk/rollback.

The PR title must be a [Conventional Commit](https://www.conventionalcommits.org/) (e.g. `feat: add foo`, `fix(utils): handle empty input`). Why: PRs are squash-merged, so the title becomes the canonical commit on `main` and is what release-please reads when computing the next version. CI lints the PR title; a malformed title fails the `lint-pr-title` job.

CI runs:

- `lint-pr-title` — commitlint against your PR title.
- `verify` — `npm ci`, `npm run verify`, `npm run build`. **This is the required check on `main`.**

Wait for CI green before requesting merge.

### Releases

Fully automated via [release-please](https://github.com/googleapis/release-please). You don't run `npm version`, push tags, or edit `CHANGELOG.md`.

When a PR with a `feat:` or `fix:` title lands on `main`, release-please opens or updates a release PR titled `chore(main): release X.Y.Z`. Squash-merging that PR creates a tag, which triggers `npm publish`.

Bump rules:

- `feat:` → minor
- `fix:` → patch
- `feat!:` / `fix!:` / `BREAKING CHANGE:` in body → major
- `chore:`, `docs:`, `refactor:`, `ci:`, `build:`, `perf:`, `test:` → no release on their own; included in the changelog when the next `feat:` / `fix:` triggers a release

### What you don't need to do

- No manual version bumping.
- No tag pushing.
- No `CHANGELOG.md` edits (release-please owns it).
- No `npm publish` from a laptop.

---

## Project metadata

- **Manifest:** [`.dm-standards.json`](./.dm-standards.json) — declares overlays (`typescript-node`, `public-package`) and visibility (`public`).
- **Required CI check on `main`:** `verify`.
- **Required secrets:** `NPM_TOKEN`, `RELEASE_PLEASE_TOKEN`.

---

## Standards (internal)

These rules are documented in the private [`Dreher-Media/standards`](https://github.com/Dreher-Media/standards) repo. Links resolve for members of the Dreher-Media org; external contributors don't need them — the Quick start above covers everything you need to contribute.

- [`base/git-workflow.md`](https://github.com/Dreher-Media/standards/blob/main/base/git-workflow.md) — branch naming, when to PR, keeping branches current.
- [`base/commit-conventions.md`](https://github.com/Dreher-Media/standards/blob/main/base/commit-conventions.md) — Conventional Commits format, types, breaking changes.
- [`base/repo-configuration.md`](https://github.com/Dreher-Media/standards/blob/main/base/repo-configuration.md) — universal GitHub settings + ruleset.
- [`overlays/typescript-node/tooling.md`](https://github.com/Dreher-Media/standards/blob/main/overlays/typescript-node/tooling.md) — local automation (Husky, lint-staged, the `verify` script).
- [`overlays/public-package/release-please.md`](https://github.com/Dreher-Media/standards/blob/main/overlays/public-package/release-please.md) — the always-on release PR; gotchas around `RELEASE_PLEASE_TOKEN`.
- [`overlays/public-package/npm-publishing.md`](https://github.com/Dreher-Media/standards/blob/main/overlays/public-package/npm-publishing.md) — tag-triggered publish; required secrets.
- [`overlays/public-package/semver-discipline.md`](https://github.com/Dreher-Media/standards/blob/main/overlays/public-package/semver-discipline.md) — what counts as a breaking change for consumers.
- [`decisions/0003-public-repos-cannot-use-private-reusable-workflows.md`](https://github.com/Dreher-Media/standards/blob/main/decisions/0003-public-repos-cannot-use-private-reusable-workflows.md) — why this repo's configs and workflows are bundled inline rather than installed/referenced.

### Why bundled, not installed?

This repo is **public**. The standards configs (`@dreher-media/eslint-config`, `prettier-config`, etc.) live in a private GitHub Packages registry. Installing them in a public repo would require leaking auth into public CI logs and force external contributors to authenticate to install dev dependencies. So we bundle the relevant content inline — see `prettier.config.js`, `commitlint.config.cjs`, and `tsconfig.json` for the inline copies. They mirror the canonical sources in `Dreher-Media/standards/configs/`.

The same logic applies to GitHub Actions workflows — public repos cannot invoke private reusable workflows (this is a GitHub platform constraint, not a config issue). The workflows in `.github/workflows/` are kept inline and align with the canonical templates in `Dreher-Media/standards/templates/workflows/public-package/`.

When the canonical sources change, the inline copies must be updated manually until automated drift detection exists.
