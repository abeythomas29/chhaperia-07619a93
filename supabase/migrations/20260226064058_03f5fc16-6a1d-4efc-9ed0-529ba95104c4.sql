
-- Drop the restrictive ALL policy that interferes with SELECT
DROP POLICY IF EXISTS "Admins can manage all entries" ON public.production_entries;
DROP POLICY IF EXISTS "Workers can insert own entries" ON public.production_entries;

-- Recreate as PERMISSIVE policies for specific commands
CREATE POLICY "Admins can insert entries"
  ON public.production_entries FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update entries"
  ON public.production_entries FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete entries"
  ON public.production_entries FOR DELETE
  USING (is_admin(auth.uid()));

CREATE POLICY "Workers can insert own entries"
  ON public.production_entries FOR INSERT
  WITH CHECK (auth.uid() = worker_id);
