
-- Make client_id nullable on production_entries (production no longer requires a client)
ALTER TABLE public.production_entries ALTER COLUMN client_id DROP NOT NULL;

-- Create stock_issues table for tracking stock issued to clients
CREATE TABLE public.stock_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code_id uuid NOT NULL REFERENCES public.product_codes(id),
  client_id uuid NOT NULL REFERENCES public.company_clients(id),
  quantity numeric NOT NULL,
  unit text NOT NULL DEFAULT 'meters',
  notes text,
  issued_by uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add foreign key for issued_by to profiles
ALTER TABLE public.stock_issues
  ADD CONSTRAINT stock_issues_issued_by_profiles_fkey
  FOREIGN KEY (issued_by) REFERENCES public.profiles(user_id);

-- Enable RLS
ALTER TABLE public.stock_issues ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage stock issues" ON public.stock_issues
  FOR ALL TO public USING (is_admin(auth.uid()));

CREATE POLICY "Workers can view stock issues" ON public.stock_issues
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Workers can insert stock issues" ON public.stock_issues
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = issued_by OR is_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_stock_issues_updated_at
  BEFORE UPDATE ON public.stock_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for stock_issues
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_issues;
