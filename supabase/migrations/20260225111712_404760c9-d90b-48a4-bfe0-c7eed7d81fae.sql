
-- Fix overly permissive INSERT policies for workers
-- Drop the permissive ones and replace with role-checked versions

DROP POLICY "Workers can insert categories" ON public.product_categories;
CREATE POLICY "Workers can insert categories" ON public.product_categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'worker') OR public.is_admin(auth.uid()));

DROP POLICY "Workers can insert product codes" ON public.product_codes;
CREATE POLICY "Workers can insert product codes" ON public.product_codes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'worker') OR public.is_admin(auth.uid()));

DROP POLICY "Workers can insert clients" ON public.company_clients;
CREATE POLICY "Workers can insert clients" ON public.company_clients FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'worker') OR public.is_admin(auth.uid()));
