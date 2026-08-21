# @jfrader/changelog

A zero-dependency changelog system for any project. It combines:

1. **Markdown entries** — one file per end-user-visible change, reviewed in git.
2. **An agent-facing MD workflow** — `SKILL.md`, `RUNBOOK.md` and an
   `AGENTS.md` snippet that keep coding agents recording changes as they ship.
3. **A build** — turns entries into `CHANGELOG.md` (human doc), `changelog.json`
   (feed), and `index.html` (a self-contained end-user page).
4. **A tiny backend** — `changelog serve` serves the page, the JSON feed and a
   read-only API with **zero runtime dependencies**.
5. **A browser-safe SDK** — `@jfrader/changelog/sdk` powers in-app "What's New"
   modals in any framework, with seen-tracking and filtering.

## Quick start

```bash
npm install -D @jfrader/changelog

# 1. Init once per repository:
npx changelog init --product myapp --name "My App" \
  --tagline "What is new" --accent "#22c55e"

# 2. Append changelog/AGENTS.snippet.md to your AGENTS.md (optional, for agents).

# 3. Record a change:
npx changelog add --title "Dark mode" --kind feature --tags ui

# 4. Build before shipping:
npx changelog build

# 5. Preview / publish:
npx changelog serve --port 4567
```

The CLI walks up from the current directory to find `changelog/`, so you can
run it from anywhere inside the repository.

### Registry choice

npmjs is the zero-configuration default. GitHub Packages carries the same
verified tarball, but GitHub requires authentication even for public npm
packages:

```ini
@jfrader:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Registry selection applies to the whole `@jfrader` scope; npm does not fall
back from GitHub Packages to npmjs. Projects that map that scope to GitHub must
authenticate there or use an explicit npmjs tarball URL for a package that is
not mirrored.

## Entry format

Each entry is `changelog/entries/YYYY-MM-DD--short-slug.md`:

```markdown
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

One to three short, literal sentences for end users.
```

Required: `kind`, `date` and a title. Invalid entries are reported and skipped
by the build. Drafts (`published: false`) never reach the page.

## Commands

| Command | Purpose |
| --- | --- |
| `changelog init` | Scaffold `changelog/` (config, entries, docs). `--force` re-creates config + docs. |
| `changelog add` | Scaffold a new entry. Flags: `--title` (required), `--kind`, `--date`, `--version`, `--tags`, `--audience`, `--draft`, `--body`, `--root`. |
| `changelog list` | List entries (`--all` includes drafts). |
| `changelog build` | Generate `CHANGELOG.md`, `changelog.json`, `index.html`. |
| `changelog serve` | Serve the page + JSON + API. Flags: `--port`, `--host`, `--root`. |

## End-user page

`changelog build` writes `changelog/index.html`, a self-contained page that
embeds its own CSS, JS and the full JSON data — it works from `file://` too.
It includes:

- a "What's new" hero with per-kind summary chips;
- filter chips (All / new features / improvements / fixes / breaking changes);
- search, a "New" pulse on the latest feature, and a dark/light theme toggle;
- a safe mini-Markdown renderer for entry bodies.

Use `/changelog` as the public URL. On static SPA hosts, add an exact internal
rewrite from `/changelog` to `/changelog/index.html` before the SPA catch-all;
the built-in server already serves the page at both paths. An internal rewrite
keeps the clean URL visible instead of redirecting visitors to the file name.

## Backend

`changelog serve` is a zero-dependency `node:http` server:

| Route | Content |
| --- | --- |
| `/` | the end-user page |
| `/changelog.json` | machine-readable feed |
| `/api/entries` | JSON API (same feed) |
| `/api/health` | health probe |
| `/entries/<file>.md` | raw published-entry markdown (read-only) |

It is read-only by design: entries change in git, get built, then get served.

## In-app "What's New" modal (SDK)

Import the browser-safe SDK from any web app:

```ts
import {
  computeWhatsNewFromStorage,
  markWhatsNewSeen,
} from "@jfrader/changelog/sdk";
import changelogData from "./changelog.json"; // from `changelog build`

const { entries, hasNew } = computeWhatsNewFromStorage(
  changelogData.entries,
  () => window.localStorage,
);

// When the player dismisses the modal:
markWhatsNewSeen(() => window.localStorage, entries);
```

The SDK has no Node or DOM dependencies — only a tiny storage interface — so
it works in React, Vue, Svelte, or vanilla JS. The storage-backed helpers keep
separate same-day releases visible and tolerate unavailable browser storage.
In SSR apps, call them after the component mounts. You render the modal shell
in your own UI and design tokens.

## Examples

See [`examples/`](examples/README.md) for a runnable **vanilla** "What's New"
modal (open the HTML in a browser, no build step) and a **React** reference
component, both driven by the SDK.

## Agent MD system

Each initialized project gets:

- `changelog/SKILL.md` — a skill agents can reference for changelog maintenance.
- `changelog/RUNBOOK.md` — the full runbook (format, workflow, deploy, FAQ).
- `changelog/AGENTS.snippet.md` — append to the repo `AGENTS.md` so every
  agent keeps entries current while it works (already appended in all three
  repos).

## Development

```bash
npm install
npm run check     # typecheck + tests + build
npm test          # node test runner (tsx)
npm run build     # tsc -> dist
```

## Publishing

Push an annotated `v<package-version>` tag from `main`. The release workflow
checks the tag and lockfile, builds and tests once, packs one immutable tarball,
then verifies or publishes that exact artifact to npmjs and GitHub Packages.
Retries are safe: an existing matching artifact is accepted, while a different
artifact at the same version fails the release.

The npmjs package uses a trusted publisher for
`jfrader/changelog` → `.github/workflows/publish.yml`; GitHub Packages uses the
workflow's scoped `GITHUB_TOKEN`.

GitHub creates a personal package as private on its first publication. After
the first workflow succeeds, make it public once from the package's **Package
settings → Danger Zone → Change visibility**. Later versions keep that setting.

The CLI entry is `dist/cli.js`; the public API is exported from `dist/index.js`
so CI and in-app "What's new" panels can reuse the same parsing and build logic.

## Layout

```
src/
  cli.ts              # CLI entry
  index.ts            # public API
  core/
    types.ts          # shared types
    frontmatter.ts    # dependency-free frontmatter parse/serialize
    entry.ts          # entry parsing, validation, naming
    project.ts        # changelog root discovery + config
    build.ts          # aggregation + output writing
    render-md.ts      # CHANGELOG.md renderer
    commands.ts       # init/add/list/build/serve
    templates.ts      # entry, runbook, skill, AGENTS snippet templates
  ui/page.ts          # self-contained end-user page renderer
  server/server.ts    # tiny static + API backend
test/                 # node test runner specs
```
