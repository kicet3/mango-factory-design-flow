-- Create or replace trigger function to delete orphaned courses
-- when raw_course_materials are deleted
CREATE OR REPLACE FUNCTION public.delete_orphaned_course_on_raw_material_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if there are any other raw_course_materials referencing this course_id 
  IF NOT EXISTS (
    SELECT 1 
    FROM public.raw_course_materials 
    WHERE course_id = OLD.course_id
  ) THEN
    -- If no other raw_course_materials exist, delete the course
    DELETE FROM public.courses WHERE course_id = OLD.course_id;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_delete_orphaned_course ON public.raw_course_materials;

-- Create trigger that fires after delete on raw_course_materials
CREATE TRIGGER trigger_delete_orphaned_course
  AFTER DELETE ON public.raw_course_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_orphaned_course_on_raw_material_delete();