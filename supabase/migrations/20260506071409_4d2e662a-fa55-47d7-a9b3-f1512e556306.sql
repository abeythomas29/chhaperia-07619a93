
ALTER TABLE public.sales ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE public.sales ADD COLUMN client_name text;
