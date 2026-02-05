# Supabase setup for Library Finder

Follow these steps once. After this, the app will use real auth and data.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **New project**.
3. Pick an organization (or create one), name the project (e.g. `library-finder`), set a database password (save it somewhere), choose a region, then **Create new project**.
4. Wait for the project to finish provisioning.

## 2. Get your API keys

1. In the project dashboard, open **Settings** (gear) → **API**.
2. Copy:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

## 3. Add keys to the app

1. In the repo, go to the `app` folder.
2. Copy the example env file and add your values:
   ```bash
   cp .env.example .env
   ```
3. Edit `app/.env` and set:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
4. Save the file. **Do not commit `.env`** (it’s in `.gitignore`).

## 4. Run the database schema

1. In Supabase, open **SQL Editor** → **New query**.
2. Open the file `supabase/schema.sql` in this repo and copy its full contents.
3. Paste into the SQL Editor and click **Run** (or press Cmd/Ctrl+Enter).
4. You should see “Success. No rows returned.” (Tables, RLS, trigger, and Realtime are created.)

If you get an error like “relation already exists”, you can ignore it for that statement or run the schema only once.

## 5. (Optional) Turn off email confirmation

So users can sign in right after sign-up without confirming email:

1. In Supabase: **Authentication** → **Providers** → **Email**.
2. Turn **off** “Confirm email”.
3. Save.

## 6. Run the app

From the repo root:

```bash
cd app
npm install
npm run dev
```

Open the URL (e.g. http://localhost:5173). You should see the login screen; the “Continue without signing in (preview)” link will be **hidden** because Supabase is configured. Sign up with a username and password, then use the main page and set your library status.
