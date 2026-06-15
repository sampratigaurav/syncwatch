import { describe, it, expect } from 'vitest';
import { parseSubtitles, shiftTime } from '../lib/subtitleUtils';

describe('subtitleUtils', () => {
  it('should parse SRT content correctly', () => {
    const srtContent = `1
00:00:01,000 --> 00:00:04,000
Hello World

2
00:00:05,000 --> 00:00:07,000
Line 1
Line 2`;

    const blocks = parseSubtitles(srtContent);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].id).toBe('1');
    expect(blocks[0].time).toBe('00:00:01,000 --> 00:00:04,000');
    expect(blocks[0].text).toEqual(['Hello World']);
    
    expect(blocks[1].text).toEqual(['Line 1', 'Line 2']);
  });

  it('should shift time correctly forwards', () => {
    const timeStr = '00:00:01.000 --> 00:00:04.000';
    // Shift by 1.5 seconds (1500 ms)
    const shifted = shiftTime(timeStr, 1500);
    expect(shifted).toBe('00:00:02.500 --> 00:00:05.500');
  });

  it('should shift time correctly backwards', () => {
    const timeStr = '00:00:05.500 --> 00:00:10.000';
    // Shift by -1 second (-1000 ms)
    const shifted = shiftTime(timeStr, -1000);
    expect(shifted).toBe('00:00:04.500 --> 00:00:09.000');
  });

  it('should not go below 0 when shifting backward too much', () => {
    const timeStr = '00:00:01.000 --> 00:00:04.000';
    // Shift by -5 seconds (-5000 ms)
    const shifted = shiftTime(timeStr, -5000);
    expect(shifted).toBe('00:00:00.000 --> 00:00:00.000');
  });
});
