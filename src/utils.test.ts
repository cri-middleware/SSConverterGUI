import { describe, it, expect } from 'vitest';
import { updateHistory, HistoryItem } from './utils';

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
