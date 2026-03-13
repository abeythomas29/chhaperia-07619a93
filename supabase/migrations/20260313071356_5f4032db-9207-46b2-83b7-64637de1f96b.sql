UPDATE auth.users 
SET 
  encrypted_password = crypt('abey1234', gen_salt('bf', 6)),
  updated_at = now()
WHERE id = '02c56bdd-187a-4da6-b536-01cda63d99ed';

-- Verify it works
SELECT encrypted_password = crypt('abey1234', encrypted_password) as password_matches 
FROM auth.users 
WHERE id = '02c56bdd-187a-4da6-b536-01cda63d99ed';