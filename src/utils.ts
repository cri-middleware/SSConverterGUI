export interface HistoryItem {
    /** What was selected for that run: a `.sspj`, or the folder of a batch. */
    inputPath: string;
    outputPath: string | null;
    embedded: boolean;
    timestamp: number;
    /**
     * Projects converted in that run. Absent on entries written before a run
     * was one entry — those recorded a single `.sspj` each and cannot say.
     */
    count?: number;
}

/** Whether an arbitrary parsed value has every field `HistoryItem` promises. */
export function isHistoryItem(value: unknown): value is HistoryItem {
    if (typeof value !== 'object' || value === null) return false;
    const item = value as Record<string, unknown>;
    return typeof item.inputPath === 'string'
        && (typeof item.outputPath === 'string' || item.outputPath === null)
        && typeof item.embedded === 'boolean'
        && typeof item.timestamp === 'number'
        && (item.count === undefined || typeof item.count === 'number');
}

// localStorage is user-writable and may hold entries from an older format, so
// drop anything malformed instead of letting a missing field throw out of
// rendering — that would abort app startup with no way to recover.
export function sanitizeHistory(value: unknown): HistoryItem[] {
    return Array.isArray(value) ? value.filter(isHistoryItem) : [];
}

/**
 * The converter's output directory name for a project with the given `.sspj`
 * file stem. `ssconverter` appends `_emb` when assets are embedded, so the two
 * builds of one project never overwrite each other.
 *
 * Nothing is written to a path built from this: the app leaves the output
 * directory unset so the converter resolves it, and this only fills the
 * placeholder that says where the files will land.
 */
export function defaultOutputName(stem: string, embedded: boolean): string {
    return embedded ? `${stem}_emb` : stem;
}

/**
 * What re-running a history entry would do, for the line under its path.
 *
 * Only what is true of that run: the history column is narrow, and spelling
 * out the defaults ("Emb: No", "Out: Default") pushed the timestamp past the
 * edge. An entry from before runs were recorded whole has no count, and must
 * not claim one; a run with nothing unusual about it returns an empty string
 * and the caller is left with just the date.
 */
export function historySummary(item: HistoryItem): string {
    const parts: string[] = [];
    if (item.count !== undefined) {
        parts.push(`${item.count} project${item.count === 1 ? '' : 's'}`);
    }
    if (item.embedded) {
        parts.push('embedded');
    }
    if (item.outputPath) {
        parts.push(`→ ${item.outputPath}`);
    }
    return parts.join(' · ');
}

export function updateHistory(history: HistoryItem[], newItem: HistoryItem, maxItems: number = 100): HistoryItem[] {
    // Remove if already exists to move to top
    let newHistory = history.filter(h => h.inputPath !== newItem.inputPath);
    newHistory.unshift(newItem);
    if (newHistory.length > maxItems) {
        newHistory = newHistory.slice(0, maxItems);
    }
    return newHistory;
}
