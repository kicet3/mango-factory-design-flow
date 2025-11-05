-- Add RLS policies for generation_response_download_events
DO $$
BEGIN
  IF to_regclass('public.generation_response_download_events') IS NOT NULL THEN
    -- Drop existing policies if they exist
    EXECUTE 'DROP POLICY IF EXISTS "Public can count downloads for shared responses" ON public.generation_response_download_events';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can record downloads" ON public.generation_response_download_events';

    -- Create policies if not already present
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'generation_response_download_events'
        AND policyname = 'Public can count downloads for shared responses'
    ) AND to_regclass('public.generation_responses') IS NOT NULL THEN
      EXECUTE $SQL$
      CREATE POLICY "Public can count downloads for shared responses"
      ON public.generation_response_download_events
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.generation_responses gr
          WHERE gr.generation_response_id = generation_response_download_events.generation_response_id
          AND gr.can_share = true
        )
      );
      $SQL$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'generation_response_download_events'
        AND policyname = 'Authenticated users can record downloads'
    ) THEN
      EXECUTE $SQL$
      CREATE POLICY "Authenticated users can record downloads"
      ON public.generation_response_download_events
      FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');
      $SQL$;
    END IF;
  END IF;
END
$$;