/**
 * Minimal, dependency-free frontmatter parser for `---`-delimited YAML-ish
 * blocks. Supports the subset of YAML the changelog entries need:
 * scalars, booleans, numbers, quoted strings, and `[a, b]` tag lists.
 */
export interface Frontmatter {
    [key: string]: string | number | boolean | string[] | undefined;
}
export declare function parseFrontmatter(source: string): {
    frontmatter: Frontmatter;
    body: string;
    hasFrontmatter: boolean;
};
export declare function serializeFrontmatter(fields: Frontmatter): string;
