
-- Allow all authenticated users to view production entries for stock calculations
CREATE POLICY "Authenticated can view all entries for stock"
  ON public.production_entries
  FOR SELECT
  TO authenticated
  USING (true);
