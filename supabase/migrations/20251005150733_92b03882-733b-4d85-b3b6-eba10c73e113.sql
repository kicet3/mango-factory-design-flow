-- Add use_v2 column to generation_attrs table
ALTER TABLE public.generation_attrs 
ADD COLUMN IF NOT EXISTS use_v2 boolean DEFAULT false;