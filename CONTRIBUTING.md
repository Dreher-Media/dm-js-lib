# Contributing

Short guide for working on this repo.

## Branching

- `main` — production-released to npm. Only updated via `release/<version>` PRs from `develop`.
- `develop` — integration. Only updated via PR from working branches.
- Working branches cut from `develop`:
  - `feat/<slug>` — new feature
  - `fix/<slug>` — bug fix
  - `chore/<slug>` — tooling, deps, non-code
  - `docs/<slug>` — docs-only
  - `refactor/<slug>` — internal change, no behavior diff
  - `release/<version>` — `develop` → `main` release PR (e.g. `release/1.7.0`)

```bash
git fetch origin
git switch -c feat/my-thing origin/develop
```

Never commit directly to `main` or `develop`. Every change goes through a PR so CI runs.

## Commits

[Conventional commits](https://www.conventionalcommits.org/): `feat()`, `fix()`, `chore()`, `docs()`, `refactor()`, `ci()`, `build()`, `perf()`. Subject in imperative mood, lowercase, no trailing period.

PRs are squash-merged; the squash commit becomes the canonical entry on `develop`.

## Local automation

A pre-commit hook (Husky + lint-staged) runs `prettier --write` on staged files. If the hook complains, fix the issue and re-stage — don't `--no-verify`.

`npm run verify` runs `format:check` + `typecheck` together. Run it before opening a PR.

## Pre-PR checklist

1. `npm run verify` — formatting and typecheck must pass.
2. `npm run build` — ensure the bundle still builds.
3. UI changes: load `dist/dm-js-lib.min.js` from `sandbox/` or a real site and verify in a browser.

## Pull requests

Target `develop`. Use the [PR template](.github/pull_request_template.md): Summary, Why, Test plan, Risk/rollback. Wait for CI green before requesting merge.

## Releases (`develop` → `main` → npm)

Versioning is manual; publishing is automated via the `Publish` workflow, triggered when a `v*` tag is pushed to `main`.

```bash
# 1. Decide the next version (semver: patch / minor / major)
NEXT=1.7.0

# 2. Cut a release branch from develop
git fetch origin
git switch -c release/$NEXT origin/develop

# 3. Bump package.json (no tag yet — tag is created on main after merge)
npm version $NEXT --no-git-tag-version
git commit -am "chore: release $NEXT"
git push -u origin HEAD

# 4. Open the release PR
gh pr create --base main --title "release: $NEXT"
```

PR body should list the merged PR titles on `develop` since the last release. Squash-merge into `main`.

After the PR merges:

```bash
# 5. Tag main and push — this triggers the Publish workflow
git switch main
git pull
git tag v$NEXT
git push origin v$NEXT

# 6. Sync develop with main so future work continues from the released state
git switch develop
git pull
git merge --ff-only origin/main
git push
```

The `Publish` workflow runs `npm ci`, `npm run verify`, `npm run build`, then `npm publish` using the `NPM_TOKEN` repo secret.

## Required GitHub setup

One-time, by the maintainer:

- Set `develop` as the default branch.
- Branch protection on `main` and `develop`: require PR + green CI before merge.
- Add an `NPM_TOKEN` repository secret (npm automation token with publish rights for `@dreher-media/dm-js-lib`).

## What we don't do

- No commit-msg linter — convention is followed by hand.
- No automated tests yet (no `vitest`/`jest`/`playwright`). Verification is manual; document what you did in the PR's Test plan.
