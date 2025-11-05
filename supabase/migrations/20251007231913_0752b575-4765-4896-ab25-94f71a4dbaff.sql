-- Ensure policy is managed idempotently and only when dependent tables exist
DO $$
BEGIN
  IF to_regclass('public.raw_generation_format_likes') IS NOT NULL THEN
    -- Drop existing policy if present
    EXECUTE 'DROP POLICY IF EXISTS "Public can count likes for shared materials" ON public.raw_generation_format_likes';

    -- Create policy only if it does not already exist and dependency exists
    IF to_regclass('public.raw_generation_formats') IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'raw_generation_format_likes'
        AND policyname = 'Public can count likes for shared materials'
    ) THEN
      EXECUTE $SQL$
      CREATE POLICY "Public can count likes for shared materials"
      ON public.raw_generation_format_likes
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.raw_generation_formats rgf
          WHERE rgf.raw_generation_format_id = raw_generation_format_likes.raw_generation_format_id
          AND rgf.can_share = true
        )
      );
      $SQL$;
    END IF;
  END IF;
END
$$;