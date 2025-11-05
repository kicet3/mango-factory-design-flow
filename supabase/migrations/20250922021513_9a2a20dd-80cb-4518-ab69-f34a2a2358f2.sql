-- 1) raw_generation_format_course_type_map 테이블 생성
CREATE TABLE IF NOT EXISTS public.raw_generation_format_course_type_map (
  raw_generation_format_id bigint NOT NULL,
  course_type_id bigint NOT NULL,
  CONSTRAINT pk_raw_generation_format_course_type_map PRIMARY KEY (raw_generation_format_id, course_type_id),
  CONSTRAINT fk_rgfctm_rgf FOREIGN KEY (raw_generation_format_id)
    REFERENCES public.raw_generation_formats (raw_generation_format_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_rgfctm_ct FOREIGN KEY (course_type_id)
    REFERENCES public.course_types (course_type_id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

-- 2) 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_rgfctm_ct
  ON public.raw_generation_format_course_type_map (course_type_id, raw_generation_format_id);

-- 3) RLS 활성화
ALTER TABLE public.raw_generation_format_course_type_map ENABLE ROW LEVEL SECURITY;

-- 4) RLS 정책 생성 (관리자 전용)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'raw_generation_format_course_type_map'
      AND policyname = 'rgfctm_admin_all'
  ) THEN
    CREATE POLICY "rgfctm_admin_all"
    ON public.raw_generation_format_course_type_map
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (is_admin_user())
    WITH CHECK (is_admin_user());
  END IF;
END;
$$;