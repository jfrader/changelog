## Changelog

- Record every end-user-visible feature, improvement, fix, or breaking change
  as a changelog entry in `changelog/entries/` (one markdown file per change,
  `YYYY-MM-DD--slug.md`), committed with the change it describes.
- Scaffold entries with `changelog add` (from this repo root) and fill the
  body with brief, literal end-user copy. Never invent an entry.
- Run `changelog build` before shipping so `changelog/CHANGELOG.md`,
  `changelog/changelog.json`, and the end-user page `changelog/index.html`
  stay current. Serve or publish the page only when asked.
- Read `changelog/RUNBOOK.md` and `changelog/SKILL.md` for the full
  workflow, entry format, and deploy guidance.
