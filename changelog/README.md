# Changelog

This folder is the changelog system for **changelog**.

- `entries/` — one markdown file per end-user-visible change
  (`YYYY-MM-DD--slug.md`).
- `config.json` — product identity and output settings for this project.
- `CHANGELOG.md` — generated human-readable changelog (do not edit by hand).
- `changelog.json` + `index.html` — generated feed for the end-user page.
- `RUNBOOK.md` — the full runbook: entry format, build, serve, deploy.
- `SKILL.md` — agent skill for changelog maintenance.
- `AGENTS.snippet.md` — append this to the repository `AGENTS.md` so agents
  keep the changelog current.

Quick start:

```bash
changelog add --title "Your change" --kind feature   # scaffold an entry
changelog build                                        # generate outputs
changelog serve --port 4567                            # preview the page
```
