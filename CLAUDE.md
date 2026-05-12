# CLAUDE.md

Project guide for Claude Code. The full guide is in [AGENTS.md](./AGENTS.md); the Hard rules are restated here so they're impossible to miss when working in this repo.

---

## Hard rules

These apply to every change. Treat them as inviolable.

- **PRs target `main`.** This is a single-trunk repo. Working branches cut from `main`.
- **PR titles are Conventional Commits.** `feat:` / `fix:` / `chore:` / etc. release-please reads PR titles — malformed titles break the release pipeline.
- **No `Co-Authored-By: Claude` or "Generated with …" trailers** in commits, PRs, or issues. Project history reads as if a human author produced the work.
- **No direct pushes to `main`.** Always go through a PR.
- **No `git commit --no-verify`.** Fix the underlying issue, or fix the hook.
- **No manual `npm publish`, manual `npm version`, or `CHANGELOG.md` edits.** release-please owns the release flow.
- **Run `npm run verify` locally before opening a PR.** Same checks CI runs.
- **No `pull_request_target` triggers in GitHub workflows.** Use `pull_request`. The TanStack 2026-05-11 npm compromise was this attack vector.
- **No git-based dependencies** in `package.json` or `package-lock.json`. Use registry tarballs only.

---

See [`AGENTS.md`](./AGENTS.md) for: Quick start, Develop / PR / Releases sections, project metadata, standards links.
