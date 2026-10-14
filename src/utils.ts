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

export type ThemeChoice = 'auto' | 'light' | 'dark';

/**
 * The stored theme, or `auto` (follow the system) when nothing was chosen.
 * Anything else in storage counts as nothing chosen rather than throwing.
 */
export function parseThemeChoice(stored: string | null): ThemeChoice {
    return stored === 'light' || stored === 'dark' ? stored : 'auto';
}

/** The order the theme button steps through; `auto` is the way back to the system. */
export function nextThemeChoice(choice: ThemeChoice): ThemeChoice {
    switch (choice) {
        case 'auto': return 'light';
        case 'light': return 'dark';
        case 'dark': return 'auto';
    }
}

export function resolveTheme(choice: ThemeChoice, systemPrefersLight: boolean): 'light' | 'dark' {
    if (choice === 'auto') return systemPrefersLight ? 'light' : 'dark';
    return choice;
}

export type RunTone = 'success' | 'warning' | 'error';

export interface RunOutcome {
    tone: RunTone;
    /** The status beside the Convert button. */
    badge: string;
    /** One line for the log and the headline of the result dialog. */
    message: string;
}

/**
 * How a finished run reads, from its counts. `incomplete` is a directory scan
 * that stopped at its budget: everything found converted, but the listing was
 * not the whole folder, so it is not reported as a plain success.
 */
export function describeRun(succeeded: number, failed: number, incomplete: boolean): RunOutcome {
    const plural = (n: number) => n === 1 ? '' : 's';
    if (failed > 0 && succeeded === 0) {
        return { tone: 'error', badge: 'Failed', message: `Conversion failed for ${failed} project${plural(failed)}.` };
    }
    if (failed > 0) {
        return { tone: 'warning', badge: `${succeeded} ok / ${failed} failed`, message: `Converted ${succeeded}, failed ${failed}.` };
    }
    if (incomplete) {
        return {
            tone: 'warning',
            badge: `${succeeded} ok (incomplete)`,
            message: `Converted ${succeeded} project${plural(succeeded)}, but the scan was incomplete.`,
        };
    }
    return { tone: 'success', badge: 'Success', message: `Successfully converted ${succeeded} project${plural(succeeded)}.` };
}

/**
 * How a run the user stopped reads. `succeeded` and `failed` count the projects
 * that ended before the stop, so the one in flight is in neither; the badge
 * gives that against `total` in the progress bar's `done / total`. A stop
 * before any project ended is the plain `Cancelled` it always was.
 */
export function describeCancelled(succeeded: number, failed: number, total: number): RunOutcome {
    const done = succeeded + failed;
    if (done === 0) {
        return { tone: 'warning', badge: 'Cancelled', message: 'Conversion cancelled.' };
    }
    const of = `${done} of ${total} project${total === 1 ? '' : 's'}`;
    return {
        tone: 'warning',
        badge: `Cancelled (${done} / ${total})`,
        message: failed > 0
            ? `Cancelled after ${of}: converted ${succeeded}, failed ${failed}.`
            : `Cancelled after converting ${of}.`,
    };
}

export type ShortcutAction = 'open-file' | 'open-folder' | 'convert';

/** The parts of a `KeyboardEvent` that decide a shortcut. */
export interface KeyLike {
    key: string;
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    repeat: boolean;
}

/**
 * What a key press asks for: Cmd/Ctrl+O chooses a `.sspj`, with Shift a folder,
 * and Cmd/Ctrl+Enter converts. Either modifier works on either platform. A
 * held key (`repeat`) asks once, not once per repeat, so a held Cmd+O cannot
 * stack file dialogs; Alt is left alone because it makes other characters.
 */
export function shortcutAction(e: KeyLike): ShortcutAction | null {
    if (e.repeat || e.altKey || !(e.metaKey || e.ctrlKey)) return null;
    if (e.key === 'Enter') return e.shiftKey ? null : 'convert';
    if (e.key.toLowerCase() === 'o') return e.shiftKey ? 'open-folder' : 'open-file';
    return null;
}
