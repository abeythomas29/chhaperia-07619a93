
-- Allow inventory_manager to insert raw materials
CREATE POLICY "Inventory managers can insert raw materials"
ON public.raw_materials
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'inventory_manager'::app_role));

-- Allow inventory_manager to insert stock entries
CREATE POLICY "Inventory managers can insert stock entries"
ON public.raw_material_stock_entries
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'inventory_manager'::app_role));
