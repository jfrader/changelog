import type { ChangelogProject } from '../core/types.js';
export interface ServeOptions {
    port: number;
    host: string;
}
export declare function startServer(project: ChangelogProject, options: ServeOptions): Promise<{
    port: number;
    close: () => Promise<void>;
}>;
