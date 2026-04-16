CREATE TYPE public.signup_department AS ENUM ('worker', 'inventory_manager');

ALTER TABLE public.profiles
ADD COLUMN requested_department public.signup_department;

UPDATE public.profiles
SET requested_department = 'worker'::public.signup_department
WHERE requested_department IS NULL;

ALTER TABLE public.profiles
ALTER COLUMN requested_department SET DEFAULT 'worker'::public.signup_department,
ALTER COLUMN requested_department SET NOT NULL;