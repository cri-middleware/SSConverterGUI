import { describe, it, expect } from 'vitest';
import { updateHistory, sanitizeHistory, isHistoryItem, defaultOutputName, HistoryItem } from './utils';

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
