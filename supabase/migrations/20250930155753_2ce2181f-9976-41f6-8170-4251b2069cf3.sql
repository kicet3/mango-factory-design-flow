-- Drop the problematic policy
DROP POLICY IF EXISTS "Public can read generation_attrs for shared responses" ON public.generation_attrs;

-- Create a security definer function to check if generation_attrs is linked to a shared response
CREATE OR REPLACE FUNCTION public.is_generation_attrs_shared(p_generation_attrs_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.generation_responses gr
    WHERE gr.generation_attrs_id = p_generation_attrs_id
      AND gr.can_share = true
  );
$$;

-- Create a new policy using the security definer function
CREATE POLICY "Public can read generation_attrs for shared responses"
ON public.generation_attrs
FOR SELECT
USING (
  public.is_generation_attrs_shared(generation_attrs_id)
);