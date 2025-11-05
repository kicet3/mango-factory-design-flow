-- Add course_type_id column to format_selection_attrs table
ALTER TABLE public.format_selection_attrs 
ADD COLUMN IF NOT EXISTS course_type_id BIGINT;


-- Add course_type_id column to generation_attrs table  
ALTER TABLE public.generation_attrs 
ADD COLUMN IF NOT EXISTS course_type_id BIGINT;

-- Backfill existing data in format_selection_attrs
UPDATE public.format_selection_attrs fsa
SET course_type_id = c.course_type_id
FROM public.courses c
WHERE fsa.course_material_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.course_materials cm 
    WHERE cm.course_material_id = fsa.course_material_id 
    AND cm.raw_course_material_id IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM public.raw_course_materials rcm 
    WHERE rcm.raw_course_material_id = (
      SELECT course_materials.raw_course_material_id 
      FROM public.course_materials 
      WHERE course_materials.course_material_id = fsa.course_material_id
    )
    AND rcm.course_id = c.course_id
  )
  AND fsa.course_type_id IS NULL;

-- Backfill existing data in generation_attrs
UPDATE public.generation_attrs ga
SET course_type_id = c.course_type_id  
FROM public.courses c
WHERE ga.course_material_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.course_materials cm 
    WHERE cm.course_material_id = ga.course_material_id 
    AND cm.raw_course_material_id IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM public.raw_course_materials rcm 
    WHERE rcm.raw_course_material_id = (
      SELECT course_materials.raw_course_material_id 
      FROM public.course_materials 
      WHERE course_materials.course_material_id = ga.course_material_id
    )
    AND rcm.course_id = c.course_id
  )
  AND ga.course_type_id IS NULL;

-- Make course_type_id NOT NULL after backfill
ALTER TABLE public.format_selection_attrs 
ALTER COLUMN course_type_id SET NOT NULL;

ALTER TABLE public.generation_attrs 
ALTER COLUMN course_type_id SET NOT NULL;

-- Add foreign key constraints (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_format_selection_attrs_course_type'
  ) THEN
    ALTER TABLE public.format_selection_attrs 
    ADD CONSTRAINT fk_format_selection_attrs_course_type 
    FOREIGN KEY (course_type_id) REFERENCES public.course_types(course_type_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_generation_attrs_course_type'
  ) THEN
    ALTER TABLE public.generation_attrs 
    ADD CONSTRAINT fk_generation_attrs_course_type 
    FOREIGN KEY (course_type_id) REFERENCES public.course_types(course_type_id);
  END IF;
END;
$$;
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fsa_user_created_at 
ON public.format_selection_attrs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fsa_course_type 
ON public.format_selection_attrs (course_type_id);

CREATE INDEX IF NOT EXISTS idx_ga_user_created_at 
ON public.generation_attrs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ga_course_type 
ON public.generation_attrs (course_type_id);

-- Make legacy columns nullable for backward compatibility
ALTER TABLE public.format_selection_attrs 
ALTER COLUMN course_material_id DROP NOT NULL;

ALTER TABLE public.generation_attrs 
ALTER COLUMN course_material_id DROP NOT NULL;