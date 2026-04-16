DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role'
      AND e.enumlabel = 'inventory_manager'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'inventory_manager';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'raw_materials'
      AND policyname = 'Inventory managers can insert raw materials'
  ) THEN
    CREATE POLICY "Inventory managers can insert raw materials"
    ON public.raw_materials
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'inventory_manager'::public.app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'raw_material_stock_entries'
      AND policyname = 'Inventory managers can insert stock entries'
  ) THEN
    CREATE POLICY "Inventory managers can insert stock entries"
    ON public.raw_material_stock_entries
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'inventory_manager'::public.app_role));
  END IF;
END $$;