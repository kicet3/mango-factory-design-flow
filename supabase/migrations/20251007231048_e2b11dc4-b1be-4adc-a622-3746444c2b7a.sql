-- Add RLS policy to allow reading interaction counts for shared materials
DO $$
BEGIN
  IF to_regclass('public.user_material_interactions') IS NOT NULL
     AND to_regclass('public.raw_generation_formats') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'user_material_interactions'
         AND policyname = 'Public can count interactions for shared materials'
     ) THEN
    EXECUTE $SQL$
    CREATE POLICY "Public can count interactions for shared materials"
    ON public.user_material_interactions
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.raw_generation_formats rgf
        WHERE rgf.raw_generation_format_id = user_material_interactions.raw_generation_format_id
        AND rgf.can_share = true
      )
    );
    $SQL$;
  END IF;
END
$$;