/**
 * React reference: a "What's New" modal driven by @jfrader/changelog/sdk.
 *
 * This mirrors the pattern used in the production integrations (MiFulbo,
 * Trucoshi, Huertoku) but is trimmed to a single file. Adapt the markup and
 * styles to your own design system.
 *
 * Usage:
 *   1. Import your built changelog data (the `changelog.json` from `changelog build`).
 *      This reference uses the sample from the vanilla example.
 *   2. Mount <WhatsNewModal /> once at the app root.
 *   3. The modal opens on boot when there are entries newer than the last
 *      seen date, and "Got it" marks them seen so it stays closed until the
 *      next release adds entries.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import changelogData from "../vanilla/changelog.json";
import {
  computeWhatsNew,
  markSeen,
  readSeenDate,
  DEFAULT_SEEN_KEY,
  type ChangelogDocument,
} from "@jfrader/changelog/sdk";

// Vite/TS: generated JSON is typed literally; the generator guarantees the
// narrow ChangelogEntry kinds the SDK expects.
const changelogDocument = changelogData as unknown as ChangelogDocument;

const KIND_LABEL: Record<string, string> = {
  feature: "New feature",
  improvement: "Improvement",
  fix: "Fix",
  breaking: "Breaking change",
  chore: "Chore",
};

const KIND_COLOR: Record<string, string> = {
  feature: "#22c55e",
  improvement: "#0ea5e9",
  fix: "#f59e0b",
  breaking: "#ef4444",
  chore: "#94a3b8",
};

export function WhatsNewModal() {
  const [open, setOpen] = useState(false);

  // Compute "new since last visit" once per app build.
  const { entries, hasNew } = useMemo(() => {
    const lastSeen = readSeenDate(window.localStorage, DEFAULT_SEEN_KEY);
    return computeWhatsNew(changelogDocument.entries, lastSeen);
    // The bundled changelog is fixed for the life of this app build.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hasNew) setOpen(true);
  }, [hasNew]);

  const dismiss = useCallback(() => {
    markSeen(window.localStorage, entries, DEFAULT_SEEN_KEY);
    setOpen(false);
  }, [entries]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatsnew-title"
      onClick={dismiss}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "grid",
        placeItems: "center",
        background: "rgba(15, 20, 40, 0.45)",
        padding: 16,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(520px, 100%)",
          maxHeight: "80vh",
          overflow: "auto",
          background: "#fff",
          color: "#1d2433",
          borderRadius: 16,
          padding: 28,
          boxShadow: "0 20px 60px -20px rgba(20, 30, 60, 0.35)",
        }}
      >
        <p style={{ margin: 0, color: "#6366f1", fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          What&rsquo;s new
        </p>
        <h2 id="whatsnew-title" style={{ margin: "6px 0 18px" }}>
          New in this release
        </h2>

        {entries.map((entry) => (
          <article
            key={entry.id}
            style={{
              border: "1px solid #e4e7ef",
              borderLeft: `4px solid ${KIND_COLOR[entry.kind] ?? "#6366f1"}`,
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                display: "inline-block",
                marginBottom: 6,
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#6366f1",
                border: "1px solid #e4e7ef",
              }}
            >
              {KIND_LABEL[entry.kind] ?? entry.kind}
            </span>
            <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>{entry.title}</h3>
            {entry.body ? (
              <p style={{ margin: 0, fontSize: 13.5, color: "#5c6577" }}>{entry.body}</p>
            ) : null}
          </article>
        ))}

        <div style={{ marginTop: 18, textAlign: "right" }}>
          <button
            type="button"
            onClick={dismiss}
            style={{
              font: "inherit",
              padding: "10px 18px",
              border: 0,
              borderRadius: 10,
              background: "#6366f1",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
