ALTER TABLE public.raw_material_stock_entries
ADD COLUMN IF NOT EXISTS supplier text,
ADD COLUMN IF NOT EXISTS pallets numeric;