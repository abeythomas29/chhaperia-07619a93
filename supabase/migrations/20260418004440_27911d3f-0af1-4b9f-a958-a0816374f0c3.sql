ALTER TABLE public.raw_material_stock_entries
ADD COLUMN IF NOT EXISTS lot_number text;