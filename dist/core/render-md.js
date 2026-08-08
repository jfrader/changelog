const KIND_LABEL = {
    feature: 'New feature',
    improvement: 'Improvement',
    fix: 'Fix',
    breaking: 'Breaking',
    chore: 'Chore',
};
function badge(entry) {
    const kind = KIND_LABEL[entry.kind] ?? entry.kind;
    const bits = [kind];
    if (entry.version)
        bits.push(entry.version);
    if (entry.tags.length)
        bits.push(entry.tags.map((tag) => `\`${tag}\``).join(' '));
    return bits.join(' · ');
}
export function renderMarkdown(document) {
    const lines = [];
    lines.push(`# Changelog — ${document.productName}`);
    lines.push('');
    lines.push(`> ${document.tagline}`);
    lines.push('');
    lines.push(`_Generated ${new Date(document.generatedAt).toUTCString()} from ${document.entries.length} entries._`);
    lines.push('');
    const grouped = new Map();
    const sorted = [...document.entries].sort((a, b) => {
        if (a.date !== b.date)
            return a.date < b.date ? 1 : -1;
        return a.id < b.id ? 1 : -1;
    });
    for (const entry of sorted) {
        if (!entry.published)
            continue;
        const list = grouped.get(entry.date) ?? [];
        list.push(entry);
        grouped.set(entry.date, list);
    }
    if (grouped.size === 0) {
        lines.push('No published entries yet.');
        lines.push('');
    }
    for (const [date, entries] of grouped) {
        lines.push(`## ${date}`);
        lines.push('');
        for (const entry of entries) {
            lines.push(`### ${entry.title}`);
            lines.push('');
            lines.push(`_${badge(entry)}_`);
            lines.push('');
            if (entry.body) {
                lines.push(entry.body);
                lines.push('');
            }
        }
    }
    return lines.join('\n');
}
//# sourceMappingURL=render-md.js.map