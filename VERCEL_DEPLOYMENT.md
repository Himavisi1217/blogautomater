# Vercel Deployment Guide

This guide explains how to deploy the Blog Automation project to Vercel.

## Prerequisites

- Vercel account (create at https://vercel.com)
- GitHub account with the repository pushed
- Environment variables ready

## Step 1: Push to GitHub

Ensure your code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## Step 2: Connect Vercel to GitHub

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Select your GitHub repository
4. Vercel will auto-detect it's a Vite project

## Step 3: Configure Environment Variables

In the Vercel project settings, add these environment variables:

**Required AI/API Keys:**
- `CLAUDE_API_KEY` - Anthropic API key
- `GOOGLE_API_KEY` - Google Generative AI key
- `GROQ_API_KEY` - Groq API key

**Supabase:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

**Notion:**
- `NOTION_TOKEN` - Notion integration token

**Strapi (if used):**
- `STRAPI_URL` - Your Strapi instance URL
- `STRAPI_API_KEY` - Strapi API key

**GitHub OAuth (if using auth):**
- `GITHUB_CLIENT_ID` - GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth app secret
- `GITHUB_REDIRECT_URI` - Your Vercel domain with `/api/auth/callback`

## Step 4: Deploy

Once environment variables are set:

1. Click "Deploy"
2. Vercel will build and deploy automatically
3. Your app will be live at `https://[your-project].vercel.app`

## Architecture

- **Frontend**: Vite builds to `dist/` directory
- **API Routes**: Express server runs in `/api` serverless functions
- **Rewrites**: 
  - `/api/*` routes go to the serverless function
  - All other routes fallback to `index.html` for SPA routing

## Local Testing with Vercel CLI

Test locally before deploying:

```bash
npm install -g vercel
vercel dev
```

This will start both Vite and serverless functions locally.

## Troubleshooting

### Build Fails
- Check `vercel.json` buildCommand matches your setup
- Ensure all dependencies are in `package.json`

### API Routes Not Working
- Verify environment variables are set in Vercel dashboard
- Check `/api/server.ts` handler path in `vercel.json`

### CORS Issues
- CORS is enabled in the API handler
- Check your frontend domain is accessible

## Switching Back to Netlify

If you need to return to Netlify, keep `netlify.toml` and remove Vercel files:

```bash
rm vercel.json .vercelignore api/server.ts
```
