export type Tone = 1 | 2 | 3 | 4;
export type WordCard = { word: string; zhuyin: string; tone: Tone; syllable: string; audio: string; };

// 單字及注音以教育部《國語辭典簡編本》常用讀音為基準；正式上線前仍需語音人員逐檔覆核。
export const words: WordCard[] = [
  // 隨專案附上的九個合成示範音可離線播放，不依賴裝置安裝中文語音。
  { word: '媽', zhuyin: 'ㄇㄚ', tone: 1, syllable: 'mā', audio: 'mama.mp3' },
  { word: '麻', zhuyin: 'ㄇㄚˊ', tone: 2, syllable: 'má', audio: 'ma2.mp3' },
  { word: '馬', zhuyin: 'ㄇㄚˇ', tone: 3, syllable: 'mǎ', audio: 'ma3.mp3' },
  { word: '罵', zhuyin: 'ㄇㄚˋ', tone: 4, syllable: 'mà', audio: 'ma4.mp3' },
  { word: '爸', zhuyin: 'ㄅㄚˋ', tone: 4, syllable: 'bà', audio: 'ba4.mp3' },
  { word: '師', zhuyin: 'ㄕ', tone: 1, syllable: 'shī', audio: 'shi1.mp3' },
  { word: '事', zhuyin: 'ㄕˋ', tone: 4, syllable: 'shì', audio: 'shi4.mp3' },
  { word: '答', zhuyin: 'ㄉㄚˊ', tone: 2, syllable: 'dá', audio: 'da2.mp3' },
  { word: '大', zhuyin: 'ㄉㄚˋ', tone: 4, syllable: 'dà', audio: 'da4.mp3' },
];

export const toneNames: Record<Tone, string> = { 1: '一聲', 2: '二聲', 3: '三聲', 4: '四聲' };

export function makeRound(seed: number, count = 10): WordCard[] {
  let state = seed >>> 0;
  const next = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 0x100000000; };
  const shuffled = <T>(input: T[]) => {
    const a = [...input];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
    return a;
  };
  const groups = new Map<Tone, WordCard[]>([1, 2, 3, 4].map(t => [t as Tone, shuffled(words.filter(w => w.tone === t))]));
  const out: WordCard[] = [];
  while (out.length < count) for (const tone of shuffled([1, 2, 3, 4] as Tone[])) {
    if (out.length >= count) break;
    const group = groups.get(tone)!;
    if (!group.length) group.push(...shuffled(words.filter(w => w.tone === tone)));
    out.push(group.shift()!);
  }
  return out;
}

export function classifyTrace(points: Array<{ x: number; y: number }>, width: number, height: number): Tone | null {
  if (points.length < 5) return null;
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  if (maxX - minX < width * 0.32) return null;
  const normalized = points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 12)) === 0);
  const ys = normalized.map(p => p.y);
  const span = height;
  const first = ys.slice(0, Math.floor(ys.length * 0.25));
  const last = ys.slice(Math.floor(ys.length * 0.75));
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  if (max - min < span * 0.17) return 1;
  const peakAt = ys.indexOf(max);
  const isDipRise = peakAt > ys.length * 0.20 && peakAt < ys.length * 0.80 &&
    max - Math.max(...first) > span * 0.13 && max - Math.max(...last) > span * 0.13 &&
    Math.abs(ys[ys.length - 1]! - ys[0]!) < span * 0.25;
  if (isDipRise) return 3;
  const dy = ys[ys.length - 1]! - ys[0]!;
  if (dy < -span * 0.19) return 2;
  if (dy > span * 0.19) return 4;
  return null;
}
