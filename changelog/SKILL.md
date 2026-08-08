---
name: changelog-maintenance
description: Keep the repository changelog current — add a markdown entry for every end-user-visible feature, improvement, fix, or breaking change, then build and (when asked) publish the end-user page. Use when a task ships user-visible work or when the user asks to update, build, or publish the changelog.
---

# Changelog maintenance (changelog)

## When to write an entry

Write exactly one entry per **end-user-visible** change:

- A new feature a user can now use.
- A fix for something a user could observe misbehaving.
- A meaningful improvement or a breaking change.

Do **not** write entries for: refactors with no user-visible effect, internal
tooling, dependency bumps, or test-only work — unless the user asks for it.
Never invent an entry; if unsure whether a change is user-visible, treat it as
internal and skip it.

## Workflow

1. When a user-visible change is part of the task, scaffold an entry:
   `changelog add --title "..." --kind feature|improvement|fix|breaking`
   (run from the repository root; the tool walks up to find `changelog/`).
2. Open the created `entries/YYYY-MM-DD--slug.md` and fill the body with
   brief, literal end-user copy in the product's voice. Keep titles short.
3. Commit the entry together with the change it describes.
4. Before shipping (and whenever asked), run `changelog build` so
   `CHANGELOG.md`, `changelog.json`, and `index.html` are current.
5. Only publish/serve when the user asks (serve = `changelog serve`).

## Format reminder

```markdown
---
kind: feature            # feature | improvement | fix | breaking | chore
date: YYYY-MM-DD
title: "Short title"
tags: [optional, tags]
audience: all
published: true          # false keeps a draft out of builds
---

# Short title

One to three short, literal sentences for end users.
```

Required: `kind`, `date`, and a title. Broken entries are reported and
skipped by the build; fix them before shipping.

## Commands

| Command | Purpose |
| --- | --- |
| `changelog add ...` | Scaffold a new entry file. |
| `changelog list` | Show entries (published by default; `--all` includes drafts). |
| `changelog build` | Generate CHANGELOG.md, changelog.json, index.html. |
| `changelog serve` | Preview the end-user page locally. |
| `changelog init` | (Re)create the changelog folder structure in a repo. |

See `changelog/RUNBOOK.md` for the full runbook.
