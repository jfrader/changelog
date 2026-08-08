# Examples — the "What's New" modal pattern

This folder shows how to surface changelog entries to end users **inside the
app** as a "What's New" modal, driven by the browser-safe SDK
(`@jfrader/changelog/sdk`).

## The pattern

1. **Data** — your app ships the `changelog.json` that `changelog build`
   generates (bundle it, or fetch it).
2. **Seen-tracking** — the SDK remembers both the release date and exact entry
   ids the player dismissed.
3. **On boot** — compute which entries are new; if any, open the modal once.
4. **On dismiss** — mark them seen so the modal does not reappear until the
   next release adds entries.

```ts
import {
  computeWhatsNewFromStorage,
  markWhatsNewSeen,
} from "@jfrader/changelog/sdk";

const { entries, hasNew } = computeWhatsNewFromStorage(
  changelogData.entries,
  () => window.localStorage,
);

if (hasNew) {
  openModal(entries);
}

// When the player dismisses it:
markWhatsNewSeen(() => window.localStorage, entries);
```

The SDK has no Node or DOM dependencies; you render the modal shell in your own
UI and design tokens. The three reference integrations live in the MiFulbo web
app, the Trucoshi client, and the Huertoku app.

## Examples in this folder

| Folder | What it is |
| --- | --- |
| `vanilla/` | A self-contained HTML page — open it in a browser and see the modal appear. Zero build step, plain DOM. |
| `react/` | A concise React component + hook reference (mirrors the pattern used in the production apps). |

## Run the vanilla example

```bash
# Build the library first (dist is committed, but rebuild to be safe):
npm run build   # from the repo root

# Serve the repo (the example imports ../../dist/sdk/index.js):
cd examples/vanilla
python3 -m http.server 8080
# open http://localhost:8080
```

The page auto-opens the modal with any entries not seen yet.
Click **Got it** to dismiss; reload and it stays closed. The **What's new**
button always reopens the modal with the full changelog. To see the auto-open
again, clear `changelog.lastSeenDate` and `changelog.seenEntryIds` in DevTools,
or add an entry to `examples/vanilla/changelog.json`.

> In a real app you would import the SDK from the installed package
> (`@jfrader/changelog/sdk`), not from `../../dist/sdk/index.js`. The relative
> import keeps this example runnable straight from the repo.
