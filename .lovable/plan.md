
## What’s actually causing the error

The role change is still failing because the app is **not sending the update to the same backend/database that now contains `inventory_manager`**.

I confirmed three important facts:

1. **Your current database already supports `inventory_manager`**
   - The `app_role` enum now includes:
     - `super_admin`
     - `admin`
     - `worker`
     - `inventory_manager`

2. **The failing request is going through a hardcoded custom proxy**
   - `src/integrations/supabase/client.ts` currently forces:
     - a hardcoded `PROXY_URL`
     - a hardcoded `FALLBACK_ANON_KEY`
   - The failed network request went to:
     - `https://chhaperia-supabase-proxy.chhaperia.workers.dev/rest/v1/user_roles?...`

3. **That proxy/backend still rejects `inventory_manager`**
   - The actual response was:
     - `invalid input value for enum app_role: "inventory_manager"`
   - So the browser is talking to a backend where the enum is still old, or the proxy is pointed at a different project.

## Why it fails when changing Production Manager to Inventory Manager

When you edit the user and save, this page runs:

- `src/pages/admin/UserManagement.tsx`

It sends:
- `PATCH user_roles`
- body: `{ "role": "inventory_manager" }`

That code is fine.

The failure happens because the request goes through the custom proxy configured here:

- `src/integrations/supabase/client.ts`

That file currently uses the proxy instead of the project environment URL, so even though this project’s database schema is updated, the request is likely hitting an older or mismatched backend.

## How we should fix it

### Recommended fix
Update `src/integrations/supabase/client.ts` so the app uses the project’s real environment variables instead of forcing the old proxy/fallback key.

### Implementation steps
1. Remove the hardcoded proxy-first client configuration.
2. Use:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Keep the normal generated client setup only.
4. Re-test the user role edit flow on `/admin/users`.
5. Verify that changing `abey@chhaperia.com` from `worker` to `inventory_manager` succeeds.
6. Verify login redirect for an Inventory Manager account goes to the inventory portal.

## Files involved

### Must change
- `src/integrations/supabase/client.ts`

### Should verify after fix
- `src/pages/admin/UserManagement.tsx`
- `src/hooks/useAuth.tsx`
- `src/pages/Login.tsx`
- `src/App.tsx`

## Technical details

```text
Current flow:
Browser -> hardcoded proxy URL -> old/mismatched backend -> enum error

Correct flow:
Browser -> project env URL/key -> current backend schema -> role update succeeds
```

The current client file is effectively overriding the proper environment-based connection:

```text
createClient(PROXY_URL || supabaseUrl, FALLBACK_ANON_KEY, ...)
```

Because `PROXY_URL` is a non-empty string, it always wins.

## Expected result after fix

You should then be able to change a user from:
- Production Manager (`worker`)
to
- Inventory Manager (`inventory_manager`)

without the enum error.

## Note
There is also a separate console warning about `SelectContent` refs and dialog descriptions, but that is **not** the reason the role update fails. The role failure is a backend target mismatch caused by the hardcoded proxy client setup.
