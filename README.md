# CultureConnect (starter)
React + TypeScript + Tailwind + Supabase. Name is set by `APP_NAME` in `src/App.tsx`.

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env`; fill in your Supabase URL and **anon** key (Project Settings > API). Never use the service_role key.
3. In Supabase > SQL Editor, run all of `supabase/schema.sql`.
4. Supabase > Authentication > URL Configuration: add your site URL (http://localhost:5173 and your Vercel URL).
5. `npm run dev`

## Deploy on Vercel
Import the GitHub repo. Framework: Vite. Add env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Deploy.

## Working with a real backend
Sign up/in, profiles (with privacy), posts with image upload, likes, saves, comments, report, block, delete-own, search/filter, events list. Access rules are enforced by Row Level Security in the SQL, not just the UI.

## Not built yet
Visual world map (use react-simple-maps or MapLibre), calendar view, event filters beyond status, follows, moderator dashboard, community guidelines page, seeded demo posts, global search. The published prototype page shows these designs.
