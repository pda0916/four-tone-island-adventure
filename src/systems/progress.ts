export type Progress = { stars: number; completedRuns: number; bestStars: number; toneFirstTry: Record<string, { correct: number; total: number }>; };
const key = 'tone-island-p1-progress-v1';
const empty = (): Progress => ({ stars: 0, completedRuns: 0, bestStars: 0, toneFirstTry: { '1': { correct: 0, total: 0 }, '2': { correct: 0, total: 0 }, '3': { correct: 0, total: 0 }, '4': { correct: 0, total: 0 } } });

export function readProgress(): Progress {
  try { const stored = JSON.parse(localStorage.getItem(key) ?? 'null') as Progress | null; return stored && typeof stored.stars === 'number' ? { ...empty(), ...stored } : empty(); }
  catch { return empty(); }
}

export function saveStar() {
  const p = readProgress(); p.stars += 1; localStorage.setItem(key, JSON.stringify(p)); return p;
}

export function saveRound(stars: number, firstTry: Array<{ tone: number; correct: boolean }>) {
  const p = readProgress(); p.completedRuns += 1; p.bestStars = Math.max(p.bestStars, stars);
  for (const item of firstTry) { const row = p.toneFirstTry[String(item.tone)] ??= { correct: 0, total: 0 }; row.total += 1; if (item.correct) row.correct += 1; }
  localStorage.setItem(key, JSON.stringify(p)); return p;
}
