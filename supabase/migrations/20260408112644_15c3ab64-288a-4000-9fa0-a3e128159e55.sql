
-- 1. Raw Materials master table
CREATE TABLE public.raw_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  current_stock NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view raw materials" ON public.raw_materials
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage raw materials" ON public.raw_materials
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Workers can insert raw materials" ON public.raw_materials
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'worker'::app_role) OR is_admin(auth.uid()));

-- 2. Product Recipes (BOM) table
CREATE TABLE public.product_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_code_id UUID NOT NULL REFERENCES public.product_codes(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  quantity_per_unit NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (product_code_id, raw_material_id)
);

ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view recipes" ON public.product_recipes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage recipes" ON public.product_recipes
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Workers can manage recipes" ON public.product_recipes
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'worker'::app_role));

-- 3. Raw Material Usage log table
CREATE TABLE public.raw_material_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  production_entry_id UUID NOT NULL REFERENCES public.production_entries(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE RESTRICT,
  quantity_used NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.raw_material_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view usage" ON public.raw_material_usage
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage usage" ON public.raw_material_usage
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Workers can insert usage" ON public.raw_material_usage
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'worker'::app_role) OR is_admin(auth.uid()));

-- 4. Raw Material Stock Entries (purchases/inward)
CREATE TABLE public.raw_material_stock_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  added_by UUID NOT NULL REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.raw_material_stock_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view stock entries" ON public.raw_material_stock_entries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage stock entries" ON public.raw_material_stock_entries
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Workers can insert stock entries" ON public.raw_material_stock_entries
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'worker'::app_role) OR is_admin(auth.uid()));

-- 5. Trigger: auto-deduct stock on raw_material_usage insert
CREATE OR REPLACE FUNCTION public.deduct_raw_material_stock()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.raw_materials
  SET current_stock = current_stock - NEW.quantity_used,
      updated_at = now()
  WHERE id = NEW.raw_material_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deduct_raw_material_stock
  AFTER INSERT ON public.raw_material_usage
  FOR EACH ROW EXECUTE FUNCTION public.deduct_raw_material_stock();

-- 6. Trigger: auto-add stock on raw_material_stock_entries insert
CREATE OR REPLACE FUNCTION public.add_raw_material_stock()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.raw_materials
  SET current_stock = current_stock + NEW.quantity,
      updated_at = now()
  WHERE id = NEW.raw_material_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_add_raw_material_stock
  AFTER INSERT ON public.raw_material_stock_entries
  FOR EACH ROW EXECUTE FUNCTION public.add_raw_material_stock();

-- 7. updated_at triggers
CREATE TRIGGER set_updated_at_raw_materials
  BEFORE UPDATE ON public.raw_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_product_recipes
  BEFORE UPDATE ON public.product_recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
