/**
 * Renders the self-contained end-user changelog page.
 *
 * The page embeds its own CSS, JS and the full changelog JSON, so it works
 * both as a static file and served by the tiny backend.
 */
import type { ChangelogDocument } from '../core/types.js';
export declare function escapeHtml(value: string): string;
export declare function renderPage(document: ChangelogDocument): string;
