<div align="center">

<img src="screenshots/hero-banner.png" alt="VocabForge AI" width="100%" />

# ⚡ VocabForge AI

### 一键生成专业词汇试卷的桌面工具

*Electron Desktop App · Multi-AI Provider · Instant PDF Export*

[![Electron](https://img.shields.io/badge/Electron-35-47848f?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

</div>

---

## 📖 目录 / Table of Contents

- [What is VocabForge AI? / 这是什么？](#-what-is-vocabforge-ai)
- [Key Features / 核心功能](#-key-features--核心功能)
- [Screenshots / 产品截图](#-screenshots--产品截图)
- [Quick Start / 快速开始](#-quick-start--快速开始)
- [Supported AI Providers / 支持的 AI 提供商](#-supported-ai-providers--支持的-ai-提供商)
- [Question Types / 题型说明](#-question-types--题型说明)
- [PDF Export / PDF 导出](#-pdf-export--pdf-导出)
- [Project Structure / 项目结构](#-project-structure--项目结构)
- [Build from Source / 从源码构建](#-build-from-source--从源码构建)
- [FAQ](#-faq)

---

## 🎯 What is VocabForge AI?

**VocabForge AI** is a desktop application that lets English teachers generate **professional vocabulary tests** in seconds. Type a list of words → choose question types → AI generates multiple test versions → export to PDF. No browser, no server, no monthly subscription.

> **VocabForge AI** 是一个桌面应用。英语老师只需输入单词列表，选择题型，AI 就能自动生成多版本的词汇测试卷，一键导出 PDF。无需浏览器，无需服务器，无需月费订阅。

---

## ✨ Key Features / 核心功能

| Feature | Description |
|---------|-------------|
| 🤖 **Multi-AI Backend** | Supports Gemini, DeepSeek, OpenAI, Kimi, and custom OpenAI-compatible APIs. You own your API key. |
| 📝 **6 Question Types** | Fill-in-the-Blank, Synonyms & Antonyms, Sentence Rewrite, Word Bank, Scrambled Sentences, Creative Writing |
| 🔄 **Multi-Version** | Generate 1–3 distinct versions (A/B/C) with shuffled questions — cheat-proof your exams |
| 📄 **One-Click PDF** | Student version (no answers) + Teacher version (with answer key) in a single click |
| 🎨 **Dark / Light Mode** | Deep navy + gold gradient dark theme, clean white light theme. Toggle anytime. |
| ✏️ **Inline Editing** | Click any question to edit in-place. Toggle answers on/off for review. |
| 💾 **Smart Persistence** | Save word lists, archive test versions, remember per-provider API keys — all in localStorage |
| 🏗️ **Manual Mode** | Skip AI entirely. Generate blank templates and fill in your own content. |

---

## 📸 Screenshots / 产品截图

### Main Interface / 主界面
| Light Mode | Dark Mode |
|------------|-----------|
| ![Light Main](screenshots/01-light-main.png) | ![Dark Main](screenshots/02-dark-main.png) |

### AI Generation
![Generation](screenshots/03-ai-generation.png)

### Test Preview & Editing
| Version Tabs | Inline Editing |
|-------------|----------------|
| ![Versions](screenshots/04-version-tabs.png) | ![Editing](screenshots/05-inline-edit.png) |

### Question Types / 题型预览
| Fill-in-the-Blank | Word Bank | Scrambled Sentences |
|-------------------|-----------|---------------------|
| ![FillBlank](screenshots/06-fill-blank.png) | ![WordBank](screenshots/07-word-bank.png) | ![Scrambled](screenshots/08-scrambled.png) |

### PDF Export
| Student Version | Teacher Version |
|----------------|-----------------|
| ![Student PDF](screenshots/09-pdf-student.png) | ![Teacher PDF](screenshots/10-pdf-teacher.png) |

### Settings & Multi-Provider
![Settings](screenshots/11-settings.png)

---

## 🚀 Quick Start / 快速开始

### For End Users / 普通用户（直接使用）

1. **[Download](https://github.com/chasechowa/vocabforge-ai/releases)** the latest `VocabForge AI-Portable-1.0.0.exe`
2. Double-click to run — no installation needed
3. Click **⚙️ Settings** in the top-right, paste your API key (free from [Google AI Studio](https://aistudio.google.com/apikey) or any supported provider)
4. Start generating tests!

> **下载** 最新的便携版 `.exe` 文件，双击即用。无需安装。

### For Developers / 开发者

```bash
# 1. Clone
git clone https://github.com/chasechowa/vocabforge-ai.git
cd vocabforge-ai

# 2. Install
npm install

# 3. Run (Electron dev mode)
npm run electron:dev

# 4. Package for Windows
npm run electron:build
```

---

## 🤖 Supported AI Providers / 支持的 AI 提供商

| Provider | Default Model | API Key Source | Notes |
|----------|--------------|----------------|-------|
| **Gemini** | `gemini-1.5-flash` | [Google AI Studio](https://aistudio.google.com/apikey) | Free tier available |
| **DeepSeek** | `deepseek-chat` | [DeepSeek Platform](https://platform.deepseek.com/) | Low cost, high quality |
| **OpenAI** | `gpt-4o-mini` | [OpenAI Platform](https://platform.openai.com/) | Industry standard |
| **Kimi** | `moonshot-v1-8k` | [Moonshot AI](https://platform.moonshot.cn/) | Chinese-English bilingual |
| **Custom** | User-defined | Your own endpoint | Any OpenAI-compatible API |

> Each provider's API key and settings are stored **independently** in localStorage. Switch providers anytime without losing configuration.
>
> 每个提供商的 API 密钥和设置**独立保存**在本地，随时切换不影响。

---

## 📝 Question Types / 题型说明

| # | Type | Questions | Description |
|---|------|-----------|-------------|
| 1 | **Fill-in-the-Blank** | 10 | Complete sentences with definition clues in brackets |
| 2 | **Synonyms & Antonyms** | 10 | Mark word pairs as Synonym (S) or Antonym (A) |
| 3 | **Sentence Rewrite** | 5 | Rewrite sentences using the target word |
| 4 | **Word Bank** | 10 | Choose from 10 given words to fill blanks |
| 5 | **Scrambled Sentences** | 10 | Unscramble words into grammatically correct sentences (dialogue format) |
| 6 | **Creative Writing** | 5 | Write a short story using all given words |

> All question counts, difficulty levels, and section combinations are **user-configurable**.

---

## 📄 PDF Export / PDF 导出

- **Student Version**: All answers hidden, blanks shown as underscores
- **Teacher Version**: Answers inline, includes full answer key
- Layout automatically adapts per question type (word bank grid, scrambled sentence formatting, etc.)
- Uses `jsPDF` — no server-side rendering needed

---

## 🏗️ Project Structure / 项目结构

```
vocabforge-ai/
├── electron/
│   ├── main.ts          # BrowserWindow, IPC proxy, system proxy detection
│   ├── main.js          # Compiled Electron entry (used by electron-builder)
│   ├── preload.ts       # Context bridge for IPC
│   └── preload.js
├── components/
│   ├── InputSection.tsx  # Word input, section toggles, settings, saved lists
│   └── TestPreview.tsx   # Multi-version preview, inline editing, PDF export
├── services/
│   ├── aiService.ts      # Multi-provider dispatch, SSE streaming, retry logic
│   └── pdfService.ts     # jsPDF layout engine
├── App.tsx               # Root component, dark/light mode, version history
├── types.ts              # All TypeScript interfaces & enums
├── index.html            # Tailwind CDN config + theme pre-init
├── index.css             # Animation keyframes
├── vite.config.ts
└── package.json
```

---

## 🔨 Build from Source / 从源码构建

```bash
# Prerequisites: Node.js ≥ 18

npm install
npm run electron:dev      # Dev mode (hot reload)
npm run electron:build    # Package for Windows (.exe)
```

The packaged output will be in `release/`:
- `win-unpacked/` — unpacked directory (portable)
- `VocabForge AI Setup X.X.X.exe` — NSIS installer (if `nsis` target configured)
- `VocabForge AI-Portable-X.X.X.exe` — Single-file portable exe

> ⚠️ Packaging requires internet access to download Electron binaries and NSIS toolchain. In China, use:
> ```bash
> set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
> npm run electron:build
> ```

---

## ❓ FAQ

**Q: Is my API key safe?**
A: Yes. Your API key is stored **only** in your browser's localStorage and never leaves your machine. The Electron main process proxies API calls to avoid exposing your key.

**Q: Does it work offline?**
A: Test generation requires an internet connection (AI API calls). PDF export and manual editing work offline.

**Q: Can I use it on Mac/Linux?**
A: Yes. Clone the repo, `npm run electron:dev` to run in development mode.

**Q: How many words per test?**
A: 5–60 words per batch. For best results, keep it under 30 words per batch.

**Q: Is the generated content copyright-free?**
A: Yes. All content generated by the AI is yours to use, modify, and distribute.

---

<div align="center">
<br />
<p>Built for teachers. Powered by AI.</p>
<p><sub>© 2026 VocabForge AI · Created by chasechowa</sub></p>
</div>
