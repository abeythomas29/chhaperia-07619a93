
-- Drop restrictive SELECT policies on production_entries
DROP POLICY IF EXISTS "Admins can view all entries" ON public.production_entries;
DROP POLICY IF EXISTS "Workers can view own entries" ON public.production_entries;

-- Recreate as PERMISSIVE (default) so they combine with OR logic
CREATE POLICY "Admins can view all entries"
  ON public.production_entries FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Workers can view own entries"
  ON public.production_entries FOR SELECT
  USING (auth.uid() = worker_id);
