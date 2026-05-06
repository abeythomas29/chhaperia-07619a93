
CREATE OR REPLACE FUNCTION public.reverse_raw_material_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.raw_materials
  SET current_stock = current_stock - OLD.quantity,
      updated_at = now()
  WHERE id = OLD.raw_material_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_reverse_raw_material_stock
AFTER DELETE ON public.raw_material_stock_entries
FOR EACH ROW
EXECUTE FUNCTION public.reverse_raw_material_stock();
