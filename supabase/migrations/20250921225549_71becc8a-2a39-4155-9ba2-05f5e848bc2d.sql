-- Add retry column to generation_attrs table
ALTER TABLE public.generation_attrs 
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;