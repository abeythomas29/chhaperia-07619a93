
-- Add unique constraint on profiles.user_id (needed for FK reference)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Add FK from production_entries.worker_id to profiles.user_id
ALTER TABLE public.production_entries 
  ADD CONSTRAINT production_entries_worker_id_profiles_fkey 
  FOREIGN KEY (worker_id) REFERENCES public.profiles(user_id);
