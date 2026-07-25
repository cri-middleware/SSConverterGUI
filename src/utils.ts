export interface HistoryItem {
    inputPath: string;
    outputPath: string | null;
    embedded: boolean;
    timestamp: number;
}

/** Whether an arbitrary parsed value has every field `HistoryItem` promises. */
export function isHistoryItem(value: unknown): value is HistoryItem {
    if (typeof value !== 'object' || value === null) return false;
    const item = value as Record<string, unknown>;
    return typeof item.inputPath === 'string'
        && (typeof item.outputPath === 'string' || item.outputPath === null)
        && typeof item.embedded === 'boolean'
        && typeof item.timestamp === 'number';
}

// localStorage is user-writable and may hold entries from an older format, so
// drop anything malformed instead of letting a missing field throw out of
// rendering — that would abort app startup with no way to recover.
export function sanitizeHistory(value: unknown): HistoryItem[] {
    return Array.isArray(value) ? value.filter(isHistoryItem) : [];
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
