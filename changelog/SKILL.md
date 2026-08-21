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

Do **not** write entries for:

- **Internal tools and developer surfaces**: admin consoles, CLI tools,
  maintenance scripts, CI/deploy pipelines, dev-only features.
- **Refactors** and dead-code removal with no user-visible behavior change.
- **Dependency bumps** and library upgrades with no observable effect.
- **Test-only work** (tests, fixtures, test infrastructure).
- **Backend/performance work with no observable impact**: internal migrations,
  schema changes, queue/worker plumbing, caching that changes nothing the user
  notices.
- **Documentation-only or build/config changes** invisible to end users.

The test question: *"Would a user notice anything between before and after?"*
If the honest answer is "no" (or "only during development"), there is no
entry. When in doubt, leave it out — a missing entry is a non-event; a junk
entry misleads users. Exceptions require an explicit user request to log an
internal change. Never invent an entry.

## Choose the kind

Choose from the user's point of view. `kind` controls the category shown in
the changelog; `tags` only describe topics and never replace the one `kind`.

- `feature`: a new capability; established behavior and rules remain intact.
- `improvement`: an existing capability works better without changing what
  users must understand or decide.
- `fix`: restores already-intended behavior. Do not use it merely because new
  behavior is more realistic or preferable.
- `breaking`: the user-facing **important change** category. Use it when
  established rules, outcomes, workflows, stored state, or compatibility
  change materially enough that returning users may be surprised or must
  adapt. Examples include material simulation-engine behavior, economy/debt
  rules, new deadlines or locks, removals, resets, and forced re-authentication.
- `chore`: a rare user-visible maintenance notice. Internal chores still get
  no entry.

If a change both adds something and materially changes established behavior,
`breaking` wins. An internal engine version bump is not automatically
breaking; use it when the version changes user-visible outcomes or the meaning
of their decisions, not for refactors or visual-only work.

## Workflow

1. Choose the kind using the impact rules above.
2. When a user-visible change is part of the task, scaffold an entry:
   `changelog add --title "..." --kind feature|improvement|fix|breaking`
   (run from the repository root; the tool walks up to find `changelog/`).
3. Open the created `entries/YYYY-MM-DD--slug.md` and fill the body with
   brief, literal end-user copy in the product's voice. Keep titles short.
4. Commit the entry together with the change it describes.
5. Before shipping (and whenever asked), run `changelog build` so
   `CHANGELOG.md`, `changelog.json`, and `index.html` are current.
6. Only publish/serve when the user asks (serve = `changelog serve`).

## Format reminder

```markdown
---
kind: feature            # feature | improvement | fix | breaking | chore
date: YYYY-MM-DD
title: "Short title"     # default language
title.es: "Título corto" # optional per-language title
tags: [optional, tags]
audience: all
published: true          # false keeps a draft out of builds
---

## en

One to three short, literal sentences for end users.

## es

Una a tres oraciones cortas y literales para los usuarios.
```

Required: `kind`, `date`, and a title. Broken entries are reported and
skipped by the build; fix them before shipping.

### i18n

Write entries in every language the product ships (`config.json` →
`languages`): per-language titles as `title.<code>`, per-language bodies
under `## <code>` headings. The default language is the one unmarked/legacy
content belongs to; the page and the SDK fall back to it when a language is
missing.

## Commands

| Command | Purpose |
| --- | --- |
| `changelog add ...` | Scaffold a new entry file. |
| `changelog list` | Show entries (published by default; `--all` includes drafts). |
| `changelog build` | Generate CHANGELOG.md, changelog.json, index.html. |
| `changelog serve` | Preview the end-user page locally. |
| `changelog init` | (Re)create the changelog folder structure in a repo. |

See `changelog/RUNBOOK.md` for the full runbook.
