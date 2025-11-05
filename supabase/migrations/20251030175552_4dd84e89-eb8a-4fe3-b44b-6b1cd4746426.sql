-- Update foreign key constraint for course_materials to CASCADE delete
-- when raw_course_materials are deleted
-- This migration is idempotent and can be safely run multiple times

-- Drop existing foreign key constraint if it exists
ALTER TABLE course_materials 
DROP CONSTRAINT IF EXISTS course_materials_raw_course_material_id_fkey;

-- Add new foreign key constraint with ON DELETE CASCADE
ALTER TABLE course_materials 
ADD CONSTRAINT course_materials_raw_course_material_id_fkey 
FOREIGN KEY (raw_course_material_id) 
REFERENCES raw_course_materials(raw_course_material_id) 
ON DELETE CASCADE;