# Hunter System — Vercel Deployment

A Solo Leveling-inspired self-improvement tracker with AI coaching.

## Project Structure

```
hunter-system/
├── api/
│   └── chat.js          ← Vercel serverless function (proxies Anthropic API)
├── src/
│   ├── main.jsx         ← React entry point
│   └── App.jsx          ← Full app (localStorage for persistence)
├── public/
│   └── favicon.svg
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

## Deploy to Vercel (Step-by-Step)

### 1. Push to GitHub
```bash
cd hunter-system
git init
git add .
git commit -m "Initial commit"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/hunter-system.git
git push -u origin main
```

### 2. Import to Vercel
1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select your `hunter-system` repo
4. Framework will auto-detect as **Vite**
5. Click **Deploy**

### 3. Add your Anthropic API Key (for the AI System tab)
1. In Vercel dashboard → your project → **Settings** → **Environment Variables**
2. Add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-...` (your key from https://console.anthropic.com)
3. Click **Save**, then **Redeploy**

## What Changed from the Original

| Feature | Original (Claude Artifact) | This Version (Vercel) |
|---|---|---|
| Storage | `window.storage` (Claude API) | `localStorage` (browser) |
| AI Chat | Direct Anthropic API call | `/api/chat` serverless proxy |
| Leaderboard | Shared `window.storage` | Local-only (your profile only) |

## Local Development

```bash
npm install
npm run dev
```

For local AI chat to work, create `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```
