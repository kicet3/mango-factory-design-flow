-- Fix RLS policies for generation history visibility
-- Add authenticated user SELECT policies to mapping tables to avoid recursive RLS checks

-- Drop existing policy if exists, then create new one for generation_attrs_teaching_style_map
DROP POLICY IF EXISTS "Authenticated users can read generation_attrs_teaching_style_map"
ON public.generation_attrs_teaching_style_map;

CREATE POLICY "Authenticated users can read generation_attrs_teaching_style_map"
ON public.generation_attrs_teaching_style_map
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated'::text);

-- Drop existing policy if exists, then create new one for generation_attrs_cowork_type_map
DROP POLICY IF EXISTS "Authenticated users can read generation_attrs_cowork_type_map"
ON public.generation_attrs_cowork_type_map;

CREATE POLICY "Authenticated users can read generation_attrs_cowork_type_map"
ON public.generation_attrs_cowork_type_map
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated'::text);