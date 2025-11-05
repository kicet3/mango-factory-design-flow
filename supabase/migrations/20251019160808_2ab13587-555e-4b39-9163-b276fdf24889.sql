-- Add generation_format_section_structure_v2 column to generation_formats table
ALTER TABLE public.generation_formats
ADD COLUMN IF NOT EXISTS generation_format_section_structure_v2 jsonb[] DEFAULT NULL;