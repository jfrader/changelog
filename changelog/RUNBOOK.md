# Changelog runbook — changelog

The changelog records **end-user-visible changes** (new features, improvements,
bug fixes, breaking changes). It has three moving parts:

1. **Markdown entries** in `entries/` — the source of truth, reviewed in git.
2. **The build** — `changelog build` turns entries into `CHANGELOG.md`
   (human doc), `changelog.json` (feed), and `index.html` (end-user page).
3. **The backend** — `changelog serve` serves that page and JSON locally or
   on a host.

## 1. Entry format

Each entry is one file: `entries/YYYY-MM-DD--short-slug.md`.

```markdown
---
kind: feature            # feature | improvement | fix | breaking | chore
date: 2026-08-07
title: "What changed"     # default-language title
title.es: "Qué cambió"    # optional: title for another configured language
tags: [match, replay]
audience: all            # all | player | manager | guest | admin
version: 0.1.0           # optional
published: true          # false = draft, excluded from builds
---

## en

End-user copy in the default language: 1–3 short sentences.

## es

Copy para usuarios en español: 1–3 oraciones cortas.
```

Rules:

- One entry per user-visible change. Group related changes under one title.
- **Never invent an entry** — only changes that actually shipped to users.
- Use the scaffold (`changelog add`) so the frontmatter stays correct.
- Keep copy brief and literal; do not explain UI that its visuals already make
  obvious (matching each product's writing style).
- `kind` and `date` are required; a bad entry fails the build with a clear
  message and is skipped with a warning otherwise.

### What does NOT get an entry

The changelog is for **end users**, so skip anything they cannot see, use, or
feel. Do not write entries for:

- **Internal tools and developer surfaces** — admin consoles, CLI tools,
  maintenance scripts, CI/deploy pipelines, dev-only features.
- **Refactors** with no user-visible behavior change, and dead-code removal.
- **Dependency bumps and library upgrades** with no observable effect on users.
- **Test-only work** — new tests, test infrastructure, fixtures.
- **Backend or performance changes with no observable impact** — internal data
  migrations, schema changes, queue/worker plumbing, caching that changes
  nothing the user notices.
- **Documentation-only changes** and internal docs.
- **Build/config changes invisible to end users** (Dockerfiles, environment
  wiring, lint/format configuration).

The test question: *"If a user used the product before this change and after
it, would they notice anything?"* If the honest answer is "no" (or "only
during development"), there is no entry. When in doubt, leave it out — a
missing entry is a non-event, a junk entry misleads users. Exceptions require
an explicit user request to log an internal change.

### i18n (multi-language projects)

- `config.json` lists the supported codes (`languages`) and which one is the
  `defaultLanguage`. Unmarked content and legacy entries belong to the
  default language.
- Per-language titles live in frontmatter: `title.en`, `title.es`, …
  (the plain `title` key is the default language).
- Per-language bodies live in the body under `## <code>` headings. The default
  language may be the first unmarked section for a single-language entry.
- The end-user page and the `localize` SDK helper pick the reader's language
  and fall back to the default language when a language lacks content.
- Single-language entries (no `title.<lang>`, no `## <code>` sections) keep
  working unchanged and are treated as default-language content.

## 2. Add an entry

```bash
# From the repository root (or anywhere under it):
changelog add --title "Market auctions now close on time" --kind fix --tags "transfer, auction"
```

Optional flags: `--date YYYY-MM-DD` (default today),
`--version x.y.z`, `--tags a,b`, `--audience player`,
`--draft` (create as unpublished), `--root /path/to/repo`.

After scaffolding, open the file and fill the body. Commit the entry with the
change that it describes — entries travel with the code in the same commit.

## 3. Build

```bash
changelog build
```

Writes into `changelog/`:

- `CHANGELOG.md` — newest-first, grouped by day.
- `changelog.json` — machine-readable feed for the UI and any integrations.
- `index.html` — the self-contained end-user page (works from `file://` too).

Unpublished/draft entries are skipped. Warnings (unknown fields, odd file
names) are reported but do not fail the build; errors (missing kind/date/title)
are reported and the entry is skipped.

## 4. Preview and serve

```bash
changelog serve --port 4567
# → http://localhost:4567            end-user page
# → http://localhost:4567/changelog.json
# → http://localhost:4567/api/entries
# → http://localhost:4567/entries/<file>.md
```

The server is read-only by design: entries change in git, get built, then get
served. `--host 0.0.0.0` exposes it on a network.

## 5. Publish to end users

The end-user page is a plain static bundle: `changelog/index.html` +
`changelog/changelog.json`. Publish it however the product already ships
static content:

- **Static host**: copy both files to the public web root (e.g. a `/changelog`
  folder on the site's CDN or web server).
- **Backend**: run `changelog serve` behind the existing reverse proxy, or
  mount the generated `changelog/` folder in the web container.
- **In-app**: fetch `changelog.json` from the app and render a "What's new"
  panel with the shared page's design tokens.

Suggested deploy gate: build the changelog in CI on every release and fail the
release if any published entry references an unreleased change (that is a
policy check, not something the tool decides for you).

## 6. Agents

- Append `AGENTS.snippet.md` to the repository `AGENTS.md` so coding agents
  keep entries current while they work.
- `SKILL.md` is the full agent skill; reference it from agent configs
  (`.claude/skills/`, `.codex/`, etc.) when the project uses them.

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Entry skipped with "Missing frontmatter" | Add the `---` block via `changelog add`. |
| Entry skipped with "Invalid date" | Use `YYYY-MM-DD`. |
| Page shows stale data | Re-run `changelog build`. |
| `changelog` command not found | Install the library or call it via `npx`/absolute path. |
| Port already in use | `changelog serve --port 0` picks a free port. |
