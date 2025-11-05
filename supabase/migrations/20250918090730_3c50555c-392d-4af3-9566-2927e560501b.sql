-- Create difficulties table (idempotent)
CREATE TABLE IF NOT EXISTS public.difficulties (
  difficulty_id SERIAL PRIMARY KEY,
  difficulty_name VARCHAR(32) UNIQUE NOT NULL,
  difficulty_desc TEXT NULL
);

-- Add difficulty and duration columns to format_selection_attrs (only if table exists)
DO $$
BEGIN
  IF to_regclass('public.format_selection_attrs') IS NOT NULL THEN
    ALTER TABLE public.format_selection_attrs
      ADD COLUMN IF NOT EXISTS difficulty_id INT NULL,
      ADD COLUMN IF NOT EXISTS expected_duration_min INT NULL;
  END IF;
END
$$;

-- Add difficulty and duration columns to generation_attrs (only if table exists)
DO $$
BEGIN
  IF to_regclass('public.generation_attrs') IS NOT NULL THEN
    ALTER TABLE public.generation_attrs
      ADD COLUMN IF NOT EXISTS difficulty_id INT NULL,
      ADD COLUMN IF NOT EXISTS expected_duration_min INT NULL;
  END IF;
END
$$;

-- Add foreign key constraint for format_selection_attrs.difficulty_id (idempotent)
DO $$
BEGIN
  IF to_regclass('public.format_selection_attrs') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'format_selection_attrs'
         AND column_name = 'difficulty_id'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE c.conname = 'fk_format_selection_attrs_difficulty'
         AND n.nspname = 'public'
     )
  THEN
    ALTER TABLE public.format_selection_attrs
      ADD CONSTRAINT fk_format_selection_attrs_difficulty
      FOREIGN KEY (difficulty_id)
      REFERENCES public.difficulties(difficulty_id)
      ON DELETE SET NULL;
  END IF;
END
$$;

-- Add foreign key constraint for generation_attrs.difficulty_id (idempotent)
DO $$
BEGIN
  IF to_regclass('public.generation_attrs') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'generation_attrs'
         AND column_name = 'difficulty_id'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE c.conname = 'fk_generation_attrs_difficulty'
         AND n.nspname = 'public'
     )
  THEN
    ALTER TABLE public.generation_attrs
      ADD CONSTRAINT fk_generation_attrs_difficulty
      FOREIGN KEY (difficulty_id)
      REFERENCES public.difficulties(difficulty_id)
      ON DELETE SET NULL;
  END IF;
END
$$;

-- Create indexes for performance (only if table exists; idempotent by name)
DO $$
BEGIN
  IF to_regclass('public.format_selection_attrs') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_fsa_difficulty ON public.format_selection_attrs(difficulty_id);
    CREATE INDEX IF NOT EXISTS idx_fsa_duration ON public.format_selection_attrs(expected_duration_min);
  END IF;

  IF to_regclass('public.generation_attrs') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_ga_difficulty ON public.generation_attrs(difficulty_id);
    CREATE INDEX IF NOT EXISTS idx_ga_duration ON public.generation_attrs(expected_duration_min);
  END IF;
END
$$;

-- Enable RLS on difficulties table (idempotent)
DO $$
BEGIN
  IF to_regclass('public.difficulties') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'difficulties'
        AND c.relrowsecurity = true
    ) THEN
      ALTER TABLE public.difficulties ENABLE ROW LEVEL SECURITY;
    END IF;
  END IF;
END
$$;

-- Create RLS policy for difficulties (read-only for authenticated users) - idempotent
DO $$
BEGIN
  IF to_regclass('public.difficulties') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = 'difficulties'
        AND p.policyname = 'Authenticated users can read difficulties'
    ) THEN
      CREATE POLICY "Authenticated users can read difficulties" ON public.difficulties
      FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
  END IF;
END
$$;

-- Create RLS policy for admin management of difficulties - idempotent
DO $$
BEGIN
  IF to_regclass('public.difficulties') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = 'difficulties'
        AND p.policyname = 'Admins can manage difficulties'
    ) THEN
      CREATE POLICY "Admins can manage difficulties" ON public.difficulties
      FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
    END IF;
  END IF;
END
$$;