import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NEW_URL = Deno.env.get("SUPABASE_URL")!;
const NEW_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const body = await req.json();
    const { step } = body;

    const adminClient = createClient(NEW_URL, NEW_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (step === "create_users") {
      const { profiles, userRoles } = body;
      const userIdMap: Record<string, string> = {};
      const results: any[] = [];

      for (const profile of profiles) {
        const email = profile.username;
        if (!email) continue;

        // Try to create user
        const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
          email,
          password: "TempPass2026!",
          email_confirm: true,
          user_metadata: {
            name: profile.name,
            employee_id: profile.employee_id,
            requested_department: profile.requested_department,
          },
        });

        let newUserId: string | null = null;

        if (userError) {
          if (userError.message?.includes("already been registered")) {
            const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
            const existing = listData?.users?.find((u: any) => u.email === email.toLowerCase());
            if (existing) newUserId = existing.id;
          }
          if (!newUserId) {
            results.push({ email, status: "error", error: userError.message });
            continue;
          }
        } else {
          newUserId = userData?.user?.id || null;
        }

        if (newUserId) {
          userIdMap[profile.user_id] = newUserId;
          results.push({ email, status: userError ? "exists" : "created", oldId: profile.user_id, newId: newUserId });

          // Upsert profile
          await adminClient.from("profiles").upsert({
            user_id: newUserId,
            name: profile.name,
            employee_id: profile.employee_id,
            username: profile.username,
            requested_department: profile.requested_department,
            status: profile.status,
          }, { onConflict: "user_id" });

          // Assign roles
          const roles = (userRoles || []).filter((r: any) => r.user_id === profile.user_id);
          for (const roleEntry of roles) {
            await adminClient.from("user_roles").insert({
              user_id: newUserId,
              role: roleEntry.role,
            }).select();
          }
        }
      }

      return new Response(JSON.stringify({ success: true, userIdMap, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (step === "import_data") {
      const { tableData, userIdMap } = body;
      const remap = (id: string | null) => id ? (userIdMap[id] || id) : id;
      const importResults: Record<string, any> = {};

      for (const [table, rows] of Object.entries(tableData)) {
        if (!Array.isArray(rows) || rows.length === 0) {
          importResults[table] = { inserted: 0 };
          continue;
        }

        const remapped = (rows as any[]).map((row: any) => {
          const r = { ...row };
          // Remove auto-generated id to avoid conflicts
          // Actually keep ids to preserve references
          if (r.worker_id) r.worker_id = remap(r.worker_id);
          if (r.issued_by) r.issued_by = remap(r.issued_by);
          if (r.added_by) r.added_by = remap(r.added_by);
          if (r.sold_by) r.sold_by = remap(r.sold_by);
          if (r.slitting_manager_id) r.slitting_manager_id = remap(r.slitting_manager_id);
          if (r.user_id) r.user_id = remap(r.user_id);
          return r;
        });

        let inserted = 0;
        const errors: string[] = [];
        for (let i = 0; i < remapped.length; i += 50) {
          const batch = remapped.slice(i, i + 50);
          const { error } = await adminClient.from(table).upsert(batch, { onConflict: "id" });
          if (error) {
            errors.push(`batch ${i}: ${error.message}`);
          } else {
            inserted += batch.length;
          }
        }
        importResults[table] = { inserted, errors };
      }

      return new Response(JSON.stringify({ success: true, results: importResults }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid step" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});