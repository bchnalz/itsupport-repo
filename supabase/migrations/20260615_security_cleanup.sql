-- Security & cleanup migration
-- 1. Drop unused tables
-- 2. Fix app_settings RLS
-- 3. Add user_tokens RLS
-- 4. Add missing file_name column

-- Drop unused categories table (replaced by tags)
DROP TABLE IF EXISTS public.categories CASCADE;

-- Drop unused app_settings table (broken RLS, never used in code)
DROP TABLE IF EXISTS public.app_settings CASCADE;

-- Add file_name column if missing (referenced by edge functions)
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Ensure uploaded_by_email column exists
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS uploaded_by_email TEXT;

-- Add CASCADE delete for user_tokens when user is deleted from user_roles
-- (Note: actual auth.users deletion happens via edge function, so this helps)
ALTER TABLE public.user_tokens DROP CONSTRAINT IF EXISTS user_tokens_user_id_fkey;
ALTER TABLE public.user_tokens
  ADD CONSTRAINT user_tokens_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS on user_tokens (in case not already enabled)
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read own tokens" ON public.user_tokens;
DROP POLICY IF EXISTS "Service role can manage tokens" ON public.user_tokens;

-- User can only read their own token
CREATE POLICY "Users can read own tokens" ON public.user_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update/delete tokens
CREATE POLICY "Service role can manage tokens" ON public.user_tokens
  FOR ALL USING (auth.role() = 'service_role');
