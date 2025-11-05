-- Update default values for created_at and updated_at columns to use explicit UTC timezone
-- This only affects newly inserted rows, existing data remains unchanged
-- Only updating columns that exist in the database

DO $$
BEGIN
  -- admin_users
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_users' AND column_name = 'created_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.admin_users ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_users' AND column_name = 'updated_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.admin_users ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;

  -- course_materials
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'course_materials' AND column_name = 'created_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.course_materials ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'course_materials' AND column_name = 'updated_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.course_materials ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;

  -- format_selection_attrs
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'format_selection_attrs' AND column_name = 'created_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.format_selection_attrs ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;

  -- format_selection_request_messages
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'format_selection_request_messages' AND column_name = 'created_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.format_selection_request_messages ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;

  -- format_selection_responses
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'format_selection_responses' AND column_name = 'created_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.format_selection_responses ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'format_selection_responses' AND column_name = 'updated_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.format_selection_responses ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;

  -- generation_attrs
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'generation_attrs' AND column_name = 'created_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.generation_attrs ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;

  -- generation_formats
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'generation_formats' AND column_name = 'created_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.generation_formats ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'generation_formats' AND column_name = 'updated_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.generation_formats ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;

  -- generation_requests
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'generation_requests' AND column_name = 'request_time'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.generation_requests ALTER COLUMN request_time SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;

  -- generation_response_comments
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'generation_response_comments' AND column_name = 'created_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.generation_response_comments ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'generation_response_comments' AND column_name = 'updated_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.generation_response_comments ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;

  -- generation_response_download_events
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'generation_response_download_events' AND column_name = 'created_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.generation_response_download_events ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;

  -- generation_response_likes
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'generation_response_likes' AND column_name = 'created_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.generation_response_likes ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;

  -- generation_responses
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'generation_responses' AND column_name = 'created_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.generation_responses ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'generation_responses' AND column_name = 'updated_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.generation_responses ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;

  -- help_requests
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'help_requests' AND column_name = 'created_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.help_requests ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'help_requests' AND column_name = 'updated_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.help_requests ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;

  -- image_contents
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'image_contents' AND column_name = 'created_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.image_contents ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'image_contents' AND column_name = 'updated_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.image_contents ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;

  -- payment_histories
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_histories' AND column_name = 'created_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.payment_histories ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_histories' AND column_name = 'updated_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.payment_histories ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;

  -- profiles
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.profiles ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    EXECUTE $SQL$ALTER TABLE public.profiles ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now())$SQL$;
  END IF;
END
$$;