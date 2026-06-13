-- App settings table for storing refresh tokens
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Only service role can read/write (used by edge functions)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage settings" ON public.app_settings
  FOR ALL USING (true);
