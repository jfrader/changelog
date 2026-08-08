## Changelog

- Record every end-user-visible feature, improvement, fix, or breaking change
  as a changelog entry in `changelog/entries/` (one markdown file per change,
  `YYYY-MM-DD--slug.md`), committed with the change it describes.
- Write entries only for what end users can see, use, or feel. Never log
  internal tools, admin consoles, refactors, dependency bumps, test-only work,
  or backend/config changes with no observable user impact. If a user would
  notice nothing between before and after, there is no entry.
- Scaffold entries with `changelog add` (from this repo root) and fill the
  body with brief, literal end-user copy. Never invent an entry.
- Write copy in every language the product ships: per-language titles as
  `title.<code>` and per-language bodies under `## <code>` sections (see
  `changelog/RUNBOOK.md`).
- Run `changelog build` before shipping so `changelog/CHANGELOG.md`,
  `changelog/changelog.json`, and the end-user page `changelog/index.html`
  stay current. Serve or publish the page only when asked.
- Read `changelog/RUNBOOK.md` and `changelog/SKILL.md` for the full
  workflow, entry format, and deploy guidance.
