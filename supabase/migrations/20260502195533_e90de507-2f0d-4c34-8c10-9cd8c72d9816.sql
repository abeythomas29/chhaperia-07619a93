
-- Add slitting_manager to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'slitting_manager';

-- Add slitting_manager to signup_department enum
ALTER TYPE public.signup_department ADD VALUE IF NOT EXISTS 'slitting_manager';

-- Create slitting_entries table
CREATE TABLE public.slitting_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_code_id UUID NOT NULL REFERENCES public.product_codes(id),
  source_quantity NUMERIC NOT NULL,
  cut_quantity_produced NUMERIC NOT NULL,
  cut_width_mm NUMERIC NOT NULL,
  remaining_returned NUMERIC NOT NULL DEFAULT 0,
  thickness_mm NUMERIC,
  unit TEXT NOT NULL DEFAULT 'meters',
  notes TEXT,
  slitting_manager_id UUID NOT NULL REFERENCES public.profiles(user_id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.slitting_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage slitting entries"
ON public.slitting_entries FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Slitting managers can insert own entries"
ON public.slitting_entries FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = slitting_manager_id);

CREATE POLICY "Slitting managers can view own entries"
ON public.slitting_entries FOR SELECT
TO authenticated
USING (auth.uid() = slitting_manager_id);

CREATE POLICY "Authenticated can view all slitting entries"
ON public.slitting_entries FOR SELECT
TO authenticated
USING (true);

-- Timestamp trigger
CREATE TRIGGER update_slitting_entries_updated_at
BEFORE UPDATE ON public.slitting_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
