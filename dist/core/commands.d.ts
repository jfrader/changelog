import { type ChangelogKind } from './types.js';
export interface InitOptions {
    root: string;
    product?: string;
    productName?: string;
    tagline?: string;
    accent?: string;
    force?: boolean;
}
export declare function init(options: InitOptions): Promise<string>;
export interface AddOptions {
    root: string;
    kind: ChangelogKind;
    title: string;
    date?: string;
    version?: string;
    tags?: string[];
    audience?: string;
    draft?: boolean;
    body?: string;
}
export declare function add(options: AddOptions): Promise<string>;
export interface ListOptions {
    root: string;
    all?: boolean;
}
export declare function listEntries(options: ListOptions): Promise<string[]>;
export declare function build(options: {
    root: string;
}): Promise<{
    outputs: string[];
    warnings: string[];
    errors: string[];
    counts: {
        entries: number;
        published: number;
    };
}>;
export interface ServeOptions {
    root: string;
    port: number;
    host: string;
}
export declare function serve(options: ServeOptions): Promise<{
    port: number;
    close: () => Promise<void>;
}>;
