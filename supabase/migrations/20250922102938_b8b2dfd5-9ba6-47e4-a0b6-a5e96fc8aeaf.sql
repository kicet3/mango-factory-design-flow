-- Create interaction_types table
CREATE TABLE IF NOT EXISTS public.interaction_types (
  interaction_type_id SERIAL PRIMARY KEY,
  interaction_type_name VARCHAR(64) UNIQUE NOT NULL,
  interaction_type_desc TEXT NULL
);

-- Create user_material_interactions table
CREATE TABLE IF NOT EXISTS public.user_material_interactions (
  interaction_id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  raw_generation_format_id BIGINT NOT NULL,
  interaction_type_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_umi_user ON public.user_material_interactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_umi_format ON public.user_material_interactions (raw_generation_format_id);

-- Enable RLS
ALTER TABLE public.interaction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_material_interactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for interaction_types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interaction_types'
      AND policyname = 'All authenticated users can read interaction_types'
  ) THEN
    CREATE POLICY "All authenticated users can read interaction_types"
        ON public.interaction_types
        FOR SELECT
        USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interaction_types'
      AND policyname = 'Admins can manage interaction_types'
  ) THEN
    CREATE POLICY "Admins can manage interaction_types"
        ON public.interaction_types
        FOR ALL
        USING (is_admin_user())
        WITH CHECK (is_admin_user());
  END IF;
END;
$$;

-- RLS policies for user_material_interactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_material_interactions'
      AND policyname = 'Users can view their own interactions'
  ) THEN
    CREATE POLICY "Users can view their own interactions"
        ON public.user_material_interactions
        FOR SELECT
        USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_material_interactions'
      AND policyname = 'Users can create their own interactions'
  ) THEN
    CREATE POLICY "Users can create their own interactions"
        ON public.user_material_interactions
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_material_interactions'
      AND policyname = 'Admins can manage all interactions'
  ) THEN
    CREATE POLICY "Admins can manage all interactions"
        ON public.user_material_interactions
        FOR ALL
        USING (is_admin_user())
        WITH CHECK (is_admin_user());
  END IF;
END;
$$;

-- Insert default interaction types
INSERT INTO public.interaction_types (interaction_type_name, interaction_type_desc) VALUES
('view', '자료 조회'),
('generate', '자료 생성'),
('download', '자료 다운로드')
ON CONFLICT (interaction_type_name) DO NOTHING;

-- Add foreign key constraints (guarded)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'fk_umi_interaction_type'
      AND n.nspname = 'public'
      AND t.relname = 'user_material_interactions'
  ) THEN
    ALTER TABLE public.user_material_interactions
        ADD CONSTRAINT fk_umi_interaction_type 
        FOREIGN KEY (interaction_type_id) 
        REFERENCES public.interaction_types(interaction_type_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'fk_umi_raw_format'
      AND n.nspname = 'public'
      AND t.relname = 'user_material_interactions'
  ) THEN
    ALTER TABLE public.user_material_interactions
        ADD CONSTRAINT fk_umi_raw_format 
        FOREIGN KEY (raw_generation_format_id) 
        REFERENCES public.raw_generation_formats(raw_generation_format_id);
  END IF;
END;
$$;