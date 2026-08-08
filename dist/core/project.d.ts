import type { ChangelogConfig, ChangelogProject } from './types.js';
export declare const DEFAULT_CONFIG: ChangelogConfig;
export declare const CONFIG_FILE = "config.json";
export declare function configExists(changelogDir: string): Promise<boolean>;
export declare function loadConfig(changelogDir: string): Promise<ChangelogConfig>;
export declare function writeConfig(changelogDir: string, config: ChangelogConfig): Promise<void>;
/**
 * Find the changelog root for the current working directory. Walks up until it
 * finds a `changelog/` folder, or falls back to `cwd`.
 */
export declare function findProject(startDir?: string): Promise<ChangelogProject | null>;
export declare function entryDirOf(project: ChangelogProject): Promise<string>;
export declare function outDirOf(project: ChangelogProject): Promise<string>;
