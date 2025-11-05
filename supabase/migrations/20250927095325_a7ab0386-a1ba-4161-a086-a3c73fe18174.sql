-- Gallery Zone Core Database Schema

-- 1. Add likes_count columns to existing tables
ALTER TABLE public.generation_responses 
ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.raw_generation_formats
ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS can_share BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gallery_desc TEXT,
ADD COLUMN IF NOT EXISTS file_path TEXT;

-- 2. Create likes mapping tables
CREATE TABLE IF NOT EXISTS public.generation_response_likes (
  generation_response_id BIGINT NOT NULL REFERENCES public.generation_responses(generation_response_id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (generation_response_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.raw_generation_format_likes (
  raw_generation_format_id BIGINT NOT NULL REFERENCES public.raw_generation_formats(raw_generation_format_id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (raw_generation_format_id, user_id)
);

-- 3. Create download event tracking tables
CREATE TABLE IF NOT EXISTS public.generation_response_download_events (
  id BIGSERIAL PRIMARY KEY,
  generation_response_id BIGINT NOT NULL REFERENCES public.generation_responses(generation_response_id) ON DELETE CASCADE,
  actor_user_id UUID NULL,
  actor_ip INET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.raw_generation_format_download_events (
  id BIGSERIAL PRIMARY KEY,
  raw_generation_format_id BIGINT NOT NULL REFERENCES public.raw_generation_formats(raw_generation_format_id) ON DELETE CASCADE,
  actor_user_id UUID NULL,
  actor_ip INET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create download count views
CREATE OR REPLACE VIEW public.v_generation_response_downloads AS
SELECT generation_response_id, COUNT(*)::INT AS downloads_count
FROM public.generation_response_download_events
GROUP BY generation_response_id;

CREATE OR REPLACE VIEW public.v_raw_generation_format_downloads AS
SELECT raw_generation_format_id, COUNT(*)::INT AS downloads_count
FROM public.raw_generation_format_download_events
GROUP BY raw_generation_format_id;

-- 5. Create tags system
CREATE TABLE IF NOT EXISTS public.tags (
  tag_id SERIAL PRIMARY KEY,
  tag_name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.raw_generation_format_tag_map (
  raw_generation_format_id BIGINT NOT NULL REFERENCES public.raw_generation_formats(raw_generation_format_id) ON DELETE CASCADE,
  tag_id INT NOT NULL REFERENCES public.tags(tag_id) ON DELETE CASCADE,
  PRIMARY KEY (raw_generation_format_id, tag_id)
);

-- 6. Create comment tables
CREATE TABLE IF NOT EXISTS public.generation_response_comments (
  comment_id BIGSERIAL PRIMARY KEY,
  generation_response_id BIGINT NOT NULL REFERENCES public.generation_responses(generation_response_id) ON DELETE CASCADE,
  teacher_info_id BIGINT NOT NULL REFERENCES public.teacher_info(teacher_info_id) ON DELETE RESTRICT,
  parent_comment_id BIGINT NULL REFERENCES public.generation_response_comments(comment_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.raw_generation_format_comments (
  comment_id BIGSERIAL PRIMARY KEY,
  raw_generation_format_id BIGINT NOT NULL REFERENCES public.raw_generation_formats(raw_generation_format_id) ON DELETE CASCADE,
  teacher_info_id BIGINT NOT NULL REFERENCES public.teacher_info(teacher_info_id) ON DELETE RESTRICT,
  parent_comment_id BIGINT NULL REFERENCES public.raw_generation_format_comments(comment_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Enable RLS on new tables
ALTER TABLE public.generation_response_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_generation_format_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_response_download_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_generation_format_download_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_generation_format_tag_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_response_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_generation_format_comments ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for public access to shared content
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'generation_responses'
      AND policyname = 'Public can read shared generation responses'
  ) THEN
    CREATE POLICY "Public can read shared generation responses" 
    ON public.generation_responses 
    FOR SELECT 
    USING (can_share = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'raw_generation_formats'
      AND policyname = 'Public can read shared raw generation formats'
  ) THEN
    CREATE POLICY "Public can read shared raw generation formats" 
    ON public.raw_generation_formats 
    FOR SELECT 
    USING (can_share = true);
  END IF;
END;
$$;

-- 9. Create basic RLS policies for likes (users can manage their own likes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'generation_response_likes'
      AND policyname = 'Users can manage their own generation response likes'
  ) THEN
    CREATE POLICY "Users can manage their own generation response likes" 
    ON public.generation_response_likes 
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'raw_generation_format_likes'
      AND policyname = 'Users can manage their own raw format likes'
  ) THEN
    CREATE POLICY "Users can manage their own raw format likes" 
    ON public.raw_generation_format_likes 
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

-- 10. Create policies for tags (read-only for users)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tags'
      AND policyname = 'All users can read tags'
  ) THEN
    CREATE POLICY "All users can read tags" 
    ON public.tags 
    FOR SELECT 
    USING (auth.role() = 'authenticated'::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'raw_generation_format_tag_map'
      AND policyname = 'All users can read tag mappings'
  ) THEN
    CREATE POLICY "All users can read tag mappings" 
    ON public.raw_generation_format_tag_map 
    FOR SELECT 
    USING (auth.role() = 'authenticated'::text);
  END IF;
END;
$$;

-- 11. Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_generation_response_comments_updated_at'
  ) THEN
    CREATE TRIGGER update_generation_response_comments_updated_at
      BEFORE UPDATE ON public.generation_response_comments
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_raw_generation_format_comments_updated_at'
  ) THEN
    CREATE TRIGGER update_raw_generation_format_comments_updated_at
      BEFORE UPDATE ON public.raw_generation_format_comments
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;