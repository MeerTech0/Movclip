# Movclip

A premium, responsive movie and TV discovery frontend powered by The Movie Database (TMDB).

## Stack
- React + TypeScript + Vite
- Netlify Functions for the TMDB API proxy
- Netlify hosting
- Browser-local watchlist (no account required)

## Run locally
1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and add your TMDB API key as `TMDB_API_KEY`.
4. Run `npm run dev` for the frontend. For the serverless API locally, use Netlify CLI: `npx netlify dev`.

## Deploy to Netlify
1. Import this GitHub repository in Netlify.
2. Build command: `npm run build`; publish directory: `dist`.
3. In **Site configuration → Environment variables**, add `TMDB_API_KEY` with your TMDB API key.
4. Trigger a fresh deploy.

Never put the TMDB key in frontend source code or commit it to GitHub. If a key has been shared publicly or pasted into a chat, rotate it in your TMDB account before deploying.

## Notes
- The watchlist is stored in the current browser using localStorage; it does not sync between devices.
- TMDB supplies metadata and artwork. Movclip is not endorsed or certified by TMDB.
- The interface is for discovery and catalog browsing. It does not host copyrighted films or episodes.
