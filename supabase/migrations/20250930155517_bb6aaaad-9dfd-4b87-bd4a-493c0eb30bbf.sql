-- Drop and recreate policy for generation_attrs to support both authenticated and anonymous users
DROP POLICY IF EXISTS "Public can read generation_attrs for shared responses" ON public.generation_attrs;

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

-- Add public read access for course_types (shared content)
DROP POLICY IF EXISTS "Public can read course_types for shared content" ON public.course_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_types'
      AND policyname = 'Public can read course_types for shared content'
  ) THEN
    CREATE POLICY "Public can read course_types for shared content"
    ON public.course_types
    FOR SELECT
    USING (true);
  END IF;
END;
$$;

-- Add public read access for difficulties (shared content)
DROP POLICY IF EXISTS "Public can read difficulties for shared content" ON public.difficulties;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'difficulties'
      AND policyname = 'Public can read difficulties for shared content'
  ) THEN
    CREATE POLICY "Public can read difficulties for shared content"
    ON public.difficulties
    FOR SELECT
    USING (true);
  END IF;
END;
$$;

-- Add public read access for course_materials (shared content)
DROP POLICY IF EXISTS "Public can read course_materials for shared content" ON public.course_materials;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_materials'
      AND policyname = 'Public can read course_materials for shared content'
  ) THEN
    CREATE POLICY "Public can read course_materials for shared content"
    ON public.course_materials
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.generation_attrs ga
        JOIN public.generation_responses gr ON gr.generation_attrs_id = ga.generation_attrs_id
        WHERE ga.course_material_id = course_materials.course_material_id
          AND gr.can_share = true
      )
    );
  END IF;
END;
$$;

-- Add public read access for raw_course_materials (shared content)
DROP POLICY IF EXISTS "Public can read raw_course_materials for shared content" ON public.raw_course_materials;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'raw_course_materials'
      AND policyname = 'Public can read raw_course_materials for shared content'
  ) THEN
    CREATE POLICY "Public can read raw_course_materials for shared content"
    ON public.raw_course_materials
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.course_materials cm
        JOIN public.generation_attrs ga ON ga.course_material_id = cm.course_material_id
        JOIN public.generation_responses gr ON gr.generation_attrs_id = ga.generation_attrs_id
        WHERE cm.raw_course_material_id = raw_course_materials.raw_course_material_id
          AND gr.can_share = true
      )
    );
  END IF;
END;
$$;

-- Add public read access for courses (shared content)
DROP POLICY IF EXISTS "Public can read courses for shared content" ON public.courses;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'courses'
      AND policyname = 'Public can read courses for shared content'
  ) THEN
    CREATE POLICY "Public can read courses for shared content"
    ON public.courses
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.raw_course_materials rcm
        JOIN public.course_materials cm ON cm.raw_course_material_id = rcm.raw_course_material_id
        JOIN public.generation_attrs ga ON ga.course_material_id = cm.course_material_id
        JOIN public.generation_responses gr ON gr.generation_attrs_id = ga.generation_attrs_id
        WHERE rcm.course_id = courses.course_id
          AND gr.can_share = true
      )
    );
  END IF;
END;
$$;

-- Add public read access for course_semesters (shared content)
DROP POLICY IF EXISTS "Public can read course_semesters for shared content" ON public.course_semesters;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_semesters'
      AND policyname = 'Public can read course_semesters for shared content'
  ) THEN
    CREATE POLICY "Public can read course_semesters for shared content"
    ON public.course_semesters
    FOR SELECT
    USING (true);
  END IF;
END;
$$;

-- Add public read access for course_material_publishers (shared content)
DROP POLICY IF EXISTS "Public can read course_material_publishers for shared content" ON public.course_material_publishers;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_material_publishers'
      AND policyname = 'Public can read course_material_publishers for shared content'
  ) THEN
    CREATE POLICY "Public can read course_material_publishers for shared content"
    ON public.course_material_publishers
    FOR SELECT
    USING (true);
  END IF;
END;
$$;