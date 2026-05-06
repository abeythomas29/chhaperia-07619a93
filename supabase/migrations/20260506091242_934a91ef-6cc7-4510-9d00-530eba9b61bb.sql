
-- Reverse trigger for raw_material_usage DELETE
CREATE OR REPLACE FUNCTION public.reverse_raw_material_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.raw_materials
  SET current_stock = current_stock + OLD.quantity_used,
      updated_at = now()
  WHERE id = OLD.raw_material_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_reverse_raw_material_usage
AFTER DELETE ON public.raw_material_usage
FOR EACH ROW
EXECUTE FUNCTION public.reverse_raw_material_usage();

-- Reverse trigger for sales DELETE (raw material type only)
CREATE OR REPLACE FUNCTION public.reverse_raw_material_on_sale_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.item_type = 'raw_material' AND OLD.raw_material_id IS NOT NULL THEN
    UPDATE public.raw_materials
    SET current_stock = current_stock + OLD.quantity,
        updated_at = now()
    WHERE id = OLD.raw_material_id;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_reverse_raw_material_on_sale_delete
AFTER DELETE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.reverse_raw_material_on_sale_delete();

-- UPDATE trigger for raw_material_stock_entries (adjust diff)
CREATE OR REPLACE FUNCTION public.adjust_raw_material_stock_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.raw_material_id = NEW.raw_material_id THEN
    UPDATE public.raw_materials
    SET current_stock = current_stock + (NEW.quantity - OLD.quantity),
        updated_at = now()
    WHERE id = NEW.raw_material_id;
  ELSE
    UPDATE public.raw_materials
    SET current_stock = current_stock - OLD.quantity, updated_at = now()
    WHERE id = OLD.raw_material_id;
    UPDATE public.raw_materials
    SET current_stock = current_stock + NEW.quantity, updated_at = now()
    WHERE id = NEW.raw_material_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_adjust_stock_entry_on_update
AFTER UPDATE ON public.raw_material_stock_entries
FOR EACH ROW
EXECUTE FUNCTION public.adjust_raw_material_stock_on_update();

-- UPDATE trigger for raw_material_usage (adjust diff)
CREATE OR REPLACE FUNCTION public.adjust_raw_material_usage_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.raw_material_id = NEW.raw_material_id THEN
    UPDATE public.raw_materials
    SET current_stock = current_stock - (NEW.quantity_used - OLD.quantity_used),
        updated_at = now()
    WHERE id = NEW.raw_material_id;
  ELSE
    UPDATE public.raw_materials
    SET current_stock = current_stock + OLD.quantity_used, updated_at = now()
    WHERE id = OLD.raw_material_id;
    UPDATE public.raw_materials
    SET current_stock = current_stock - NEW.quantity_used, updated_at = now()
    WHERE id = NEW.raw_material_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_adjust_usage_on_update
AFTER UPDATE ON public.raw_material_usage
FOR EACH ROW
EXECUTE FUNCTION public.adjust_raw_material_usage_on_update();

-- UPDATE trigger for sales (raw material type, adjust diff)
CREATE OR REPLACE FUNCTION public.adjust_raw_material_on_sale_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reverse old deduction if was raw_material
  IF OLD.item_type = 'raw_material' AND OLD.raw_material_id IS NOT NULL THEN
    UPDATE public.raw_materials
    SET current_stock = current_stock + OLD.quantity, updated_at = now()
    WHERE id = OLD.raw_material_id;
  END IF;
  -- Apply new deduction if is raw_material
  IF NEW.item_type = 'raw_material' AND NEW.raw_material_id IS NOT NULL THEN
    UPDATE public.raw_materials
    SET current_stock = current_stock - NEW.quantity, updated_at = now()
    WHERE id = NEW.raw_material_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_adjust_raw_material_on_sale_update
AFTER UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.adjust_raw_material_on_sale_update();
