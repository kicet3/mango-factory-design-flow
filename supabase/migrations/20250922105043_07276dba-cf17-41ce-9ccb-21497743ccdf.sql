-- Add can_share column to generation_responses table
ALTER TABLE public.generation_responses 
ADD COLUMN IF NOT EXISTS can_share BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for shared materials
CREATE INDEX IF NOT EXISTS idx_gr_can_share ON public.generation_responses (can_share, generation_response_id);

-- Update RLS policy to allow anonymous users to read shared generation responses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'generation_responses'
      AND policyname = 'public_read_shared_generation_responses'
  ) THEN
    CREATE POLICY "public_read_shared_generation_responses"
    ON public.generation_responses
    AS PERMISSIVE FOR SELECT
    TO anon
    USING (can_share = TRUE);
  END IF;
END;
$$;