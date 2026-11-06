import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readProgress, saveRound, saveStar } from './progress';
import { classifyTrace, makeRound, type Tone } from '../data/words';

describe('local learning progress', () => {
  let values: Map<string, string>;
  beforeEach(() => {
    values = new Map();
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
  });

  it('keeps each collected star immediately, including when a run is left early', () => {
    expect(saveStar().stars).toBe(1);
    expect(readProgress().stars).toBe(1);
    expect(saveStar().stars).toBe(2);
    expect(readProgress().completedRuns).toBe(0);
  });

  it('saves the completed run and first try tone data without adding the stars twice', () => {
    saveStar(); saveStar();
    const p = saveRound(2, [{ tone: 1, correct: true }, { tone: 4, correct: false }]);
    expect(p.stars).toBe(2);
    expect(p.completedRuns).toBe(1);
    expect(p.bestStars).toBe(2);
    expect(p.toneFirstTry['1']).toEqual({ correct: 1, total: 1 });
    expect(p.toneFirstTry['4']).toEqual({ correct: 0, total: 1 });
  });

  it('can finish a ten-card forest round after a gentle retry without penalizing the star count', () => {
    const cards = makeRound(42, 10);
    const firstTry: Array<{ tone: Tone; correct: boolean }> = [];
    const traceFor = (tone: Tone) => Array.from({ length: 31 }, (_, i) => {
      const t = i / 30;
      const y = tone === 1 ? 50 : tone === 2 ? 80 - 60*t : tone === 3 ? 20 + 120*Math.min(t,1-t) : 20 + 60*t;
      return { x:i*10, y };
    });
    for (const [i, card] of cards.entries()) {
      const correct = classifyTrace(traceFor(card.tone),300,200);
      if (i === 0) {
        const wrong = ((card.tone % 4) + 1) as Tone;
        expect(wrong).not.toBe(correct);
        firstTry.push({ tone: card.tone, correct: false });
      } else firstTry.push({ tone: card.tone, correct: correct === card.tone });
      expect(classifyTrace(traceFor(card.tone),300,200)).toBe(card.tone);
      saveStar();
    }
    const p = saveRound(10, firstTry);
    expect(p.stars).toBe(10);
    expect(p.completedRuns).toBe(1);
    expect(Object.values(p.toneFirstTry).reduce((sum,row)=>sum+row.total,0)).toBe(10);
    expect(Object.values(p.toneFirstTry).reduce((sum,row)=>sum+row.correct,0)).toBe(9);
  });
});
