# FlowTalk AI 🚀 — Universal Smart Rewrite Assistant

**FlowTalk AI** is a high-performance, real-time AI communication assistant that seamlessly transforms rapid thoughts or voice inputs into beautifully polished, context-aware messages. 

Leveraging **Gemini 3.5 Flash** server-side, it dynamically detects native input languages in real-time (including English, Bengali, Hindi, Spanish, French, and German) and crafts professional or executive drafts customized for your target platform (Slack, WhatsApp, Microsoft Teams, Gmail, etc.).

---

## 📖 Table of Contents
1. [Core Features](#-core-features)
2. [Local Setup Guide (Develoment & Run)](#-local-setup-guide)
3. [Chrome Extension Integration (Write Anywhere)](#-chrome-extension-setup-recommended)
4. [Desktop Standalone App (PWA)](#-desktop-standalone-window-pwa)
5. [Mobile Companion & Cloud Sync](#-mobile-companion-and-cloud-sync)

---

## ✨ Core Features
*   **Real-Time Language Detection**: Dynamically tracks and displays inputted language in milliseconds.
*   **Context-Engine Adaptability**: Customizes rewrites specifically for Teams, Slack, WhatsApp, or Email structure.
*   **Tone Control Slider**: Transition fluently between *Casual*, *Professional*, and *Executive Elite* tones.
*   **Use Anywhere Integration Engine**: Directly exports live code bundles supporting universal chrome injection and cloud synched cross-platform continuity.

---

## 🛠️ Local Setup Guide

If you want to run FlowTalk AI locally:

### 1. Prerequisites
*   **Node.js** (v18.0.0 or higher)
*   **npm** (comes packaged with Node.js)
*   **Gemini API Key** (Obtain a key at [Google AI Studio](https://aistudio.google.com/app/apikey))

### 2. Dependency Installation
```bash
npm install
```

### 3. Add Environment Secrets
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Boot Development Servers
```bash
npm run dev
```
The application will boot and become instantly accessible at `http://localhost:3000`.

### 5. Production Compilations
```bash
npm run build
npm start
```

---

## 🔌 Chrome Extension Setup (Recommended)
You can inject the floating **FlowTalk Bubble** directly over your real web-based messaging workspaces (WhatsApp Web, Slack, Gmail, Teams Web, Messenger, Telegram). It will read your textboxes, write the rewrites, and place them directly into your fields instantly!

```
           +---------------------------------------------+
           |   FlowTalk Floating Web Bubble (Any page)    |
           +---------------------------------------------+
                                  |
                                  v
+------------------+     +------------------+     +-------------------+
|  WhatsApp Web    |     |    Slack Web     |     |    Gmail Web      |
| [Input Area] <-- | <-- | [Smart Rewrite]  | --> | [Input Area] ---> |
+------------------+     +------------------+     +-------------------+
```

### Installation Steps:
1.  **Launch FlowTalk AI**: Open the application preview.
2.  **Open the Integration Tab**: Click on the **"Use Anywhere"** tab at the top of the interface.
3.  **Download Ext Bundles**:
    *   Click **"Download manifest.json"** to fetch your extension definition.
    *   Click **"Download content.js"** to fetch the background floating injector.
4.  **Create Extension Directory**:
    *   Create a folder on your computer named `flowtalk-ext`.
    *   Move both downloaded `manifest.json` and `content.js` files into this directory.
5.  **Load into Google Chrome**:
    *   In your Chrome address bar, navigate to: `chrome://extensions/`
    *   Toggle **"Developer Mode"** in the top right-hand corner.
    *   Click **"Load unpacked"** in the top left.
    *   Select your created `flowtalk-ext` folder.
6.  **Use Anywhere**: 
    *   Go to `web.whatsapp.com` or `mail.google.com`.
    *   Look at the bottom right corner—the **FlowTalk Purple Aura Bubble** is now floating on top of your page! Toggle it anytime to rewrite live inputs on the fly.

---

## 💻 Desktop Standalone Window (PWA)
Want to run FlowTalk as an independent app floating alongside native Telegram, Skype, or Discord without extra chrome tabs?

1.  Open the FlowTalk Application in your browser (**Chrome**, **Edge**, or **Arc**).
2.  Look at the right side of your browser address bar (URL input bar) and click the **"Install FlowTalk AI..."** icon (it looks like a monitor with an arrow inside, or a plus sign near the bookmark star).
3.  Ensure you tick **"Open as window"** during the prompt.
4.  It will create a native icon on your Mac spotlight or Windows taskbar. You can now resize it as a utility bar and let it float anywhere!

---

## 📱 Mobile Companion and Cloud Sync
Never lose your history or your templates when you are talking on the go!

1.  Open **Use Anywhere** -> **Mobile Sync**.
2.  Use your iPhone or Android phone camera to scan the dynamic **QR code** rendered on the screen.
3.  It will immediately load your exact FlowTalk environment on your mobile Safari/Chrome browser.
4.  **Speech-To-Text Dictation**: Tap the microphone icon on your mobile device keyboard: dictating thoughts in Hindi, Bengali, or English on the go will generate instant detected scripts, which sync seamlessly under your primary workspace.
5.  **Universal Sync**: Everything generated under your device email is auto-saved in your offline session context and aligned using identical cloud-endpoint routing!

---

## 🧪 Technical Architecture

FlowTalk is built using the following stack:
*   **Vite & React (TypeScript)**: Highly fluid layout transitions using `motion/react` with spring physics.
*   **Tailwind CSS**: High-impact modern typography paired with high-contrast Slate components.
*   **Express Proxy Server**: Proxies translation and rewriting streams safely using server-side Gemini endpoints to keep API keys absolute secure.

---

*Crafted for beautiful, context-rich writing everywhere.*
