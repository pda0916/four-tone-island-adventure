export type Tone = 1 | 2 | 3 | 4;
export type WordCard = { word: string; zhuyin: string; tone: Tone; syllable: string; };

// 單字及注音以教育部《國語辭典簡編本》常用讀音為基準；正式上線前仍需語音人員逐檔覆核。
export const words: WordCard[] = [
  { word: '花', zhuyin: 'ㄏㄨㄚ', tone: 1, syllable: 'huā' },
  { word: '天', zhuyin: 'ㄊㄧㄢ', tone: 1, syllable: 'tiān' },
  { word: '星', zhuyin: 'ㄒㄧㄥ', tone: 1, syllable: 'xīng' },
  { word: '雲', zhuyin: 'ㄩㄣˊ', tone: 2, syllable: 'yún' },
  { word: '桃', zhuyin: 'ㄊㄠˊ', tone: 2, syllable: 'táo' },
  { word: '魚', zhuyin: 'ㄩˊ', tone: 2, syllable: 'yú' },
  { word: '雨', zhuyin: 'ㄩˇ', tone: 3, syllable: 'yǔ' },
  { word: '草', zhuyin: 'ㄘㄠˇ', tone: 3, syllable: 'cǎo' },
  { word: '鳥', zhuyin: 'ㄋㄧㄠˇ', tone: 3, syllable: 'niǎo' },
  { word: '兔', zhuyin: 'ㄊㄨˋ', tone: 4, syllable: 'tù' },
  { word: '樹', zhuyin: 'ㄕㄨˋ', tone: 4, syllable: 'shù' },
  { word: '月', zhuyin: 'ㄩㄝˋ', tone: 4, syllable: 'yuè' },
];

export const toneNames: Record<Tone, string> = { 1: '一聲', 2: '二聲', 3: '三聲', 4: '四聲' };

export function makeRound(seed: number, count = 10): WordCard[] {
  let state = seed >>> 0;
  const next = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 0x100000000; };
  const pool = [...words];
  const out: WordCard[] = [];
  while (out.length < count) {
    if (!pool.length) pool.push(...words);
    const i = Math.floor(next() * pool.length);
    out.push(pool.splice(i, 1)[0]!);
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
