import { describe, it, expect } from 'vitest';
import {
    updateHistory, sanitizeHistory, isHistoryItem, defaultOutputName, historySummary, HistoryItem,
    parseThemeChoice, nextThemeChoice, resolveTheme, describeRun,
} from './utils';

describe('updateHistory', () => {
    it('should add a new item to the beginning of the history', () => {
        const history: HistoryItem[] = [];
        const newItem: HistoryItem = { inputPath: 'test.sspj', outputPath: null, embedded: false, timestamp: 123 };
        
        const result = updateHistory(history, newItem);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(newItem);
    });

    it('should remove existing item with same inputPath and add to beginning', () => {
        const history: HistoryItem[] = [
            { inputPath: 'test1.sspj', outputPath: null, embedded: false, timestamp: 100 },
            { inputPath: 'test2.sspj', outputPath: null, embedded: false, timestamp: 90 }
        ];
        const newItem: HistoryItem = { inputPath: 'test2.sspj', outputPath: 'out', embedded: true, timestamp: 120 };
        
        const result = updateHistory(history, newItem);
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(newItem);
        expect(result[1].inputPath).toBe('test1.sspj');
    });

    it('should respect maxItems limit', () => {
        const history: HistoryItem[] = [
            { inputPath: 'test1.sspj', outputPath: null, embedded: false, timestamp: 100 },
            { inputPath: 'test2.sspj', outputPath: null, embedded: false, timestamp: 90 }
        ];
        const newItem: HistoryItem = { inputPath: 'test3.sspj', outputPath: null, embedded: false, timestamp: 110 };
        
        const result = updateHistory(history, newItem, 2);
        expect(result).toHaveLength(2);
        expect(result[0].inputPath).toBe('test3.sspj');
        expect(result[1].inputPath).toBe('test1.sspj');
    });
});

describe('isHistoryItem', () => {
    const valid: HistoryItem = { inputPath: 'a.sspj', outputPath: null, embedded: false, timestamp: 1 };

    it('should accept a well-formed item', () => {
        expect(isHistoryItem(valid)).toBe(true);
        expect(isHistoryItem({ ...valid, outputPath: '/out' })).toBe(true);
    });

    it('should reject non-objects', () => {
        expect(isHistoryItem(null)).toBe(false);
        expect(isHistoryItem(undefined)).toBe(false);
        expect(isHistoryItem('a.sspj')).toBe(false);
        expect(isHistoryItem(42)).toBe(false);
    });

    it('should reject items with a missing or mistyped field', () => {
        expect(isHistoryItem({ timestamp: 1 })).toBe(false);
        expect(isHistoryItem({ ...valid, inputPath: undefined })).toBe(false);
        expect(isHistoryItem({ ...valid, outputPath: 42 })).toBe(false);
        expect(isHistoryItem({ ...valid, embedded: 'yes' })).toBe(false);
        expect(isHistoryItem({ ...valid, timestamp: '1' })).toBe(false);
    });
});

describe('sanitizeHistory', () => {
    const valid: HistoryItem = { inputPath: 'a.sspj', outputPath: null, embedded: false, timestamp: 1 };

    it('should drop malformed entries but keep the valid ones', () => {
        expect(sanitizeHistory([null, valid, { timestamp: 1 }])).toEqual([valid]);
    });

    it('should return an empty array for non-array input', () => {
        expect(sanitizeHistory(null)).toEqual([]);
        expect(sanitizeHistory({ inputPath: 'a.sspj' })).toEqual([]);
        expect(sanitizeHistory('[]')).toEqual([]);
    });
});

describe('defaultOutputName', () => {
    it('should use the project stem unchanged for a plain conversion', () => {
        expect(defaultOutputName('character', false)).toBe('character');
    });

    // The suffix is what keeps an embedded build from overwriting a plain one.
    it('should append _emb when assets are embedded', () => {
        expect(defaultOutputName('character', true)).toBe('character_emb');
    });

    it('should not disturb a stem that already contains dots or spaces', () => {
        expect(defaultOutputName('my project.v2', true)).toBe('my project.v2_emb');
    });
});

describe('historySummary', () => {
    const base: HistoryItem = { inputPath: 'a.sspj', outputPath: null, embedded: false, timestamp: 1 };

    it('should report only the count for a run with default settings', () => {
        expect(historySummary({ ...base, count: 1 })).toBe('1 project');
    });

    it('should pluralise a batch and name what was unusual about it', () => {
        expect(historySummary({ ...base, count: 12, outputPath: '/out', embedded: true }))
            .toBe('12 projects · embedded · → /out');
    });

    // Entries written before a run was one entry recorded a single `.sspj`
    // each, so they have no count to report and must not invent one.
    it('should omit the count for an entry that has none', () => {
        expect(historySummary(base)).toBe('');
    });
});

describe('parseThemeChoice', () => {
    it('should keep a stored light or dark choice', () => {
        expect(parseThemeChoice('light')).toBe('light');
        expect(parseThemeChoice('dark')).toBe('dark');
    });

    // Nothing stored is the state of everyone who never touched the button.
    it('should follow the system when nothing valid is stored', () => {
        expect(parseThemeChoice(null)).toBe('auto');
        expect(parseThemeChoice('auto')).toBe('auto');
        expect(parseThemeChoice('sepia')).toBe('auto');
    });
});

describe('nextThemeChoice', () => {
    it('should cycle through all three and come back to the system', () => {
        expect(nextThemeChoice('auto')).toBe('light');
        expect(nextThemeChoice('light')).toBe('dark');
        expect(nextThemeChoice('dark')).toBe('auto');
    });
});

describe('resolveTheme', () => {
    it('should take the system theme only when auto', () => {
        expect(resolveTheme('auto', true)).toBe('light');
        expect(resolveTheme('auto', false)).toBe('dark');
    });

    it('should ignore the system theme once a theme is chosen', () => {
        expect(resolveTheme('dark', true)).toBe('dark');
        expect(resolveTheme('light', false)).toBe('light');
    });
});

describe('describeRun', () => {
    it('should report a clean run as a success and pluralise the count', () => {
        expect(describeRun(1, 0, false)).toEqual({
            tone: 'success', badge: 'Success', message: 'Successfully converted 1 project.',
        });
        expect(describeRun(3, 0, false).message).toBe('Successfully converted 3 projects.');
    });

    it('should report a run where everything failed as an error', () => {
        expect(describeRun(0, 1, false)).toEqual({
            tone: 'error', badge: 'Failed', message: 'Conversion failed for 1 project.',
        });
        expect(describeRun(0, 4, true).message).toBe('Conversion failed for 4 projects.');
    });

    it('should report a mixed run with both counts', () => {
        expect(describeRun(2, 1, false)).toEqual({
            tone: 'warning', badge: '2 ok / 1 failed', message: 'Converted 2, failed 1.',
        });
    });

    // A truncated scan is not a plain success: the folder was not fully read.
    it('should not call an incomplete scan a success', () => {
        expect(describeRun(12, 0, true)).toEqual({
            tone: 'warning',
            badge: '12 ok (incomplete)',
            message: 'Converted 12 projects, but the scan was incomplete.',
        });
    });

    it('should let failures take precedence over an incomplete scan', () => {
        expect(describeRun(2, 1, true).badge).toBe('2 ok / 1 failed');
    });
});
