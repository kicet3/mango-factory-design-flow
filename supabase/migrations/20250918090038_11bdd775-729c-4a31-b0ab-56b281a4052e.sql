CREATE TABLE IF NOT EXISTS public.image_contents_categories (
  image_contents_category_id SERIAL PRIMARY KEY,
  category_name VARCHAR(64) UNIQUE NOT NULL,
  category_desc TEXT NULL
);

-- Create image contents roles table
CREATE TABLE IF NOT EXISTS public.image_contents_roles (
  image_contents_role_id SERIAL PRIMARY KEY,
  role_key VARCHAR(64) UNIQUE NOT NULL,
  role_name VARCHAR(64) NOT NULL,
  role_desc TEXT NULL
);

-- Create image didactic intents table (new for teaching intents)
CREATE TABLE IF NOT EXISTS public.image_didactic_intents (
  didactic_intent_id SERIAL PRIMARY KEY,
  intent_key VARCHAR(64) UNIQUE NOT NULL,
  intent_name VARCHAR(64) NOT NULL,
  intent_desc TEXT NULL
);

-- Create main image contents table
CREATE TABLE IF NOT EXISTS public.image_contents (
  image_content_id SERIAL PRIMARY KEY,
  image_name VARCHAR(128) NOT NULL,
  image_contents_category_id INT NULL REFERENCES public.image_contents_categories(image_contents_category_id) ON DELETE SET NULL,
  image_contents_role_id INT NULL REFERENCES public.image_contents_roles(image_contents_role_id) ON DELETE SET NULL,
  image_desc TEXT NULL,
  image_path VARCHAR(256) NOT NULL,
  content_semantics TEXT[] NULL,
  forbidden_elements TEXT[] NULL,
  replacement_constraints JSONB NULL,
  confidence REAL NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
  evidence TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create many-to-many relationship for didactic intents
CREATE TABLE IF NOT EXISTS public.image_content_didactic_intents (
  image_content_id INT NOT NULL REFERENCES public.image_contents(image_content_id) ON DELETE CASCADE,
  didactic_intent_id INT NOT NULL REFERENCES public.image_didactic_intents(didactic_intent_id) ON DELETE CASCADE,
  PRIMARY KEY (image_content_id, didactic_intent_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_image_name ON public.image_contents(image_name);
CREATE INDEX IF NOT EXISTS idx_image_cat ON public.image_contents(image_contents_category_id);
CREATE INDEX IF NOT EXISTS idx_image_role ON public.image_contents(image_contents_role_id);
CREATE INDEX IF NOT EXISTS idx_image_semantics_gin ON public.image_contents USING GIN(content_semantics);
CREATE INDEX IF NOT EXISTS idx_image_forbidden_gin ON public.image_contents USING GIN(forbidden_elements);
CREATE INDEX IF NOT EXISTS idx_image_created_at ON public.image_contents(created_at DESC);

-- Enable RLS on all tables
ALTER TABLE public.image_contents_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_contents_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_didactic_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_content_didactic_intents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access
DROP POLICY IF EXISTS "Admins can manage image_contents_categories" ON public.image_contents_categories;
CREATE POLICY "Admins can manage image_contents_categories" ON public.image_contents_categories
FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can manage image_contents_roles" ON public.image_contents_roles;
CREATE POLICY "Admins can manage image_contents_roles" ON public.image_contents_roles
FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can manage image_didactic_intents" ON public.image_didactic_intents;
CREATE POLICY "Admins can manage image_didactic_intents" ON public.image_didactic_intents
FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can manage image_contents" ON public.image_contents;
CREATE POLICY "Admins can manage image_contents" ON public.image_contents
FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can manage image_content_didactic_intents" ON public.image_content_didactic_intents;
CREATE POLICY "Admins can manage image_content_didactic_intents" ON public.image_content_didactic_intents
FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- Ensure trigger is recreated idempotently
DROP TRIGGER IF EXISTS update_image_contents_updated_at ON public.image_contents;
CREATE TRIGGER update_image_contents_updated_at
  BEFORE UPDATE ON public.image_contents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();