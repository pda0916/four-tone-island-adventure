# 《聲調守衛戰》台灣國語語音

遊戲優先播放首頁選擇的預先合成音檔：A 女聲 Xinran（`taiwan-v1/`）、B 男聲 Anchen（`taiwan-v1-anchen/`）、C 男聲 Bowen（`taiwan-v1-bowen/`）。這些音檔由台灣國語模型產生，並非真人錄音；音檔無法播放時，會改用裝置的中文語音。

模型為 [PrimeTTS v2.1](https://huggingface.co/Luigi/PrimeTTS)，使用 [PrismVoice-TW](https://huggingface.co/PrismLive/PrismVoice-TW) 的 ONNX 版（Apache 2.0）及其從 [McBopomofo](https://github.com/openvanilla/McBopomofo)（MIT）編製的發音詞典。網頁只提供生成後的短音檔，模型與詞典不隨遊戲載入。

如要更新音檔，先安裝 Python 套件 `onnxruntime numpy lameenc`，將 `primetts_v21_3voice.onnx`（改名為 `model.onnx`）與 `lexicon.json` 放在同一資料夾，把環境變數 `TONE_GUARD_VOICE_MODEL` 指向該資料夾，再從專案根目錄執行 `python scripts/generate_taiwan_voice.py --speaker xinran`。另兩組音檔分別以 `--speaker anchen`、`--speaker bowen` 產生。目標字音由題庫注音指定。音檔檔名從完整語句產生，修改句子後需重新產生對應音檔。如需覆寫現有音檔，可設定 `TONE_GUARD_REBUILD_VOICE=1`。
