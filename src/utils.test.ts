import { describe, it, expect } from 'vitest';
import {
    updateHistory, sanitizeHistory, isHistoryItem, defaultOutputName, historySummary, HistoryItem,
    parseThemeChoice, nextThemeChoice, resolveTheme, describeRun, describeCancelled, shortcutAction, KeyLike, resultText,
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

    // An entry without a count reports none rather than inventing one.
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

describe('describeCancelled', () => {
    it('should stay a plain Cancelled when nothing ended before the stop', () => {
        expect(describeCancelled(0, 0, 50)).toEqual({
            tone: 'warning', badge: 'Cancelled', message: 'Conversion cancelled.',
        });
        expect(describeCancelled(0, 0, 1).badge).toBe('Cancelled');
    });

    // The project in flight is in neither count, so 29 done of 50 was cut at the 30th.
    it('should say how far the run got, as the progress bar did', () => {
        expect(describeCancelled(29, 0, 50)).toEqual({
            tone: 'warning',
            badge: 'Cancelled (29 / 50)',
            message: 'Cancelled after converting 29 of 50 projects.',
        });
    });

    it('should count failures among the projects that ended', () => {
        expect(describeCancelled(27, 2, 50)).toEqual({
            tone: 'warning',
            badge: 'Cancelled (29 / 50)',
            message: 'Cancelled after 29 of 50 projects: converted 27, failed 2.',
        });
    });
});

describe('shortcutAction', () => {
    const press = (key: string, mods: Partial<KeyLike> = {}): KeyLike => ({
        key, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, repeat: false, ...mods,
    });

    it('should open a file on Cmd+O or Ctrl+O', () => {
        expect(shortcutAction(press('o', { metaKey: true }))).toBe('open-file');
        expect(shortcutAction(press('o', { ctrlKey: true }))).toBe('open-file');
    });

    // Shift makes the key report an upper-case letter.
    it('should open a folder on Shift+Cmd/Ctrl+O whatever case the key reports', () => {
        expect(shortcutAction(press('O', { metaKey: true, shiftKey: true }))).toBe('open-folder');
        expect(shortcutAction(press('o', { ctrlKey: true, shiftKey: true }))).toBe('open-folder');
    });

    it('should convert on Cmd+Enter or Ctrl+Enter', () => {
        expect(shortcutAction(press('Enter', { metaKey: true }))).toBe('convert');
        expect(shortcutAction(press('Enter', { ctrlKey: true }))).toBe('convert');
    });

    it('should ignore the same keys without Cmd or Ctrl', () => {
        expect(shortcutAction(press('o'))).toBeNull();
        expect(shortcutAction(press('Enter'))).toBeNull();
        expect(shortcutAction(press('O', { shiftKey: true }))).toBeNull();
    });

    it('should ignore other keys and combinations that mean something else', () => {
        expect(shortcutAction(press('p', { metaKey: true }))).toBeNull();
        expect(shortcutAction(press('o', { metaKey: true, altKey: true }))).toBeNull();
        expect(shortcutAction(press('Enter', { metaKey: true, shiftKey: true }))).toBeNull();
    });

    it('should not repeat while a key is held', () => {
        expect(shortcutAction(press('o', { metaKey: true, repeat: true }))).toBeNull();
        expect(shortcutAction(press('Enter', { ctrlKey: true, repeat: true }))).toBeNull();
    });
});

describe('resultText', () => {
    it('lists each failure as the CLI does, then the versions', () => {
        const text = resultText({
            headline: 'Converted 1, failed 1.',
            output: 'Output: next to each .sspj under /work',
            issues: [
                { label: '/work/b/b.sspj', detail: 'parse error', tone: 'error' },
                { detail: 'Stopped scanning after 10000 entries.', tone: 'warning' },
            ],
        }, 'App Version: 1.0.0\nConverter Version: 7.0.0 (ssab v1, ssqb v1)');
        expect(text).toBe([
            'Converted 1, failed 1.',
            'Output: next to each .sspj under /work',
            'Error: /work/b/b.sspj: parse error',
            'Warning: Stopped scanning after 10000 entries.',
            'App Version: 1.0.0',
            'Converter Version: 7.0.0 (ssab v1, ssqb v1)',
        ].join('\n'));
    });

    it('leaves out what is not there', () => {
        const text = resultText({ headline: 'Conversion failed.', output: null, issues: [{ detail: 'no such file', tone: 'error' }] }, null);
        expect(text).toBe('Conversion failed.\nError: no such file');
    });
});
