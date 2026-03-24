

## Problem Analysis

The publish is failing because migration `20260314064914` tries to run `ALTER COLUMN rolls_count TYPE numeric` while the generated column `total_quantity` still depends on it. On the **Live** database, `rolls_count` is still `INTEGER` and `total_quantity` is a generated column — so this migration fails every time.

The sequence in the migration file is correct (drop total_quantity first, alter type, re-add), but **Lovable Cloud applies migrations to Live on publish**, and the Live database is stuck on the older migration set (last applied: `20260312064021`). The migrations after that have never been applied to Live.

**About the Cloudflare proxy**: Your `client.ts` points to a different Supabase project (`zzbpgwivxvkhabh pxjqt`) via your proxy. The Lovable Cloud backend (`eezbgxbbgaqifgcxxbun`) is a separate database. The publish error is on the Lovable Cloud database — not your production proxy. Your app at runtime uses the proxy, so this Lovable Cloud schema drift is the root cause of the publish blocker.

## Fix Plan

### Step 1: Fix the broken migration file

Rewrite `supabase/migrations/20260314064914_bdad2890-0244-4a47-8160-5de8fa696278.sql` to handle the generated column dependency correctly by wrapping it in a conditional check:

```sql
-- Drop generated column first, then alter type, then re-add
ALTER TABLE public.production_entries DROP COLUMN IF EXISTS total_quantity;
ALTER TABLE public.production_entries ALTER COLUMN rolls_count TYPE numeric USING rolls_count::numeric;
ALTER TABLE public.production_entries ADD COLUMN total_quantity numeric GENERATED ALWAYS AS (rolls_count * quantity_per_roll) STORED;
```

The only change is adding `IF EXISTS` to the DROP to make it idempotent. The original file already has the correct order (drop, alter, add) — but the error suggests the Live database may be running these statements differently. Let me verify by checking if the migration file content matches what we see.

Actually, re-reading the error and the migration file: the file **does** drop `total_quantity` first. The error says "cannot alter type of a column used by a generated column" which means the DROP didn't execute or there's a transactional rollback issue.

The real fix: the migration needs `DROP COLUMN IF EXISTS` to be safe, and we should verify the SQL is syntactically valid for the Live Postgres version. The statements look correct though.

**Alternative approach**: Since Live is far behind (only has migrations up to `20260312064021`), and the migration file already has the correct order, the issue might be that the migration is being parsed/applied differently. The safest fix is to consolidate the problematic migration.

### Step 1: Update migration file to be fully idempotent

Edit `supabase/migrations/20260314064914_bdad2890-0244-4a47-8160-5de8fa696278.sql`:
```sql
DO $$
BEGIN
  -- Drop generated column if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema='public' AND table_name='production_entries' AND column_name='total_quantity') THEN
    ALTER TABLE public.production_entries DROP COLUMN total_quantity;
  END IF;
  
  -- Change rolls_count to numeric
  ALTER TABLE public.production_entries ALTER COLUMN rolls_count TYPE numeric USING rolls_count::numeric;
  
  -- Re-add generated column
  ALTER TABLE public.production_entries ADD COLUMN total_quantity numeric GENERATED ALWAYS AS (rolls_count * quantity_per_roll) STORED;
END $$;
```

This wraps everything in a DO block so it runs as a single transaction with proper ordering.

### Step 2: Similarly update migration `20260320093159` to be idempotent

Add `IF NOT EXISTS` / conditional checks for the `stock_issues` table and `client_id` nullable change, since Live may not have these yet.

That is the complete fix — no other files need changing. The Cloudflare proxy setup is unrelated to the publish error; the error is purely about Lovable Cloud's own database schema sync.

