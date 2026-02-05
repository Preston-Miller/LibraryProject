# Library Finder (BYU)

Web app to see which friends are at the BYU library and which floor they're on. See the main [project spec](../project.md) in the repo root.

## Run locally

```bash
cd app
npm install
npm run dev
```

Open the URL shown (e.g. http://localhost:5173).

## Supabase setup (required for auth & data)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project dashboard: **Settings → API** — copy the **Project URL** and **anon public** key.
3. In the `app` folder, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Edit `.env` and set:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
5. Restart the dev server (`npm run dev`).

Until `.env` is set, the app will show the login screen but sign-in/sign-up will not persist (no backend). After adding Supabase, you can sign up with any username and password.

**Optional:** In Supabase **Authentication → Providers → Email**, turn off "Confirm email" so sign-up works immediately without email verification.

## Next steps (from project.md)

- Add Supabase tables: `profiles` (username, linked to auth), `friendships`, `library_status`.
- Enable Realtime for status so the building view updates when friends change floor.
- Style the 5-story building and add friends UI (add / requests / list).
