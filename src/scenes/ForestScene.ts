import Phaser from 'phaser';
import { classifyTrace, makeRound, toneNames, type Tone, type WordCard } from '../data/words';
import { audio } from '../systems/audio';
import { readProgress, saveRound, saveStar, type Progress } from '../systems/progress';

type Mode = '幼幼' | '標準' | '挑戰';
type Point = { x: number; y: number };

const palette = { ink: '#29415f', leaf: 0x66b889, leaf2: 0x93d27c, sky: 0xc8eff7, pink: 0xffb5ae, cream: 0xfff6df, gold: 0xffd266 };

export class ForestScene extends Phaser.Scene {
  private width = 960;
  private height = 640;
  private phase: 'title' | 'play' | 'result' = 'title';
  private mode: Mode = '幼幼';
  private round: WordCard[] = [];
  private index = 0;
  private stars = 0;
  private firstTry: Array<{ tone: Tone; correct: boolean }> = [];
  private triedThisWord = false;
  private progress: Progress = readProgress();
  private ui: Phaser.GameObjects.GameObject[] = [];
  private scenery!: Phaser.GameObjects.Graphics;
  private character!: Phaser.GameObjects.Container;
  private drawLayer!: Phaser.GameObjects.Graphics;
  private guideLayer!: Phaser.GameObjects.Graphics;
  private points: Point[] = [];
  private drawing = false;
  private message!: Phaser.GameObjects.Text;
  private wordTitle!: Phaser.GameObjects.Text;
  private zhuyinText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private soundWarning!: Phaser.GameObjects.Text;
  private audioButton!: Phaser.GameObjects.Text;
  private parentPanel = false;

  constructor() { super('ForestScene'); }

  create() {
    this.scenery = this.add.graphics();
    this.drawLayer = this.add.graphics().setDepth(8);
    this.guideLayer = this.add.graphics().setDepth(7);
    this.makeCharacter();
    this.scale.on(Phaser.Scale.Events.RESIZE, (size: Phaser.Structs.Size) => {
      this.width = size.width; this.height = size.height; this.layout();
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.beginDraw(pointer));
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.continueDraw(pointer));
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.finishDraw(pointer));
    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => this.finishDraw(pointer));
    this.input.keyboard?.on('keydown-SPACE', () => { if (this.phase === 'play') this.jump(); });
    this.input.keyboard?.on('keydown-UP', () => { if (this.phase === 'play') this.jump(); });
    this.layout();
  }

  private clearUI() { for (const item of this.ui) item.destroy(); this.ui = []; }
  private keep<T extends Phaser.GameObjects.GameObject>(object: T): T { this.ui.push(object); return object; }

  private text(x: number, y: number, label: string, size: number, color = palette.ink, bold = true, align: 'left' | 'center' = 'center') {
    const t = this.add.text(x, y, label, { fontFamily: 'Noto Sans TC, Microsoft JhengHei, sans-serif', fontSize: `${size}px`, fontStyle: bold ? 'bold' : 'normal', color, align, lineSpacing: 5, wordWrap: { width: Math.max(180, this.width - 36), useAdvancedWrap: true } }).setOrigin(0.5);
    return this.keep(t);
  }

  private button(x: number, y: number, label: string, action: () => void, width = 245, fontSize = 25) {
    const g = this.add.graphics().setDepth(20);
    g.fillStyle(0x000000, 0.12).fillRoundedRect(x - width / 2, y - 25, width, 66, 24);
    g.fillStyle(0xfffdf2, 1).lineStyle(3, 0xffffff, 0.9).fillRoundedRect(x - width / 2, y - 31, width, 62, 22);
    const hit = this.add.zone(x, y, width, 76).setInteractive({ useHandCursor: true }).setDepth(21);
    const labelText = this.add.text(x, y, label, { fontFamily: 'Noto Sans TC, Microsoft JhengHei, sans-serif', fontSize: `${fontSize}px`, fontStyle: 'bold', color: palette.ink }).setOrigin(0.5).setDepth(22);
    hit.on('pointerdown', () => { audio.unlock(); audio.tone(500, 0.05); action(); });
    hit.on('pointerover', () => labelText.setScale(1.05)); hit.on('pointerout', () => labelText.setScale(1));
    this.keep(g); this.keep(hit); this.keep(labelText);
  }

  private layout() {
    this.width = this.scale.width; this.height = this.scale.height;
    this.drawBackground();
    this.character?.setPosition(this.width * 0.5, this.height * 0.67);
    if (this.phase === 'title') this.renderTitle();
    else if (this.phase === 'play') this.renderQuestion();
    else this.renderResult();
  }

  private drawBackground() {
    const w = this.width, h = this.height;
    this.scenery.clear();
    this.scenery.fillGradientStyle(palette.sky, palette.sky, 0xe1f8ef, 0xe1f8ef, 1).fillRect(0, 0, w, h);
    // Distant rounded hills and layered forest canopy.
    this.scenery.fillStyle(0xb5e4cc, 1);
    this.scenery.fillEllipse(w * .13, h * .53, w * .62, h * .38).fillEllipse(w * .79, h * .54, w * .7, h * .42);
    this.scenery.fillStyle(0x78c496, 1);
    this.scenery.fillEllipse(w * .05, h * .7, w * .62, h * .35).fillEllipse(w * .97, h * .71, w * .72, h * .38);
    this.scenery.fillStyle(0x73bb78, 1).fillRect(0, h * .75, w, h * .25);
    this.scenery.fillStyle(0xa5d97c, 1).fillEllipse(w * .5, h * .78, w * 1.3, h * .24);
    // soft clouds
    this.scenery.fillStyle(0xffffff, .78);
    for (const [x, y, s] of [[.17,.14,1],[.76,.17,.8],[.49,.09,.55]] as const) {
      this.scenery.fillEllipse(w*x, h*y, 82*s, 25*s).fillCircle(w*x-21*s, h*y-6*s, 15*s).fillCircle(w*x+4*s, h*y-12*s, 20*s).fillCircle(w*x+27*s, h*y-5*s, 14*s);
    }
    // flower patches
    for (let i = 0; i < 13; i++) {
      const x = (i * 137 + 39) % Math.max(1, w), y = h * (.78 + (i % 3) * .055);
      this.scenery.fillStyle(i % 2 ? 0xffdd77 : 0xffaeb4, 1).fillCircle(x, y, 4).fillCircle(x - 4, y + 2, 3).fillCircle(x + 4, y + 2, 3);
    }
  }

  private makeCharacter() {
    const art = this.add.graphics();
    // Original, code-drawn little dragon: no borrowed image or character assets.
    art.fillStyle(0x256a68, .18).fillEllipse(0, 61, 89, 20);
    art.fillStyle(0xffb47c, 1).fillTriangle(-32,-10,-61,-40,-51,4).fillTriangle(24,-20,52,-55,49,-5);
    art.fillStyle(0x9cdb93, 1).fillRoundedRect(-40,-48,80,99,31);
    art.fillStyle(0x83c77f, 1).fillTriangle(-28,-43,-20,-69,-7,-43).fillTriangle(1,-45,13,-70,25,-40);
    art.fillStyle(0xffe6bd, 1).fillEllipse(1, 8, 48, 34);
    art.fillStyle(0xffffff, 1).fillEllipse(-17,-18,19,24).fillEllipse(15,-18,19,24);
    art.fillStyle(0x263951, 1).fillCircle(-15,-16,5).fillCircle(17,-16,5);
    art.fillStyle(0x436856, 1).fillEllipse(2,-3,11,7);
    art.lineStyle(2, 0x426a59, 1).beginPath().arc(0,5,11,.1,Math.PI-.1,false).strokePath();
    art.fillStyle(0xffa9a0, .75).fillCircle(-29,2,6).fillCircle(29,2,6);
    this.character = this.add.container(this.width / 2, this.height * .67, [art]).setDepth(5);
    this.tweens.add({ targets: this.character, y: this.height * .67 - 9, duration: 780, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private renderTitle() {
    this.clearUI(); this.drawLayer.clear(); this.guideLayer.clear();
    const center = this.width / 2, narrow = this.width < 640;
    this.text(center, this.height * .12, '聲調精靈冒險島', narrow ? 29 : 42, '#23425d');
    this.text(center, this.height * .185, 'P1｜聽力森林', narrow ? 17 : 22, '#36735d');
    this.character?.setPosition(center, this.height * .39);
    const modeHelp = this.mode === '幼幼' ? '幼幼模式會顯示淡金色聲調路線。' : this.mode === '標準' ? '標準模式可以先自己畫，需要時再看示範。' : '挑戰模式不顯示示範線，畫錯時小龍會提醒你。';
    this.text(center, this.height * .67, `小龍聽見聲調精靈的聲音了！\n${modeHelp}`, narrow ? 16 : 20, '#31536c', false);
    this.text(center, this.height * .755, `已收集 ${this.progress.stars} 顆星星　｜　完成 ${this.progress.completedRuns} 趟`, narrow ? 14 : 17, '#396454', false);
    const modeY = this.height * .815, labels: Mode[] = ['幼幼', '標準', '挑戰'];
    const gap = Math.min(112, this.width * .29);
    labels.forEach((mode, i) => {
      const x = center + (i - 1) * gap;
      this.button(x, modeY, `${mode}${this.mode === mode ? ' ✓' : ''}`, () => { this.mode = mode; this.layout(); }, Math.min(100, this.width * .29), narrow ? 13 : 16);
    });
    this.button(center, this.height * .91, '🐉 開始冒險', () => this.start(), Math.min(narrow ? 280 : 350, this.width - 40), narrow ? 22 : 27);
    this.text(this.width - 37, 28, this.parentPanel ? '✕' : '🔒', 22).setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.parentPanel = !this.parentPanel; this.layout(); });
    this.audioButton = this.text(52, 29, audio.enabled ? '🔊' : '🔇', 23).setInteractive({ useHandCursor: true });
    this.audioButton.on('pointerdown', () => { audio.toggle(); this.layout(); });
    if (this.parentPanel) this.renderParentPanel();
  }

  private renderParentPanel() {
    const cx = this.width / 2, cy = this.height / 2;
    const panel = this.add.graphics().setDepth(30); panel.fillStyle(0x264364, .3).fillRect(0,0,this.width,this.height).fillStyle(0xfffdf2,1).fillRoundedRect(cx-Math.min(350,this.width*.44),cy-150,Math.min(700,this.width*.88),300,26);
    const p = readProgress();
    const text = this.add.text(cx, cy-25, `家長小報告\n累積星星：${p.stars}　完成旅程：${p.completedRuns}\n一聲 ${p.toneFirstTry['1']?.correct ?? 0}/${p.toneFirstTry['1']?.total ?? 0}　　二聲 ${p.toneFirstTry['2']?.correct ?? 0}/${p.toneFirstTry['2']?.total ?? 0}\n三聲 ${p.toneFirstTry['3']?.correct ?? 0}/${p.toneFirstTry['3']?.total ?? 0}　　四聲 ${p.toneFirstTry['4']?.correct ?? 0}/${p.toneFirstTry['4']?.total ?? 0}`, { fontFamily: 'Noto Sans TC, sans-serif', fontSize: this.width < 600 ? '16px' : '22px', color: palette.ink, align: 'center', lineSpacing: 12 }).setOrigin(.5).setDepth(31);
    this.ui.push(panel,text);
  }

  private start() {
    audio.unlock(); this.phase = 'play'; this.index = 0; this.stars = 0; this.firstTry = []; this.triedThisWord = false;
    this.round = makeRound(Date.now(), 10);
    this.soundWarning = this.add.text(0,0,'題目附有單字示範音，點喇叭可以重聽。', { fontFamily:'Noto Sans TC, sans-serif', fontSize:'13px', color:'#385b73', backgroundColor:'#ffffffaa', padding:{ x:8,y:5 } }).setDepth(25);
    this.layout();
    if (audio.speak('聽聽這個字的聲音，再從左邊畫出它的聲調。')) {
      this.time.delayedCall(2400, () => this.sayCurrent());
    } else this.sayCurrent();
  }

  private renderQuestion() {
    this.clearUI(); this.drawLayer.clear(); this.guideLayer.clear();
    const cx = this.width / 2, narrow = this.width < 640, top = narrow ? 52 : 68;
    this.character?.setPosition(this.width * .16, this.height * .7);
    this.text(cx, 30, '聽力森林', narrow ? 17 : 21, '#2e795a');
    this.progressText = this.text(cx, top, `第 ${this.index + 1} / 10 題　　⭐ ${this.stars}`, narrow ? 16 : 20, '#29415f');
    this.button(62, 30, '↩', () => { this.phase = 'title'; this.layout(); }, 78, 20);
    this.button(this.width - 62, 30, '🔊', () => { audio.toggle(); this.layout(); }, 78, 20);
    this.wordTitle = this.text(cx, this.height * .24, '聽聽看這個字的聲音', narrow ? 22 : 29, '#29415f');
    this.zhuyinText = this.text(cx, this.height * .30, '🎧', narrow ? 31 : 40, '#9b5c9a');
    // Single magical path area. The child draws freely; there are no tone answer buttons.
    const area = this.add.graphics().setDepth(4);
    const left = this.width * .30, right = this.width * .91, y = this.height * .51, h = Math.min(this.height * .24, 150);
    area.fillStyle(0xffffff, .32).lineStyle(3, 0xffffff, .72).fillRoundedRect(left, y-h/2, right-left, h, 36).strokeRoundedRect(left,y-h/2,right-left,h,36);
    this.keep(area);
    this.message = this.text(cx + this.width * .11, this.height * .75, '聽完聲音，從左往右畫出它的聲調', narrow ? 15 : 19, '#31536c', false);
    this.text(cx + this.width * .11, this.height * .82, this.mode === '幼幼' ? '金色路線會陪你一起畫' : '線條畫長一點，讓小龍看清楚喔', narrow ? 13 : 16, '#56718a', false);
    this.soundWarning.setPosition(10, this.height - 30);
    this.soundWarning.setFontSize(narrow ? 11 : 13);
    this.renderJumpControl(); this.renderHintControl(); this.renderReplayControl();
    if (this.mode === '幼幼') this.drawGuide(this.round[this.index]!);
  }

  private renderReplayControl() {
    this.button(this.width * .84, this.height * .92, '🔊 重聽', () => this.sayCurrent(), Math.min(150,this.width*.33), this.width < 640 ? 16 : 18);
  }
  private renderJumpControl() {
    this.button(this.width * .16, this.height * .92, '⬆ 跳跳', () => this.jump(), Math.min(150,this.width*.33), this.width < 640 ? 16 : 18);
  }
  private renderHintControl() {
    if (this.mode === '標準') this.button(this.width * .40, this.height * .92, '✨ 示範', () => this.drawGuide(this.round[this.index]!), Math.min(150,this.width*.33), this.width < 640 ? 16 : 18);
  }

  private sayCurrent() {
    if (this.phase !== 'play') return;
    const card = this.round[this.index]!;
    const questionIndex = this.index;
    void audio.sayWord(card.word, card.audio).then(result => {
      if (this.phase !== 'play' || this.index !== questionIndex) return;
      if (result === 'bundled') this.soundWarning?.setText('正在播放本題附上的單字示範音。');
      else if (result === 'device') this.soundWarning?.setText('正在使用裝置提供的中文語音。');
      else if (result === null) this.soundWarning?.setText('聲音暫時無法播放，請再點一次重聽。');
    });
  }

  private pathFor(tone: Tone): Point[] {
    const left = this.width * .33, right = this.width * .87, base = this.height * .51, amp = Math.min(this.height * .16, 95);
    return Array.from({ length: 31 }, (_, i) => {
      const t = i / 30;
      let dy = 0;
      if (tone === 2) dy = amp * (1 - 2 * t);
      if (tone === 3) dy = amp * (t < .5 ? -0.45 + t * 1.8 : 0.45 - (t-.5) * 1.8);
      if (tone === 4) dy = -amp + 2 * amp * t;
      return { x: left + (right-left)*t, y: base + dy };
    });
  }

  private drawGuide(card: WordCard) {
    this.guideLayer.clear().lineStyle(9, 0xffdc72, .78).beginPath();
    const pts = this.pathFor(card.tone); this.guideLayer.moveTo(pts[0]!.x,pts[0]!.y); pts.slice(1).forEach(p=>this.guideLayer.lineTo(p.x,p.y)); this.guideLayer.strokePath();
    this.guideLayer.fillStyle(0xffffff,1).fillCircle(pts[0]!.x,pts[0]!.y,8).fillCircle(pts[pts.length-1]!.x,pts[pts.length-1]!.y,8);
  }

  private beginDraw(pointer: Phaser.Input.Pointer) {
    if (this.phase !== 'play' || pointer.x < this.width * .29 || pointer.x > this.width * .93 || pointer.y < this.height * .36 || pointer.y > this.height * .67) return;
    this.drawing = true; this.points = [{ x:pointer.x,y:pointer.y }]; this.drawLayer.clear();
  }
  private continueDraw(pointer: Phaser.Input.Pointer) {
    if (!this.drawing || !pointer.isDown || this.phase !== 'play') return;
    this.points.push({ x:pointer.x,y:pointer.y });
    this.drawLayer.lineStyle(11,0xffc959,1).beginPath();
    this.drawLayer.moveTo(this.points[0]!.x,this.points[0]!.y); this.points.slice(1).forEach(p=>this.drawLayer.lineTo(p.x,p.y)); this.drawLayer.strokePath();
    this.drawLayer.fillStyle(0xffffff,.9).fillCircle(pointer.x,pointer.y,6);
  }
  private finishDraw(pointer: Phaser.Input.Pointer) {
    if (!this.drawing || this.phase !== 'play') return;
    this.drawing = false; if (this.points.length) this.points.push({ x:pointer.x,y:pointer.y });
    const answer = classifyTrace(this.points,this.width,this.height);
    if (!answer) { this.message.setText('再畫長一點，從左邊一路畫到右邊喔！'); audio.gentle(); return; }
    this.judge(answer);
  }

  private judge(answer: Tone) {
    const card = this.round[this.index]!;
    this.wordTitle.setText(card.word); this.zhuyinText.setText(card.zhuyin);
    const initial = !this.triedThisWord;
    if (initial) { this.firstTry.push({ tone:card.tone,correct:answer===card.tone }); this.triedThisWord = true; }
    if (answer !== card.tone) {
      this.message.setText(`這個字是${toneNames[card.tone]}。聽聽看，金色路線往這裡走。`);
      this.drawGuide(card); audio.gentle(); this.sayCurrent();
      this.character.setAngle(-7); this.time.delayedCall(260,()=>this.character.setAngle(0));
      return;
    }
    this.stars += 1; this.progress = saveStar(); this.progressText.setText(`第 ${this.index + 1} / 10 題　　⭐ ${this.stars}`);
    this.message.setText(initial ? '畫對了！小龍找到一顆森林星星！' : '這次畫對了！小龍找到一顆星星！');
    audio.correct(); this.celebrate();
    this.index += 1; this.triedThisWord = false;
    this.time.delayedCall(1250,()=> { if (this.index >= 10) this.finishRound(); else { this.drawLayer.clear(); this.guideLayer.clear(); this.renderQuestion(); } });
  }

  private celebrate() {
    this.character.setScale(1.12);
    this.tweens.add({ targets:this.character, scale:1, duration:380, ease:'Back.Out' });
    for (let i=0;i<12;i++) {
      const star=this.add.text(this.width*.52,this.height*.48,'✦',{fontSize:'25px',color:'#fff0a2'}).setDepth(14);
      this.tweens.add({targets:star,x:this.width*.3+Math.random()*this.width*.4,y:this.height*.24+Math.random()*this.height*.35,alpha:0,scale:.3,duration:650,onComplete:()=>star.destroy()});
    }
  }

  private jump() {
    this.tweens.add({ targets:this.character, y:this.height*.47, duration:250, yoyo:true, ease:'Quad.Out' });
  }

  private finishRound() {
    this.phase='result'; this.progress=saveRound(this.stars,this.firstTry); this.layout();
  }

  private renderResult() {
    this.clearUI(); this.drawLayer.clear(); this.guideLayer.clear();
    const cx=this.width/2, narrow=this.width<640;
    this.character?.setPosition(cx,this.height*.42).setScale(1.25);
    this.text(cx,this.height*.12,'森林星星都回來了！',narrow?25:39,'#285b54');
    this.text(cx,this.height*.57,`這趟旅程收集了 ${this.stars} 顆星星！\n小龍把星星放進魔法寶箱。`,narrow?18:24,'#31536c',false);
    const chest=this.add.graphics().setDepth(4); chest.fillStyle(0x995d38,1).fillRoundedRect(cx-52,this.height*.67,104,67,13).fillStyle(0xffd266,1).fillRoundedRect(cx-56,this.height*.64,112,29,12).fillStyle(0xffeab0,1).fillRoundedRect(cx-10,this.height*.68,20,22,5);
    this.tweens.add({targets:chest,angle:{from:-3,to:3},duration:170,yoyo:true,repeat:3});
    this.text(cx,this.height*.81,`累積星星 ${this.progress.stars}　完成旅程 ${this.progress.completedRuns}`,narrow?14:18,'#56718a',false);
    this.button(cx,this.height*.92,'再冒險一次',()=>{ this.phase='title'; this.character?.setScale(1); this.layout(); },Math.min(300,this.width-42),narrow?19:23);
  }
}
