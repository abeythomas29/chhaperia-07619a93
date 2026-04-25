-- Sales table
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('raw_material', 'finished_product')),
  raw_material_id UUID,
  product_code_id UUID,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'kg',
  price_per_unit NUMERIC NOT NULL DEFAULT 0 CHECK (price_per_unit >= 0),
  total_amount NUMERIC GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
  thickness_mm NUMERIC,
  notes TEXT,
  sold_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT sales_item_consistency CHECK (
    (item_type = 'raw_material' AND raw_material_id IS NOT NULL AND product_code_id IS NULL)
    OR
    (item_type = 'finished_product' AND product_code_id IS NOT NULL AND raw_material_id IS NULL)
  )
);

-- RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory managers and admins can view sales"
ON public.sales FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'inventory_manager'::app_role) OR is_admin(auth.uid()));

CREATE POLICY "Inventory managers and admins can insert sales"
ON public.sales FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'inventory_manager'::app_role) OR is_admin(auth.uid()))
  AND auth.uid() = sold_by
);

CREATE POLICY "Admins can update sales"
ON public.sales FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete sales"
ON public.sales FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Trigger to deduct raw material stock on sale
CREATE OR REPLACE FUNCTION public.deduct_raw_material_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.item_type = 'raw_material' AND NEW.raw_material_id IS NOT NULL THEN
    UPDATE public.raw_materials
    SET current_stock = current_stock - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.raw_material_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sales_deduct_raw_material
AFTER INSERT ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.deduct_raw_material_on_sale();

-- updated_at trigger
CREATE TRIGGER trg_sales_updated_at
BEFORE UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_sales_date ON public.sales(date DESC);
CREATE INDEX idx_sales_client ON public.sales(client_id);
CREATE INDEX idx_sales_sold_by ON public.sales(sold_by);