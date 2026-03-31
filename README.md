<div align="center">

<br/>

### ✦ ·˖° **linkedin feed cleaner** °˖· ✦

<sub>☆ manifest v3 · vanilla js · zero runtime bundler ☆</sub>

<br/>

<img src="assets/y2k-banner.gif" width="100%" alt="Y2K gradient banner" />

<br/>

| ✧ | status | ✧ |
|:---:|:---|:---:|
| build | `no webpack` | ✓ |
| vibes | `y2k compliant` | ✓ |

<br/>

<img src="assets/y2k-sparkles.gif" width="180" alt="sparkles" />

<br/>

</div>

---

## ▸ what it does

Browser extension (**Chromium MV3** + **Firefox** / Zen) that **hides** feed cards on `linkedin.com` when post text matches a keyword list (built-in + custom).  
State → `storage.local`. Popup → `tabs.sendMessage` to LinkedIn tabs so **Gecko** stays aligned with **Chromium**.

---

## ▸ built-in keyword list

Matching is case-insensitive; Unicode “fancy” Latin (e.g. mathematical italics) is folded to ASCII before checks.  
Custom lines from the popup are **substring** matches (one phrase per line), except a line that is exactly `ai` or `ia`, which uses **whole-word** matching like the built-ins below.

### Whole words only

These do **not** match inside longer words (e.g. not `email`, `inicia`):

| Source | Tokens |
|:---|:---|
| `PHRASES` | `ai`, `ia` |
| `SHORT_PATTERNS` (regex `\b…\b`) | `ml`, `llm`, `llms`, `rag`, `agi` |

### Substring phrases (`PHRASES`)

If the post text contains any of these (after normalization), the card is hidden:

```
artificial intelligence
inteligencia artificial
machine learning
aprendizaje automático
deep learning
large language model
language model
generative ai
generative artificial
gen ai
genai
chatgpt
chat gpt
gpt-4
gpt-3
gpt 4
gpt 3
gpt4
gpt3
openai
anthropic
claude
midjourney
dall-e
dall·e
stable diffusion
prompt engineering
ingeniería de prompts
copilot
github copilot
google gemini
gemini pro
google bard
neural network
neural networks
redes neuronales
fine-tuning
finetuning
fine tuning
retrieval augmented
rag pipeline
multimodal model
diffusion model
transformer model
whisper
embedding model
vector database
langchain
haystack
hugging face
mistral ai
cohere
perplexity ai
whatsapp
whatsapp business
```

Canonical list lives in **`content.js`** (`PHRASES` + `SHORT_PATTERNS`).

---

## ▸ stack 〜 file map

| layer | files |
|:---|:---|
| chrome (UI) | `popup.html` · `popup.css` · `popup.js` |
| page | `content.js` · `content.css` |
| legacy MV2 | `manifest-firefox-v2.json` · `background.js` |
| ship icon | `icon.png` |
| qa | `npm run lint:firefox` · `npm run pack:temp` |

<details>
<summary><b>⋆ repo tree (expand) ⋆</b></summary>

```
manifest.json
manifest-firefox-v2.json
content.js / content.css
popup.html / popup.css / popup.js
background.js
icon.png
assets/*.gif          ← readme eye candy + swap in your own demos
LICENSE · CONTRIBUTING.md
```

</details>

---

<div align="center">

### 〜 cyber mini-demo 〜

*(decorative — record your own popup + feed captures as `assets/demo-popup.gif` etc.)*

<img src="assets/y2k-terminal.gif" width="420" alt="terminal aesthetic demo" />

</div>

---

## ▸ local dev

```bash
npm install
npm run lint:firefox
```

| browser | how |
|:---|:---|
| **Chrome** | `chrome://extensions` → Load unpacked → this folder (`manifest.json`) |
| **Firefox / Zen** | `npm run pack:temp` → load `.xpi` in `about:debugging` **or** fix Flatpak portal ([bug 1639530](https://bugzilla.mozilla.org/show_bug.cgi?id=1639530)) |

---

## ▸ permissions (honest list)

- `storage` — toggle + keywords  
- `tabs` — notify LinkedIn tabs after save  
- host `https://www.linkedin.com/*` · `https://linkedin.com/*` — inject content script  

---

## ▸ versions & releases

- **SemVer** — `package.json`, `manifest.json`, and `manifest-firefox-v2.json` share the same `version` (e.g. `1.1.0`). Check with `npm run verify:version`.
- **[CHANGELOG.md](CHANGELOG.md)** — human-readable history.
- **[RELEASING.md](RELEASING.md)** — bump, tag (`v1.0.1`), GitHub Release, stores.
- Pushing a tag **`v*.*.*`** runs **GitHub Actions**: lint, build, attach `web-ext-artifacts/*.zip` to the release.

---

## ▸ collab

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — PR + issue rules  
- **[LICENSE](LICENSE)** — MIT  

---

<div align="center">

```
·:*¨༺ ♱ ✧ ✦ ✧ ♱ ༻¨*:·
```

<sub>〜 made for humans who miss chronological feeds 〜</sub>

<br/>

**[jeanroa.dev](https://jeanroa.dev)** · **[support the project](https://buymeacoffee.com/jeanroa)** · **[github](https://github.com/drakvyn/feed-fleaner-for-linkedIn)**

<br/>

</div>
