
CREATE POLICY "Inventory managers can update own sales"
ON public.sales
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'inventory_manager') AND auth.uid() = sold_by)
WITH CHECK (has_role(auth.uid(), 'inventory_manager') AND auth.uid() = sold_by);

CREATE POLICY "Inventory managers can delete own sales"
ON public.sales
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'inventory_manager') AND auth.uid() = sold_by);
