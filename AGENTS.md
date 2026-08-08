# Changelog Agent Notes

## Project

- `@jfrader/changelog`: a zero-dependency changelog system.
- Stack: TypeScript, Node >= 20, zero runtime deps; tests via the node test
  runner (tsx); build via `tsc`.
- Run `npm run check` (typecheck + tests + build) before finishing a change.
- Two public entry points: `dist/index.js` (tooling API + CLI) and
  `dist/sdk/index.js` (browser-safe What's New SDK — must stay Node/DOM-free).

## Changelog

- This repository dogfoods its own system. Record every user-visible feature,
  improvement, fix, or breaking change as an entry in `changelog/entries/`
  (one markdown file per change, `YYYY-MM-DD--slug.md`), committed with the
  change it describes.
- Scaffold entries with `node dist/cli.js add --title "..." --kind ...` and
  fill the body with brief, literal end-user copy. Never invent an entry.
- Run `node dist/cli.js build` before shipping so `changelog/CHANGELOG.md`,
  `changelog/changelog.json`, and the end-user page `changelog/index.html`
  stay current.
- Read `changelog/RUNBOOK.md` and `changelog/SKILL.md` for the full workflow.
- Bump `version` in `package.json` and the matching entry's `version` together
  when releasing; `npm publish` runs `prepublishOnly` (`npm run check`).
