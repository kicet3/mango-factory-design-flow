-- video_recommendations 테이블 생성
CREATE TABLE IF NOT EXISTS public.video_recommendations (
  video_recommendation_id SERIAL PRIMARY KEY,
  generation_response_id bigint NOT NULL,
  video_name VARCHAR(128) NOT NULL,
  video_url VARCHAR(256) NOT NULL,
  video_desc TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_vr_generation_response FOREIGN KEY (generation_response_id)
    REFERENCES public.generation_responses (generation_response_id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_vr_response 
  ON public.video_recommendations (generation_response_id);

-- RLS 활성화
ALTER TABLE public.video_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성 (사용자는 자신의 generation_response에 연결된 추천만 볼 수 있음)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'video_recommendations'
      AND policyname = 'video_recommendations_select_own'
  ) THEN
    CREATE POLICY "video_recommendations_select_own"
    ON public.video_recommendations
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.generation_responses gr 
        WHERE gr.generation_response_id = video_recommendations.generation_response_id 
        AND gr.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'video_recommendations'
      AND policyname = 'video_recommendations_admin_all'
  ) THEN
    CREATE POLICY "video_recommendations_admin_all"
    ON public.video_recommendations
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (is_admin_user())
    WITH CHECK (is_admin_user());
  END IF;
END;
$$;