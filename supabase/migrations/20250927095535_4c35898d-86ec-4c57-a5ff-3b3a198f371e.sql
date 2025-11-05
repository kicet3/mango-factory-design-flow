-- Fix security issues from previous migration

-- 1. Fix security definer views by recreating as regular views
DROP VIEW IF EXISTS public.v_generation_response_downloads;
DROP VIEW IF EXISTS public.v_raw_generation_format_downloads;

CREATE VIEW public.v_generation_response_downloads AS
SELECT generation_response_id, COUNT(*)::INT AS downloads_count
FROM public.generation_response_download_events
GROUP BY generation_response_id;

CREATE VIEW public.v_raw_generation_format_downloads AS
SELECT raw_generation_format_id, COUNT(*)::INT AS downloads_count
FROM public.raw_generation_format_download_events
GROUP BY raw_generation_format_id;

-- 2. Add missing RLS policies for download events tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'generation_response_download_events'
      AND policyname = 'Admins can manage generation response download events'
  ) THEN
    CREATE POLICY "Admins can manage generation response download events" 
    ON public.generation_response_download_events 
    FOR ALL 
    USING (is_admin_user())
    WITH CHECK (is_admin_user());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'raw_generation_format_download_events'
      AND policyname = 'Admins can manage raw format download events'
  ) THEN
    CREATE POLICY "Admins can manage raw format download events" 
    ON public.raw_generation_format_download_events 
    FOR ALL 
    USING (is_admin_user())
    WITH CHECK (is_admin_user());
  END IF;
END;
$$;

-- 3. Add RLS policies for comment tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'generation_response_comments'
      AND policyname = 'Users can read comments on shared content'
  ) THEN
    CREATE POLICY "Users can read comments on shared content" 
    ON public.generation_response_comments 
    FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM public.generation_responses gr 
        WHERE gr.generation_response_id = generation_response_comments.generation_response_id 
        AND (gr.can_share = true OR gr.user_id = auth.uid())
      )
      OR is_admin_user()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'raw_generation_format_comments'
      AND policyname = 'Users can read comments on shared formats'
  ) THEN
    CREATE POLICY "Users can read comments on shared formats" 
    ON public.raw_generation_format_comments 
    FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM public.raw_generation_formats rgf 
        WHERE rgf.raw_generation_format_id = raw_generation_format_comments.raw_generation_format_id 
        AND (rgf.can_share = true OR rgf.uploaded_user_id = auth.uid())
      )
      OR is_admin_user()
    );
  END IF;
END;
$$;

-- 4. Allow authenticated users to insert comments (will be controlled by edge functions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'generation_response_comments'
      AND policyname = 'Authenticated users can create comments on generation responses'
  ) THEN
    CREATE POLICY "Authenticated users can create comments on generation responses" 
    ON public.generation_response_comments 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated'::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'raw_generation_format_comments'
      AND policyname = 'Authenticated users can create comments on formats'
  ) THEN
    CREATE POLICY "Authenticated users can create comments on formats" 
    ON public.raw_generation_format_comments 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated'::text);
  END IF;
END;
$$;

-- 5. Allow users to update/delete their own comments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'generation_response_comments'
      AND policyname = 'Users can manage their own generation response comments'
  ) THEN
    CREATE POLICY "Users can manage their own generation response comments" 
    ON public.generation_response_comments 
    FOR UPDATE 
    USING (
      EXISTS (
        SELECT 1 FROM public.teacher_info ti 
        WHERE ti.teacher_info_id = generation_response_comments.teacher_info_id 
        AND ti.user_id = auth.uid()
      )
      OR is_admin_user()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'generation_response_comments'
      AND policyname = 'Users can delete their own generation response comments'
  ) THEN
    CREATE POLICY "Users can delete their own generation response comments" 
    ON public.generation_response_comments 
    FOR DELETE 
    USING (
      EXISTS (
        SELECT 1 FROM public.teacher_info ti 
        WHERE ti.teacher_info_id = generation_response_comments.teacher_info_id 
        AND ti.user_id = auth.uid()
      )
      OR is_admin_user()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'raw_generation_format_comments'
      AND policyname = 'Users can manage their own format comments'
  ) THEN
    CREATE POLICY "Users can manage their own format comments" 
    ON public.raw_generation_format_comments 
    FOR UPDATE 
    USING (
      EXISTS (
        SELECT 1 FROM public.teacher_info ti 
        WHERE ti.teacher_info_id = raw_generation_format_comments.teacher_info_id 
        AND ti.user_id = auth.uid()
      )
      OR is_admin_user()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'raw_generation_format_comments'
      AND policyname = 'Users can delete their own format comments'
  ) THEN
    CREATE POLICY "Users can delete their own format comments" 
    ON public.raw_generation_format_comments 
    FOR DELETE 
    USING (
      EXISTS (
        SELECT 1 FROM public.teacher_info ti 
        WHERE ti.teacher_info_id = raw_generation_format_comments.teacher_info_id 
        AND ti.user_id = auth.uid()
      )
      OR is_admin_user()
    );
  END IF;
END;
$$;