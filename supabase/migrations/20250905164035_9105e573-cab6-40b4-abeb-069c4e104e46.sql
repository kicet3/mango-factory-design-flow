-- Add missing foreign key constraints across the schema safely (idempotent)
-- Note: Skips teaching_style_id mappings because a teaching_styles table is not present.

-- admin_users -> auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_user_id_fkey'
  ) THEN
    ALTER TABLE public.admin_users
      ADD CONSTRAINT admin_users_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_approved_by_fkey'
  ) THEN
    ALTER TABLE public.admin_users
      ADD CONSTRAINT admin_users_approved_by_fkey
      FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- profiles -> auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- teacher_info -> auth.users, schools
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teacher_info_user_id_fkey'
  ) THEN
    ALTER TABLE public.teacher_info
      ADD CONSTRAINT teacher_info_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teacher_info_school_id_fkey'
  ) THEN
    ALTER TABLE public.teacher_info
      ADD CONSTRAINT teacher_info_school_id_fkey
      FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE RESTRICT;
  END IF;
END $$;

-- courses -> course_semesters, course_types, course_material_publishers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courses_course_semester_id_fkey'
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_course_semester_id_fkey
      FOREIGN KEY (course_semester_id) REFERENCES public.course_semesters(course_semester_id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courses_course_type_id_fkey'
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_course_type_id_fkey
      FOREIGN KEY (course_type_id) REFERENCES public.course_types(course_type_id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courses_course_material_publisher_id_fkey'
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_course_material_publisher_id_fkey
      FOREIGN KEY (course_material_publisher_id) REFERENCES public.course_material_publishers(course_material_publisher_id) ON DELETE SET NULL;
  END IF;
END $$;

-- raw_course_materials -> courses
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'raw_course_materials_course_id_fkey'
  ) THEN
    ALTER TABLE public.raw_course_materials
      ADD CONSTRAINT raw_course_materials_course_id_fkey
      FOREIGN KEY (course_id) REFERENCES public.courses(course_id) ON DELETE RESTRICT;
  END IF;
END $$;

-- course_materials -> raw_course_materials, generation_status_types
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_materials_raw_course_material_id_fkey'
  ) THEN
    ALTER TABLE public.course_materials
      ADD CONSTRAINT course_materials_raw_course_material_id_fkey
      FOREIGN KEY (raw_course_material_id) REFERENCES public.raw_course_materials(raw_course_material_id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_materials_generation_status_type_id_fkey'
  ) THEN
    ALTER TABLE public.course_materials
      ADD CONSTRAINT course_materials_generation_status_type_id_fkey
      FOREIGN KEY (generation_status_type_id) REFERENCES public.generation_status_types(generation_status_type_id) ON DELETE SET NULL;
  END IF;
END $$;

-- course_material_structure_only -> raw_course_materials
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_material_structure_only_raw_course_material_id_fkey'
  ) THEN
    ALTER TABLE public.course_material_structure_only
      ADD CONSTRAINT course_material_structure_only_raw_course_material_id_fkey
      FOREIGN KEY (raw_course_material_id) REFERENCES public.raw_course_materials(raw_course_material_id) ON DELETE CASCADE;
  END IF;
END $$;

-- course_section -> course_materials
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_section_course_material_id_fkey'
  ) THEN
    ALTER TABLE public.course_section
      ADD CONSTRAINT course_section_course_material_id_fkey
      FOREIGN KEY (course_material_id) REFERENCES public.course_materials(course_material_id) ON DELETE CASCADE;
  END IF;
END $$;

-- generation_attrs -> users, course_materials, raw_generation_formats
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_attrs_user_id_fkey'
  ) THEN
    ALTER TABLE public.generation_attrs
      ADD CONSTRAINT generation_attrs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_attrs_course_material_id_fkey'
  ) THEN
    ALTER TABLE public.generation_attrs
      ADD CONSTRAINT generation_attrs_course_material_id_fkey
      FOREIGN KEY (course_material_id) REFERENCES public.course_materials(course_material_id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_attrs_raw_generation_format_id_fkey'
  ) THEN
    ALTER TABLE public.generation_attrs
      ADD CONSTRAINT generation_attrs_raw_generation_format_id_fkey
      FOREIGN KEY (raw_generation_format_id) REFERENCES public.raw_generation_formats(raw_generation_format_id) ON DELETE SET NULL;
  END IF;
END $$;

-- generation_requests -> users, generation_attrs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_requests_user_id_fkey'
  ) THEN
    ALTER TABLE public.generation_requests
      ADD CONSTRAINT generation_requests_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_requests_generation_attrs_id_fkey'
  ) THEN
    ALTER TABLE public.generation_requests
      ADD CONSTRAINT generation_requests_generation_attrs_id_fkey
      FOREIGN KEY (generation_attrs_id) REFERENCES public.generation_attrs(generation_attrs_id) ON DELETE CASCADE;
  END IF;
END $$;

-- generation_responses -> users, generation_requests, generation_attrs, generation_status_types
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_responses_user_id_fkey'
  ) THEN
    ALTER TABLE public.generation_responses
      ADD CONSTRAINT generation_responses_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_responses_generation_request_id_fkey'
  ) THEN
    ALTER TABLE public.generation_responses
      ADD CONSTRAINT generation_responses_generation_request_id_fkey
      FOREIGN KEY (generation_request_id) REFERENCES public.generation_requests(generation_request_id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_responses_generation_attrs_id_fkey'
  ) THEN
    ALTER TABLE public.generation_responses
      ADD CONSTRAINT generation_responses_generation_attrs_id_fkey
      FOREIGN KEY (generation_attrs_id) REFERENCES public.generation_attrs(generation_attrs_id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_responses_generation_status_type_id_fkey'
  ) THEN
    ALTER TABLE public.generation_responses
      ADD CONSTRAINT generation_responses_generation_status_type_id_fkey
      FOREIGN KEY (generation_status_type_id) REFERENCES public.generation_status_types(generation_status_type_id) ON DELETE SET NULL;
  END IF;
END $$;

-- generation_formats -> raw_generation_formats, generation_status_types
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_formats_raw_generation_format_id_fkey'
  ) THEN
    ALTER TABLE public.generation_formats
      ADD CONSTRAINT generation_formats_raw_generation_format_id_fkey
      FOREIGN KEY (raw_generation_format_id) REFERENCES public.raw_generation_formats(raw_generation_format_id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_formats_generation_status_type_id_fkey'
  ) THEN
    ALTER TABLE public.generation_formats
      ADD CONSTRAINT generation_formats_generation_status_type_id_fkey
      FOREIGN KEY (generation_status_type_id) REFERENCES public.generation_status_types(generation_status_type_id) ON DELETE SET NULL;
  END IF;
END $$;

-- raw_generation_format_stats -> raw_generation_formats
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'raw_generation_format_stats_raw_generation_format_id_fkey'
  ) THEN
    ALTER TABLE public.raw_generation_format_stats
      ADD CONSTRAINT raw_generation_format_stats_raw_generation_format_id_fkey
      FOREIGN KEY (raw_generation_format_id) REFERENCES public.raw_generation_formats(raw_generation_format_id) ON DELETE CASCADE;
  END IF;
END $$;

-- raw_generation_format_cowork_type_map -> raw_generation_formats, cowork_types
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'raw_generation_format_cowork_type_map_raw_generation_format_id_fkey'
  ) THEN
    ALTER TABLE public.raw_generation_format_cowork_type_map
      ADD CONSTRAINT raw_generation_format_cowork_type_map_raw_generation_format_id_fkey
      FOREIGN KEY (raw_generation_format_id) REFERENCES public.raw_generation_formats(raw_generation_format_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'raw_generation_format_cowork_type_map_cowork_type_id_fkey'
  ) THEN
    ALTER TABLE public.raw_generation_format_cowork_type_map
      ADD CONSTRAINT raw_generation_format_cowork_type_map_cowork_type_id_fkey
      FOREIGN KEY (cowork_type_id) REFERENCES public.cowork_types(cowork_type_id) ON DELETE RESTRICT;
  END IF;
END $$;

-- generation_attrs_cowork_type_map -> generation_attrs, cowork_types
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_attrs_cowork_type_map_generation_attrs_id_fkey'
  ) THEN
    ALTER TABLE public.generation_attrs_cowork_type_map
      ADD CONSTRAINT generation_attrs_cowork_type_map_generation_attrs_id_fkey
      FOREIGN KEY (generation_attrs_id) REFERENCES public.generation_attrs(generation_attrs_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_attrs_cowork_type_map_cowork_type_id_fkey'
  ) THEN
    ALTER TABLE public.generation_attrs_cowork_type_map
      ADD CONSTRAINT generation_attrs_cowork_type_map_cowork_type_id_fkey
      FOREIGN KEY (cowork_type_id) REFERENCES public.cowork_types(cowork_type_id) ON DELETE RESTRICT;
  END IF;
END $$;

-- format_selection_attrs -> users, course_materials
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'format_selection_attrs_user_id_fkey'
  ) THEN
    ALTER TABLE public.format_selection_attrs
      ADD CONSTRAINT format_selection_attrs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'format_selection_attrs_course_material_id_fkey'
  ) THEN
    ALTER TABLE public.format_selection_attrs
      ADD CONSTRAINT format_selection_attrs_course_material_id_fkey
      FOREIGN KEY (course_material_id) REFERENCES public.course_materials(course_material_id) ON DELETE SET NULL;
  END IF;
END $$;

-- format_selection_request_messages -> users, format_selection_attrs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'format_selection_request_messages_user_id_fkey'
  ) THEN
    ALTER TABLE public.format_selection_request_messages
      ADD CONSTRAINT format_selection_request_messages_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'format_selection_request_messages_attrs_id_fkey'
  ) THEN
    ALTER TABLE public.format_selection_request_messages
      ADD CONSTRAINT format_selection_request_messages_attrs_id_fkey
      FOREIGN KEY (format_selection_attrs_id) REFERENCES public.format_selection_attrs(format_selection_attrs_id) ON DELETE CASCADE;
  END IF;
END $$;

-- format_selection_responses -> format_selection_attrs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'format_selection_responses_attrs_id_fkey'
  ) THEN
    ALTER TABLE public.format_selection_responses
      ADD CONSTRAINT format_selection_responses_attrs_id_fkey
      FOREIGN KEY (format_selection_attrs_id) REFERENCES public.format_selection_attrs(format_selection_attrs_id) ON DELETE CASCADE;
  END IF;
END $$;

-- format_selection_attrs_cowork_type_map -> format_selection_attrs, cowork_types
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'format_selection_attrs_cowork_type_map_attrs_id_fkey'
  ) THEN
    ALTER TABLE public.format_selection_attrs_cowork_type_map
      ADD CONSTRAINT format_selection_attrs_cowork_type_map_attrs_id_fkey
      FOREIGN KEY (format_selection_attrs_id) REFERENCES public.format_selection_attrs(format_selection_attrs_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'format_selection_attrs_cowork_type_map_cowork_type_id_fkey'
  ) THEN
    ALTER TABLE public.format_selection_attrs_cowork_type_map
      ADD CONSTRAINT format_selection_attrs_cowork_type_map_cowork_type_id_fkey
      FOREIGN KEY (cowork_type_id) REFERENCES public.cowork_types(cowork_type_id) ON DELETE RESTRICT;
  END IF;
END $$;

-- teacher_course_type_course_material_publisher_map -> teacher_info, course_types, course_material_publishers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teacher_course_type_course_material_publisher_map_teacher_info_id_fkey'
  ) THEN
    ALTER TABLE public.teacher_course_type_course_material_publisher_map
      ADD CONSTRAINT teacher_course_type_course_material_publisher_map_teacher_info_id_fkey
      FOREIGN KEY (teacher_info_id) REFERENCES public.teacher_info(teacher_info_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teacher_course_type_course_material_publisher_map_course_type_id_fkey'
  ) THEN
    ALTER TABLE public.teacher_course_type_course_material_publisher_map
      ADD CONSTRAINT teacher_course_type_course_material_publisher_map_course_type_id_fkey
      FOREIGN KEY (course_type_id) REFERENCES public.course_types(course_type_id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teacher_course_type_course_material_publisher_map_publisher_id_fkey'
  ) THEN
    ALTER TABLE public.teacher_course_type_course_material_publisher_map
      ADD CONSTRAINT teacher_course_type_course_material_publisher_map_publisher_id_fkey
      FOREIGN KEY (course_material_publisher_id) REFERENCES public.course_material_publishers(course_material_publisher_id) ON DELETE RESTRICT;
  END IF;
END $$;

-- payment_histories -> users, plans, payment_status
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_histories_user_id_fkey'
  ) THEN
    ALTER TABLE public.payment_histories
      ADD CONSTRAINT payment_histories_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_histories_plan_id_fkey'
  ) THEN
    ALTER TABLE public.payment_histories
      ADD CONSTRAINT payment_histories_plan_id_fkey
      FOREIGN KEY (plan_id) REFERENCES public.plans(plan_id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_histories_payment_status_id_fkey'
  ) THEN
    ALTER TABLE public.payment_histories
      ADD CONSTRAINT payment_histories_payment_status_id_fkey
      FOREIGN KEY (payment_status_id) REFERENCES public.payment_status(payment_status_id) ON DELETE SET NULL;
  END IF;
END $$;

-- help_requests -> users, help_request_types
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'help_requests_user_id_fkey'
  ) THEN
    ALTER TABLE public.help_requests
      ADD CONSTRAINT help_requests_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'help_requests_help_request_type_id_fkey'
  ) THEN
    ALTER TABLE public.help_requests
      ADD CONSTRAINT help_requests_help_request_type_id_fkey
      FOREIGN KEY (help_request_type_id) REFERENCES public.help_request_types(help_request_type_id) ON DELETE RESTRICT;
  END IF;
END $$;

-- raw_generation_formats -> users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'raw_generation_formats_uploaded_user_id_fkey'
  ) THEN
    ALTER TABLE public.raw_generation_formats
      ADD CONSTRAINT raw_generation_formats_uploaded_user_id_fkey
      FOREIGN KEY (uploaded_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;
