import type { ChangelogProject, BuildResult } from './types.js';
export declare function buildProject(project: ChangelogProject): Promise<BuildResult>;
export declare function writeBuildOutputs(project: ChangelogProject, result: BuildResult, html: string): Promise<{
    changelogMd: string;
    changelogJson: string;
    indexHtml: string;
}>;
