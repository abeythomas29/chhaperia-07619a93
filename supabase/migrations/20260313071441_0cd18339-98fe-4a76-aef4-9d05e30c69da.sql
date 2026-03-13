-- Remove the broken user completely so they can sign up fresh
DELETE FROM public.user_roles WHERE user_id = '02c56bdd-187a-4da6-b536-01cda63d99ed';
DELETE FROM public.profiles WHERE user_id = '02c56bdd-187a-4da6-b536-01cda63d99ed';
DELETE FROM auth.users WHERE id = '02c56bdd-187a-4da6-b536-01cda63d99ed';