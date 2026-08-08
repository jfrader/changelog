/**
 * Public API for the changelog library. The CLI is the primary interface, but
 * every capability is also available programmatically for integrations (CI,
 * in-app "What's new" panels, release tooling).
 */
export {
  buildProject,
  writeBuildOutputs,
} from './core/build.js';
export {
  add,
  build,
  init,
  listEntries,
  serve,
  type AddOptions,
  type InitOptions,
  type ListOptions,
  type ServeOptions,
} from './core/commands.js';
export {
  parseEntry,
  readEntries,
  slugify,
  entryFileName,
  ENTRY_PATTERN,
  isKnownKind,
  isKnownAudience,
} from './core/entry.js';
export { parseFrontmatter, serializeFrontmatter } from './core/frontmatter.js';
export {
  findProject,
  loadConfig,
  writeConfig,
  DEFAULT_CONFIG,
  CONFIG_FILE,
} from './core/project.js';
export {
  renderMarkdown,
} from './core/render-md.js';
export {
  renderPage,
  escapeHtml,
} from './ui/page.js';
export { startServer } from './server/server.js';
export {
  computeWhatsNew,
  entriesSince,
  localToday,
  markSeenToday,
  readSeenDate,
  shouldShowWhatsNew,
  writeSeenDate,
  DEFAULT_SEEN_KEY,
  type SeenStorage,
  type WhatsNewState,
} from './sdk/seen.js';
export {
  KIND_ORDER,
  AUDIENCES,
  type ChangelogEntry,
  type ChangelogConfig,
  type ChangelogProject,
  type ChangelogDocument,
  type BuildResult,
  type ChangelogKind,
  type ChangelogAudience,
} from './core/types.js';
