# PilotUp Bloger — AI Blog Automation

Automated blog content generation platform powered by AI. Fetches keywords from Notion, generates SEO-optimized blog posts using Gemini/Claude/Groq, and saves them as drafts to Strapi CMS.

## Features

- **Notion Integration** — Fetch keywords from your Notion database
- **Multi-AI Support** — Generate with Google Gemini, Claude (via AgentRouter), or Groq
- **SEO Metadata** — Auto-generates meta title, description, OG tags, excerpt, and slug
- **FAQ Generation** — Every blog includes a FAQ section with Schema.org markup
- **Strapi CMS** — Save generated blogs as drafts directly to Strapi
- **Humanized Content** — Built-in rules to avoid AI-sounding patterns
- **Anti-Hallucination** — Strict guardrails against fabricated stats and sources

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Copy the example and fill in your keys:
```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `NOTION_API_KEY` | Notion integration API key |
| `NOTION_DATABASE_ID` | Your keywords database ID |
| `GEMINI_API_KEY` | Google AI Studio API key |
| `ANTHROPIC_API_KEY` | AgentRouter API key for Claude |
| `GROQ_API_KEY` | Groq API key |
| `STRAPI_URL` | Your Strapi instance URL |
| `STRAPI_API_TOKEN` | Strapi API token |

### 3. Run locally
```bash
npm run dev
```
Opens frontend at `http://localhost:5173` and backend at `http://localhost:3001`.

## Deploy to Netlify

1. Push to GitHub
2. Connect repo in Netlify dashboard
3. Set environment variables in **Site Settings > Environment Variables**
4. Deploy — Netlify auto-builds and deploys

Build settings are pre-configured in `netlify.toml`.

Netlify serves the SPA from `dist` and routes `/api/*` to the serverless function in `netlify/functions/api.ts`. The API exposes the same `/api/...` paths as local development, while settings are read-only in serverless hosting because `.env` writes are not persistent there.

## Tech Stack

- **Frontend**: Vite + TypeScript
- **Backend**: Express (local) / Netlify Functions (production)
- **AI**: Google Gemini, Anthropic Claude, Groq Llama
- **CMS**: Strapi
- **Keywords**: Notion API
