# FlowTalk AI - Local Setup Guide

FlowTalk AI is a high-performance communication assistant that transforms natural thoughts into professional messages.

## Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- A Google Gemini API Key (Get one at [aistudio.google.com](https://aistudio.google.com/app/apikey))

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Run the Development Server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

## Building for Production

To create a production-ready bundle:
```bash
npm run build
npm start
```

## Features
- **Smart Rewrite**: Automatically polishes your thoughts into professional messages.
- **Multilingual Support**: Supports English, Bengali, Hindi, Spanish, French, and German.
- **Tone Control**: Choose between Casual, Professional, or Executive tones.
- **Context Aware**: Adapts output based on the target app (Teams, Slack, etc.).
- **Automatic Retries**: Robust handling of API demand spikes.
