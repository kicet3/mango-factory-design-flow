-- Allow null values for root_response_id in generation_responses table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'generation_responses'
      AND column_name = 'root_response_id'
  ) THEN
    ALTER TABLE public.generation_responses 
    ALTER COLUMN root_response_id DROP NOT NULL;
  END IF;
END;
$$;