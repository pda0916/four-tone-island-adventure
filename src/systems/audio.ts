export class AudioManager {
  private ctx: AudioContext | null = null;
  private currentClip: HTMLAudioElement | null = null;
  private readonly storageKey = 'tone-island-audio-v1';
  enabled = localStorage.getItem(this.storageKey) !== 'off';

  unlock() {
    const Ctx = window.AudioContext;
    if (Ctx && !this.ctx) this.ctx = new Ctx();
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem(this.storageKey, this.enabled ? 'on' : 'off');
    if (!this.enabled) this.stop();
    return this.enabled;
  }

  stop() {
    if (this.currentClip) { this.currentClip.pause(); this.currentClip.currentTime = 0; this.currentClip = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  speak(text: string, rate = 0.78): boolean {
    if (!this.enabled) return false;
    if (!('speechSynthesis' in window)) return false;
    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.toLowerCase() === 'zh-tw') ?? voices.find(v => v.lang.toLowerCase().startsWith('zh'));
    if (!voice) return false;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voice.lang; utterance.voice = voice; utterance.rate = rate; utterance.pitch = 1.02;
    speechSynthesis.speak(utterance);
    return true;
  }

  async sayWord(text: string, file: string): Promise<'bundled' | 'device' | 'muted' | null> {
    if (!this.enabled) return 'muted';
    const clip = new Audio(`${import.meta.env.BASE_URL}audio/words/${encodeURIComponent(file)}`);
    clip.preload = 'auto'; clip.volume = 0.9;
    try {
      this.stop(); this.currentClip = clip;
      await clip.play();
      clip.onended = () => { if (this.currentClip === clip) this.currentClip = null; };
      return 'bundled';
    } catch {
      if (this.currentClip === clip) this.currentClip = null;
      return this.speak(text) ? 'device' : null;
    }
  }

  tone(frequency: number, duration = 0.12, wave: OscillatorType = 'sine') {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = wave; osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, this.ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    osc.connect(gain).connect(this.ctx.destination); osc.start(); osc.stop(this.ctx.currentTime + duration);
  }

  correct() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.14, 'triangle'), i * 90)); }
  gentle() { this.tone(392, 0.18, 'sine'); }
}

export const audio = new AudioManager();
