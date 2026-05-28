DROP POLICY IF EXISTS "Slitting managers can update own slitting entries" ON public.slitting_entries;
DROP POLICY IF EXISTS "Slitting managers can delete own slitting entries" ON public.slitting_entries;

CREATE POLICY "Users can update own slitting entries"
ON public.slitting_entries
FOR UPDATE
TO authenticated
USING (auth.uid() = slitting_manager_id)
WITH CHECK (auth.uid() = slitting_manager_id);

CREATE POLICY "Users can delete own slitting entries"
ON public.slitting_entries
FOR DELETE
TO authenticated
USING (auth.uid() = slitting_manager_id);