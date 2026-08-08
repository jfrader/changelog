/**
 * Templates shipped with the library and written into a project by `init`.
 */

export const ENTRY_TEMPLATE = `---
kind: feature
date: DATE
title: "TITLE"
tags: []
audience: all
published: true
---

# TITLE

Describe the change for end users in 1–3 short sentences. Keep it literal and
helpful: what they can now do, or what no longer misbehaves. Use bullet lists
only when a few distinct points add real value.
`;

export const README_TEMPLATE = `# Changelog

This folder is the changelog system for **PRODUCT_NAME**.

- \`entries/\` — one markdown file per end-user-visible change
  (\`YYYY-MM-DD--slug.md\`).
- \`config.json\` — product identity and output settings for this project.
- \`CHANGELOG.md\` — generated human-readable changelog (do not edit by hand).
- \`changelog.json\` + \`index.html\` — generated feed for the end-user page.
- \`RUNBOOK.md\` — the full runbook: entry format, build, serve, deploy.
- \`SKILL.md\` — agent skill for changelog maintenance.
- \`AGENTS.snippet.md\` — append this to the repository \`AGENTS.md\` so agents
  keep the changelog current.

Quick start:

\`\`\`bash
changelog add --title "Your change" --kind feature   # scaffold an entry
changelog build                                        # generate outputs
changelog serve --port 4567                            # preview the page
\`\`\`
`;

export const RUNBOOK_TEMPLATE = `# Changelog runbook — PRODUCT_NAME

The changelog records **end-user-visible changes** (new features, improvements,
bug fixes, breaking changes). It has three moving parts:

1. **Markdown entries** in \`entries/\` — the source of truth, reviewed in git.
2. **The build** — \`changelog build\` turns entries into \`CHANGELOG.md\`
   (human doc), \`changelog.json\` (feed), and \`index.html\` (end-user page).
3. **The backend** — \`changelog serve\` serves that page and JSON locally or
   on a host.

## 1. Entry format

Each entry is one file: \`entries/YYYY-MM-DD--short-slug.md\`.

\`\`\`markdown
---
kind: feature            # feature | improvement | fix | breaking | chore
date: 2026-08-07
title: "What changed"
tags: [match, replay]
audience: all            # all | player | manager | guest | admin
version: 0.1.0           # optional
published: true          # false = draft, excluded from builds
---

# What changed

End-user copy: 1–3 short sentences. Literal and helpful.
\`\`\`

Rules:

- One entry per user-visible change. Group related changes under one title.
- **Never invent an entry** — only changes that actually shipped to users.
- Use the scaffold (\`changelog add\`) so the frontmatter stays correct.
- Keep copy brief and literal; do not explain UI that its visuals already make
  obvious (matching each product's writing style).
- \`kind\` and \`date\` are required; a bad entry fails the build with a clear
  message and is skipped with a warning otherwise.

## 2. Add an entry

\`\`\`bash
# From the repository root (or anywhere under it):
changelog add --title "Market auctions now close on time" --kind fix --tags "transfer, auction"
\`\`\`

Optional flags: \`--date YYYY-MM-DD\` (default today),
\`--version x.y.z\`, \`--tags a,b\`, \`--audience player\`,
\`--draft\` (create as unpublished), \`--root /path/to/repo\`.

After scaffolding, open the file and fill the body. Commit the entry with the
change that it describes — entries travel with the code in the same commit.

## 3. Build

\`\`\`bash
changelog build
\`\`\`

Writes into \`changelog/\`:

- \`CHANGELOG.md\` — newest-first, grouped by day.
- \`changelog.json\` — machine-readable feed for the UI and any integrations.
- \`index.html\` — the self-contained end-user page (works from \`file://\` too).

Unpublished/draft entries are skipped. Warnings (unknown fields, odd file
names) are reported but do not fail the build; errors (missing kind/date/title)
are reported and the entry is skipped.

## 4. Preview and serve

\`\`\`bash
changelog serve --port 4567
# → http://localhost:4567            end-user page
# → http://localhost:4567/changelog.json
# → http://localhost:4567/api/entries
# → http://localhost:4567/entries/<file>.md
\`\`\`

The server is read-only by design: entries change in git, get built, then get
served. \`--host 0.0.0.0\` exposes it on a network.

## 5. Publish to end users

The end-user page is a plain static bundle: \`changelog/index.html\` +
\`changelog/changelog.json\`. Publish it however the product already ships
static content:

- **Static host**: copy both files to the public web root (e.g. a \`/changelog\`
  folder on the site's CDN or web server).
- **Backend**: run \`changelog serve\` behind the existing reverse proxy, or
  mount the generated \`changelog/\` folder in the web container.
- **In-app**: fetch \`changelog.json\` from the app and render a "What's new"
  panel with the shared page's design tokens.

Suggested deploy gate: build the changelog in CI on every release and fail the
release if any published entry references an unreleased change (that is a
policy check, not something the tool decides for you).

## 6. Agents

- Append \`AGENTS.snippet.md\` to the repository \`AGENTS.md\` so coding agents
  keep entries current while they work.
- \`SKILL.md\` is the full agent skill; reference it from agent configs
  (\`.claude/skills/\`, \`.codex/\`, etc.) when the project uses them.

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Entry skipped with "Missing frontmatter" | Add the \`---\` block via \`changelog add\`. |
| Entry skipped with "Invalid date" | Use \`YYYY-MM-DD\`. |
| Page shows stale data | Re-run \`changelog build\`. |
| \`changelog\` command not found | Install the library or call it via \`npx\`/absolute path. |
| Port already in use | \`changelog serve --port 0\` picks a free port. |
`;

export const SKILL_TEMPLATE = `---
name: changelog-maintenance
description: Keep the repository changelog current — add a markdown entry for every end-user-visible feature, improvement, fix, or breaking change, then build and (when asked) publish the end-user page. Use when a task ships user-visible work or when the user asks to update, build, or publish the changelog.
---

# Changelog maintenance (PRODUCT_NAME)

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
   \`changelog add --title "..." --kind feature|improvement|fix|breaking\`
   (run from the repository root; the tool walks up to find \`changelog/\`).
2. Open the created \`entries/YYYY-MM-DD--slug.md\` and fill the body with
   brief, literal end-user copy in the product's voice. Keep titles short.
3. Commit the entry together with the change it describes.
4. Before shipping (and whenever asked), run \`changelog build\` so
   \`CHANGELOG.md\`, \`changelog.json\`, and \`index.html\` are current.
5. Only publish/serve when the user asks (serve = \`changelog serve\`).

## Format reminder

\`\`\`markdown
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
\`\`\`

Required: \`kind\`, \`date\`, and a title. Broken entries are reported and
skipped by the build; fix them before shipping.

## Commands

| Command | Purpose |
| --- | --- |
| \`changelog add ...\` | Scaffold a new entry file. |
| \`changelog list\` | Show entries (published by default; \`--all\` includes drafts). |
| \`changelog build\` | Generate CHANGELOG.md, changelog.json, index.html. |
| \`changelog serve\` | Preview the end-user page locally. |
| \`changelog init\` | (Re)create the changelog folder structure in a repo. |

See \`changelog/RUNBOOK.md\` for the full runbook.
`;

export const AGENTS_SNIPPET_TEMPLATE = `## Changelog

- Record every end-user-visible feature, improvement, fix, or breaking change
  as a changelog entry in \`changelog/entries/\` (one markdown file per change,
  \`YYYY-MM-DD--slug.md\`), committed with the change it describes.
- Scaffold entries with \`changelog add\` (from this repo root) and fill the
  body with brief, literal end-user copy. Never invent an entry.
- Run \`changelog build\` before shipping so \`changelog/CHANGELOG.md\`,
  \`changelog/changelog.json\`, and the end-user page \`changelog/index.html\`
  stay current. Serve or publish the page only when asked.
- Read \`changelog/RUNBOOK.md\` and \`changelog/SKILL.md\` for the full
  workflow, entry format, and deploy guidance.
`;
