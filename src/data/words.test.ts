import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { classifyTrace, makeRound, words } from './words';

const line = (fn: (t: number) => number) => Array.from({ length: 31 }, (_, i) => ({ x: i * 10, y: fn(i / 30) }));

describe('tone trace and question data', () => {
  it('recognizes the four contour gestures and ignores short taps', () => {
    expect(classifyTrace(line(() => 50), 300, 100)).toBe(1);
    expect(classifyTrace(line(t => 80 - 60 * t), 300, 100)).toBe(2);
    expect(classifyTrace(line(t => 20 + 120 * (t < .5 ? t : 1 - t)), 300, 200)).toBe(3);
    expect(classifyTrace(line(t => 20 + 60 * t), 300, 100)).toBe(4);
    expect(classifyTrace([{ x: 1, y: 1 }, { x: 2, y: 2 }], 300, 100)).toBeNull();
  });
  it('creates seeded, varied ten word rounds with valid tone labels', () => {
    const round = makeRound(9);
    expect(round).toHaveLength(10);
    expect(makeRound(9)).toEqual(makeRound(9));
    expect(makeRound(10)).not.toEqual(makeRound(9));
    expect(new Set(words.map(w => w.tone))).toEqual(new Set([1, 2, 3, 4]));
    const perTone = [1,2,3,4].map(tone => round.filter(w => w.tone === tone).length);
    expect(Math.max(...perTone) - Math.min(...perTone)).toBeLessThanOrEqual(1);
  });

  it('ships a non-empty audio sample for every word, so listening does not depend on device speech support', () => {
    for (const word of words) {
      const path = fileURLToPath(new URL(`../../public/audio/words/${word.audio}`, import.meta.url));
      expect(existsSync(path), word.word).toBe(true);
      expect(statSync(path).size, word.word).toBeGreaterThan(1000);
    }
  });
});
