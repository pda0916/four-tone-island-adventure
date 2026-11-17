import argparse
import json
import os
from pathlib import Path
from tempfile import gettempdir
import re
import subprocess

import lameenc
import numpy as np
import onnxruntime as ort

ROOT = Path(__file__).resolve().parents[1]
MODEL = Path(os.environ.get("TONE_GUARD_VOICE_MODEL", Path(gettempdir()) / "tone-guard-prime"))
parser = argparse.ArgumentParser()
parser.add_argument("--speaker", choices=("xinran", "anchen", "bowen"), default="xinran")
parser.add_argument("--sample-style", choices=("gentle-teacher", "lively-story"))
args = parser.parse_args()
styles = {
    "gentle-teacher": ("xinran", 1.28, .48, True),
    "lively-story": ("bowen", 1.02, .65, False),
}
speaker, length_scale, noise_scale, add_pause = styles.get(
    args.sample_style, (args.speaker, 1.12, .55, False)
)
speaker_id = {"xinran": 0, "anchen": 1, "bowen": 2}[speaker]
if args.sample_style:
    folder = "preview-" + args.sample_style
else:
    folder = "taiwan-v1" if speaker == "xinran" else "taiwan-v1-" + speaker
OUT = ROOT / "public/audio" / folder
OUT.mkdir(parents=True, exist_ok=True)
lex = json.loads((MODEL / "lexicon.json").read_text(encoding="utf-8"))
ZHUYIN = [chr(c) for c in range(0x3105, 0x312a)]
PUNCT = dict(zip('，。？！…', range(80, 85)))
opts = ort.SessionOptions()
opts.intra_op_num_threads = 2
opts.inter_op_num_threads = 1
session = ort.InferenceSession(str(MODEL / "model.onnx"), sess_options=opts, providers=["CPUExecutionProvider"])
extract = """
const h=require('fs').readFileSync('index.html','utf8');
const cardsData=h.slice(h.indexOf('const cards='),h.indexOf('const tones='));
const prompts=Function(cardsData+';return cards.map(c=>[questionText(c),c])')();
const feedback=['一聲','二聲','三聲','四聲','輕聲','答對了，城堡協助攻擊','喔喔～答錯了！','有怪物溜過去了，加油！','你太棒了，挑戰成功！','你太棒了，挑戰成功！我們來到新的地圖。','前四關都完成了，隱藏關卡開啟！','這一局結束了，休息一下再回首頁挑戰吧！',...Array.from({length:6},(_,i)=>'第 '+(i+1)+' 關挑戰成功！')];
process.stdout.write(JSON.stringify([...prompts,...feedback.map(t=>[t,null])]));
"""
entries = json.loads(subprocess.check_output(["node", "-e", extract], cwd=ROOT))
if args.sample_style:
    entries = [(text, card) for text, card in entries if text == "春天的春是幾聲？"]
    if len(entries) != 1:
        raise ValueError("Could not find the preview question")

def voice_id(text):
    n = 2166136261
    for c in text:
        n = ((n ^ ord(c)) * 16777619) & 0xffffffff
    return f"{n:08x}"

def readings(text):
    result = {}
    for match in re.finditer(r'[\u3400-\u9fff]+', text):
        run = match.group()
        start = 0
        while start < len(run):
            for stop in range(min(len(run), start + 12), start + 1, -1):
                found = lex['phrases'].get(run[start:stop])
                if isinstance(found, list) and len(found) == stop - start:
                    break
            else:
                stop = start + 1
                found = [lex['characters'][run[start]]]
            result.update({match.start() + start + i: syllable for i, syllable in enumerate(found)})
            start = stop
    return result

ids = {}
for text, card in entries:
    key = voice_id(text)
    if key in ids and ids[key] != text:
        raise ValueError("Audio filename collision")
    ids[key] = text
    path = OUT / (key + ".mp3")
    if path.exists() and not os.environ.get("TONE_GUARD_REBUILD_VOICE"):
        continue
    spoken = text
    for digit, han in zip("123456", "一二三四五六"):
        spoken = spoken.replace(f"第 {digit} 關", f"第{han}關")
    spoken = spoken.replace("～", "，")
    syllables = readings(spoken)
    if card:
        char, zh, tone, phrase = card
        index = len(phrase)-1 if tone == 5 else phrase.index(char)
        value = ''.join(c for c in zh if c in ZHUYIN) + str(tone)
        syllables[index] = value
        if spoken.startswith(phrase+'的'+char):
            syllables[len(phrase)+1] = value
    x, ts = [0], [0]
    for i, ch in enumerate(spoken):
        if i in syllables:
            syllable = syllables[i]
            for phone in syllable[:-1]:
                x += [ZHUYIN.index(phone)+4, 0]
                ts += [int(syllable[-1]), 0]
            if add_pause and i == 3:
                x += [PUNCT["，"], 0]
                ts += [0, 0]
        elif ch in PUNCT:
            x += [PUNCT[ch], 0]
            ts += [0, 0]
    inputs = dict(x=np.array([x], dtype=np.int64), tone=np.array([ts], dtype=np.int64),
                  lang=np.zeros((1, len(x)), dtype=np.int64), x_lengths=np.array([len(x)], dtype=np.int64),
                  sid=np.array([speaker_id], dtype=np.int64), noise_scale=np.array([noise_scale], dtype=np.float32),
                  length_scale=np.array([length_scale], dtype=np.float32))
    wav = session.run(None, inputs)[0].ravel()
    if not np.isfinite(wav).all() or np.max(np.abs(wav)) < .01 or not .2 < len(wav)/16000 < 12:
        raise RuntimeError(f"Unexpected output for {text}")
    wav = np.concatenate((np.zeros(900), wav, np.zeros(1300)))
    pcm = (np.clip(wav, -1, 1) * 32767).astype('<i2').tobytes()
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(48)
    encoder.set_in_sample_rate(16000)
    encoder.set_channels(1)
    encoder.set_quality(2)
    path.write_bytes(encoder.encode(pcm) + encoder.flush())
print(f"{speaker}: {len(ids)} audio clips")
