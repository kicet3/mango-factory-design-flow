-- Enable RLS on raw_generation_format_comments if not already enabled
ALTER TABLE IF EXISTS public.raw_generation_format_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them
DROP POLICY IF EXISTS "Users can read comments on shared content" ON public.raw_generation_format_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments on generation responses" ON public.raw_generation_format_comments;
DROP POLICY IF EXISTS "Users can manage their own generation response comments" ON public.raw_generation_format_comments;
DROP POLICY IF EXISTS "Users can delete their own generation response comments" ON public.raw_generation_format_comments;

-- Policy for reading comments (authenticated users can read comments on materials they can access)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'raw_generation_format_comments'
      AND policyname = 'Users can read comments on raw generation formats'
  ) THEN
    CREATE POLICY "Users can read comments on raw generation formats"
    ON public.raw_generation_format_comments
    FOR SELECT
    USING (
      auth.role() = 'authenticated'
    );
  END IF;
END;
$$;

-- Policy for creating comments (authenticated users can create comments)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'raw_generation_format_comments'
      AND policyname = 'Authenticated users can create comments on raw generation formats'
  ) THEN
    CREATE POLICY "Authenticated users can create comments on raw generation formats"
    ON public.raw_generation_format_comments
    FOR INSERT
    WITH CHECK (
      auth.role() = 'authenticated' AND
      EXISTS (
        SELECT 1 FROM public.teacher_info ti
        WHERE ti.teacher_info_id = raw_generation_format_comments.teacher_info_id
          AND ti.user_id = auth.uid()
      )
    );
  END IF;
END;
$$;

-- Policy for updating own comments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'raw_generation_format_comments'
      AND policyname = 'Users can update their own comments on raw generation formats'
  ) THEN
    CREATE POLICY "Users can update their own comments on raw generation formats"
    ON public.raw_generation_format_comments
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.teacher_info ti
        WHERE ti.teacher_info_id = raw_generation_format_comments.teacher_info_id
          AND ti.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.teacher_info ti
        WHERE ti.teacher_info_id = raw_generation_format_comments.teacher_info_id
          AND ti.user_id = auth.uid()
      )
    );
  END IF;
END;
$$;

-- Policy for deleting own comments (soft delete by setting is_deleted = true)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'raw_generation_format_comments'
      AND policyname = 'Users can delete their own comments on raw generation formats'
  ) THEN
    CREATE POLICY "Users can delete their own comments on raw generation formats"
    ON public.raw_generation_format_comments
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.teacher_info ti
        WHERE ti.teacher_info_id = raw_generation_format_comments.teacher_info_id
          AND ti.user_id = auth.uid()
      ) OR is_admin_user()
    );
  END IF;
END;
$$;