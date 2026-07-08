export interface HistoryItem {
    inputPath: string;
    outputPath: string | null;
    embedded: boolean;
    timestamp: number;
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
