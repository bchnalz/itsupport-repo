-- Add uploaded_by_email to files table
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS uploaded_by_email TEXT;
