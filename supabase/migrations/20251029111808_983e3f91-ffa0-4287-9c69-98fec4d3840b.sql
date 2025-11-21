-- Update foreign key constraint to CASCADE delete user_material_interactions.
-- when raw_generation_formats are deleted

-- Drop existing constraint if it exists
ALTER TABLE user_material_interactions
DROP CONSTRAINT IF EXISTS fk_umi_raw_format;


-- Add constraint with CASCADE delete
ALTER TABLE user_material_interactions
ADD CONSTRAINT fk_umi_raw_format
FOREIGN KEY (raw_generation_format_id)
REFERENCES raw_generation_formats(raw_generation_format_id)
ON DELETE CASCADE;