/**
 * Browser-safe SDK entry: the "What's New" modal helpers with zero Node
 * dependencies. Use `import { computeWhatsNew } from '@jfrader/changelog/sdk'`
 * from web apps; the main entry also includes CLI/server code for tooling.
 */
export {
  computeWhatsNew,
  entriesSince,
  localize,
  localToday,
  markSeen,
  markSeenToday,
  readSeenDate,
  shouldShowWhatsNew,
  writeSeenDate,
  DEFAULT_SEEN_KEY,
  type LocalizedEntry,
  type SeenStorage,
  type WhatsNewState,
} from './seen.js';
export type {
  ChangelogEntry,
  ChangelogKind,
  ChangelogAudience,
  ChangelogDocument,
} from '../core/types.js';
