
ALTER TABLE public.production_entries DROP COLUMN total_quantity;
ALTER TABLE public.production_entries ALTER COLUMN rolls_count TYPE numeric USING rolls_count::numeric;
ALTER TABLE public.production_entries ADD COLUMN total_quantity numeric GENERATED ALWAYS AS (rolls_count * quantity_per_roll) STORED;
