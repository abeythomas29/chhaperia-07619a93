CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  )
$function$;

ALTER POLICY "Super admins can delete profiles"
ON public.profiles
USING (public.has_role(auth.uid(), 'super_admin'));

ALTER POLICY "Super admins can update any profile"
ON public.profiles
USING (public.has_role(auth.uid(), 'super_admin'));

ALTER POLICY "Super admins can manage roles"
ON public.user_roles
USING (public.has_role(auth.uid(), 'super_admin'));

ALTER POLICY "Workers can insert clients"
ON public.company_clients
WITH CHECK (public.has_role(auth.uid(), 'worker') OR public.is_admin(auth.uid()));

ALTER POLICY "Workers can insert categories"
ON public.product_categories
WITH CHECK (public.has_role(auth.uid(), 'worker') OR public.is_admin(auth.uid()));

ALTER POLICY "Workers can insert product codes"
ON public.product_codes
WITH CHECK (public.has_role(auth.uid(), 'worker') OR public.is_admin(auth.uid()));

ALTER POLICY "Workers can manage recipes"
ON public.product_recipes
USING (public.has_role(auth.uid(), 'worker'));

ALTER POLICY "Workers can insert stock entries"
ON public.raw_material_stock_entries
WITH CHECK (public.has_role(auth.uid(), 'worker') OR public.is_admin(auth.uid()));

ALTER POLICY "Workers can insert raw materials"
ON public.raw_materials
WITH CHECK (public.has_role(auth.uid(), 'worker') OR public.is_admin(auth.uid()));

ALTER POLICY "Workers can insert usage"
ON public.raw_material_usage
WITH CHECK (public.has_role(auth.uid(), 'worker') OR public.is_admin(auth.uid()));

ALTER POLICY "Inventory managers can insert stock entries"
ON public.raw_material_stock_entries
WITH CHECK (public.has_role(auth.uid(), 'inventory_manager'));

ALTER POLICY "Inventory managers can insert raw materials"
ON public.raw_materials
WITH CHECK (public.has_role(auth.uid(), 'inventory_manager'));

ALTER POLICY "Inventory managers and admins can insert sales"
ON public.sales
WITH CHECK ((public.has_role(auth.uid(), 'inventory_manager') OR public.is_admin(auth.uid())) AND auth.uid() = sold_by);

ALTER POLICY "Inventory managers and admins can view sales"
ON public.sales
USING (public.has_role(auth.uid(), 'inventory_manager') OR public.is_admin(auth.uid()));

DROP FUNCTION IF EXISTS public.get_user_role(uuid);

ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE text USING role::text;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$function$;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP TYPE IF EXISTS public.app_role;