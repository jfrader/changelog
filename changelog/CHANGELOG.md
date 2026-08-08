# Changelog — changelog

> What is new in the changelog tool

_Generated Sat, 08 Aug 2026 15:20:22 GMT from 5 entries._

## 2026-08-08

### What's New remembers every release

_Fix · 1.1.2 · `sdk` `browser`_

Use the storage-backed SDK helpers to keep later same-day entries visible
without replaying old news, even when upgrading from date-only state. What's
New and generated pages remain usable when browser storage is blocked.

### Multilingual entries

_New feature · 1.1.0 · `i18n`_

Entries can now carry per-language titles and bodies; the end-user page and the in-app modals render in the reader's language.

### Install from either registry

_Improvement · 1.1.2 · `package` `distribution`_

Install `@jfrader/changelog` from npmjs or GitHub Packages. Both registries
receive the same verified release artifact.

### Drafts stay out of public feeds

_Fix · 1.1.2 · `feed` `privacy`_

Draft entries are now excluded from generated JSON, rendered outputs, and raw
server routes, so unpublished copy stays private.

## 2026-08-07

### First public release

_New feature · 1.0.0 · `release`_

Zero-dependency changelog system: markdown entries, an agent-facing MD workflow, a build, a tiny serve backend, and a browser-safe in-app What's New SDK.
