# Wyzie Cloudflare Worker Proxy (Option 1)

This worker keeps your Wyzie API key (`NITRO_API_TOKEN`) completely private on the server side and secures it with Bearer token authentication (`NITRO_WORKER_KEY`).

## Architecture Flow

```
CineVerse Client
       │
       ▼
CineVerse Backend  ──(Authorization: Bearer <NITRO_WORKER_KEY>)──►  Cloudflare Worker
                                                                           │
                                                                           ▼ (Injected ?key=<NITRO_API_TOKEN>)
                                                                    sub.wyzie.io
```

## How to Deploy to Cloudflare Workers in 60 Seconds

### Method 1: Via Cloudflare Dashboard (No CLI Required)
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Compute (Workers & Pages)** > **Create application** > **Create Worker**.
2. Name your worker (e.g., `cineverse-wyzie-worker`) and click **Deploy**.
3. Click **Edit code**, paste the full contents of `backend/workers/wyzie-worker.js`, and click **Deploy**.
4. Go to **Settings** > **Variables and Secrets**:
   - Add Secret: `NITRO_API_TOKEN` = `<your_wyzie_api_key>` (Get from store.wyzie.io)
   - Add Secret: `NITRO_WORKER_KEY` = `<choose_any_secret_password>` (e.g. `cineverse_secret_123456`)
5. Copy your worker URL (e.g., `https://cineverse-wyzie-worker.your-subdomain.workers.dev`).

### Method 2: Via Wrangler CLI
```bash
cd backend/workers
npx wrangler deploy wyzie-worker.js --name cineverse-wyzie-worker
npx wrangler secret put NITRO_API_TOKEN
npx wrangler secret put NITRO_WORKER_KEY
```

## Configure CineVerse Backend
In your backend `.env` (or environment variables on Vercel / Render / VPS):
```env
WYZIE_WORKER_URL=https://cineverse-wyzie-worker.your-subdomain.workers.dev
NITRO_WORKER_KEY=cineverse_secret_123456
```
*(Your frontend will automatically fetch subtitles via `/api/movies/subtitles` with zero API key exposure).*
