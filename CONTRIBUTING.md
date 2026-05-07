# Contributing

Short guide for working on this repo.

## Branching

- `main` — single trunk. Production-released to npm. Updated via PRs.
- Working branches cut from `main`:
  - `feat/<slug>` — new feature
  - `fix/<slug>` — bug fix
  - `chore/<slug>` — tooling, deps, non-code
  - `docs/<slug>` — docs-only
  - `refactor/<slug>` — internal change, no behavior diff

```bash
git fetch origin
git switch -c feat/my-thing origin/main
```

Never commit directly to `main`. Every change goes through a PR so CI runs.

## Commits

[Conventional commits](https://www.conventionalcommits.org/): `feat()`, `fix()`, `chore()`, `docs()`, `refactor()`, `ci()`, `build()`, `perf()`. Subject in imperative mood, lowercase, no trailing period.

PRs are squash-merged; the squash commit's title (= PR title) becomes the canonical entry on `main` and feeds release-please. **The PR title must be a valid conventional commit** — that's how the next version and changelog are determined.

Bump rules (release-please defaults):

- `fix:` → patch
- `feat:` → minor
- `feat!:` / `fix!:` / `BREAKING CHANGE:` in body → major
- Anything else (`chore:`, `docs:`, `refactor:`, `ci:`, `build:`, `perf:`) → no release on its own, but is included in the changelog

## Local automation

A pre-commit hook (Husky + lint-staged) runs `prettier --write` on staged files. If the hook complains, fix the issue and re-stage — don't `--no-verify`.

`npm run verify` runs `format:check` + `typecheck` together. Run it before opening a PR.

## Pre-PR checklist

1. `npm run verify` — formatting and typecheck must pass.
2. `npm run build` — ensure the bundle still builds.
3. UI changes: load `dist/dm-js-lib.min.js` from `sandbox/` or a real site and verify in a browser.

## Pull requests

Target `main`. Use the [PR template](.github/pull_request_template.md): Summary, Why, Test plan, Risk/rollback. Wait for CI green before requesting merge.

## Releases

Fully automated via [release-please](https://github.com/googleapis/release-please). You don't run `npm version` or push tags manually.

**Flow:**

1. Merge feature/fix PRs into `main` with conventional-commit titles (squash merge).
2. The `release-please` workflow watches `main` and keeps a **release PR** (titled `chore(main): release X.Y.Z`) up to date with the next version bump and a generated `CHANGELOG.md` entry.
3. When you're ready to ship, **squash-merge the release-please PR**.
4. release-please creates a git tag (`vX.Y.Z`) and a GitHub Release on the merge commit.
5. The tag push triggers the **Publish** workflow, which runs `npm ci` → `verify` → `build` → `npm publish --access public` using the `NPM_TOKEN` secret.

That's it — no release branches, no manual version edits, no manual changelog.

### Skipping a release

If you have unreleased commits on `main` but don't want to ship yet, just don't merge the release-please PR. It will keep updating until you do.

### Forcing a specific bump

Use `feat!:` or include `BREAKING CHANGE:` in the commit body to force a major bump. To skip release entirely for a commit, prefix with `chore:`, `docs:`, etc.

## Required GitHub setup

One-time, by the maintainer:

- `main` is the default branch.
- Branch protection on `main`: require PR + green CI before merge.
- Repo secret `NPM_TOKEN`: npm automation token with publish rights for `@dreher-media/dm-js-lib`.
- Repo secret `RELEASE_PLEASE_TOKEN`: a fine-grained personal access token (or GitHub App token) with `contents: read/write` and `pull-requests: read/write` on this repo. Required so release-please's PRs trigger CI — PRs opened by the default `GITHUB_TOKEN` do not run `pull_request` workflows.
- Workflow permissions (Settings → Actions → General): "Read and write" so release-please can open PRs and create releases. Also enable "Allow GitHub Actions to create and approve pull requests."

## What we don't do

- No commit-msg linter — convention is followed by hand (and enforced by the fact that release-please reads PR titles).
- No automated tests yet (no `vitest`/`jest`/`playwright`). Verification is manual; document what you did in the PR's Test plan.
