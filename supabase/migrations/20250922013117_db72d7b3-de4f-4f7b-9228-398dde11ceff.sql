-- Add version management columns to generation_responses
ALTER TABLE public.generation_responses 
ADD COLUMN IF NOT EXISTS root_response_id BIGINT,
ADD COLUMN IF NOT EXISTS version_no SMALLINT NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_final BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS params_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Update existing records to set root_response_id to self-reference
UPDATE public.generation_responses 
SET root_response_id = generation_response_id
WHERE root_response_id IS NULL;

-- Make root_response_id NOT NULL after setting values
ALTER TABLE public.generation_responses 
ALTER COLUMN root_response_id SET NOT NULL;

-- Add constraints (guarded)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'unique_root_version'
      AND n.nspname = 'public'
      AND t.relname = 'generation_responses'
  ) THEN
    ALTER TABLE public.generation_responses 
    ADD CONSTRAINT unique_root_version UNIQUE (root_response_id, version_no);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'check_version_range'
      AND n.nspname = 'public'
      AND t.relname = 'generation_responses'
  ) THEN
    ALTER TABLE public.generation_responses 
    ADD CONSTRAINT check_version_range CHECK (version_no BETWEEN 1 AND 4);
  END IF;
END;
$$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_generation_responses_root_version ON public.generation_responses(root_response_id, version_no);

-- Remove the retry_count column from generation_attrs as it's no longer needed
ALTER TABLE public.generation_attrs DROP COLUMN IF EXISTS retry_count;