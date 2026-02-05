-- Library Finder: run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Creates tables, RLS, profile-on-signup trigger, and enables Realtime.

-- =============================================================================
-- 1. PROFILES (display username; one row per auth user)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: create profile when a new user signs up (username from user_metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 2. FRIENDSHIPS (mutual: from_user sent request to to_user; accepted = friends)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_user_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_from ON public.friendships(from_user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_to ON public.friendships(to_user_id);

-- =============================================================================
-- 3. LIBRARY_STATUS (at_library + floor 1–5; one row per user)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.library_status (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  at_library BOOLEAN NOT NULL DEFAULT false,
  floor SMALLINT CHECK (floor IS NULL OR (floor >= 1 AND floor <= 5)),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_status ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read (for search by username); only own row can update
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Friendships: insert as sender; update (accept) as receiver; read/delete own
CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can accept requests sent to them"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = to_user_id);

CREATE POLICY "Users can view their friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can delete their friendships"
  ON public.friendships FOR DELETE
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Library status: users can read status of friends only (via helper); full CRUD on own row
CREATE POLICY "Users can manage own library status"
  ON public.library_status FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- "Read friends' status" is trickier: we need to allow read where user_id is a friend.
-- A simple approach: allow read for any user_id where there's an accepted friendship with auth.uid().
CREATE POLICY "Users can view friends' library status"
  ON public.library_status FOR SELECT
  USING (
    user_id IN (
      SELECT from_user_id FROM public.friendships
      WHERE to_user_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT to_user_id FROM public.friendships
      WHERE from_user_id = auth.uid() AND status = 'accepted'
    )
  );

-- =============================================================================
-- 5. REALTIME (subscribe to library_status changes so building updates live)
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.library_status;
