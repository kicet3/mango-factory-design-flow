-- Add policy to allow reading generation_attrs for shared generation responses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'generation_attrs'
      AND policyname = 'Public can read generation_attrs for shared responses'
  ) THEN
    CREATE POLICY "Public can read generation_attrs for shared responses"
    ON public.generation_attrs
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.generation_responses gr
        WHERE gr.generation_attrs_id = generation_attrs.generation_attrs_id
          AND gr.can_share = true
      )
    );
  END IF;
END;
$$;