import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OLD_URL = "https://zzbpgwivxvkhabphxjqt.supabase.co";
const OLD_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6YnBnd2l2eHZraGFiaHB4anF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTAzMTYsImV4cCI6MjA4NzU4NjMxNn0.cIAHZMeMdCN3tadOMwQcbH-tBXXSHaoAFwBGQ4bU7xI";

const NEW_URL = Deno.env.get("SUPABASE_URL")!;
const NEW_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchAllRows(client: any, table: string) {
  const allRows: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .range(from, from + pageSize - 1);
    if (error) {
      console.error(`Error fetching ${table}:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allRows;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { step } = body;

    // Step 1: Export data from old project
    if (step === "export") {
      const { email, password } = body;
      const oldClient = createClient(OLD_URL, OLD_ANON_KEY);
      const { data: authData, error: authError } = await oldClient.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        return new Response(JSON.stringify({ error: `Auth failed: ${authError.message}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tables = [
        "company_clients",
        "product_categories",
        "product_codes",
        "product_recipes",
        "raw_materials",
        "raw_material_stock_entries",
        "raw_material_usage",
        "production_entries",
        "stock_issues",
        "sales",
        "slitting_entries",
        "profiles",
        "user_roles",
      ];

      const exportData: Record<string, any[]> = {};
      const counts: Record<string, number> = {};

      for (const table of tables) {
        const rows = await fetchAllRows(oldClient, table);
        exportData[table] = rows;
        counts[table] = rows.length;
      }

      return new Response(JSON.stringify({ success: true, counts, data: exportData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Import data into new project
    if (step === "import") {
      const { data: importData, userIdMap } = body;
      const newClient = createClient(NEW_URL, NEW_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const results: Record<string, { inserted: number; errors: string[] }> = {};

      // Helper to remap user IDs
      const remap = (id: string | null) => {
        if (!id) return id;
        return userIdMap[id] || id;
      };

      // Insert order matters due to references
      const insertOrder = [
        "company_clients",
        "product_categories",
        "raw_materials",
        "product_codes",
        "product_recipes",
        "raw_material_stock_entries",
        "production_entries",
        "raw_material_usage",
        "stock_issues",
        "sales",
        "slitting_entries",
      ];

      for (const table of insertOrder) {
        const rows = importData[table] || [];
        if (rows.length === 0) {
          results[table] = { inserted: 0, errors: [] };
          continue;
        }

        // Remap user ID columns
        const remappedRows = rows.map((row: any) => {
          const newRow = { ...row };
          // Remap common user reference columns
          if (newRow.worker_id) newRow.worker_id = remap(newRow.worker_id);
          if (newRow.issued_by) newRow.issued_by = remap(newRow.issued_by);
          if (newRow.added_by) newRow.added_by = remap(newRow.added_by);
          if (newRow.sold_by) newRow.sold_by = remap(newRow.sold_by);
          if (newRow.slitting_manager_id) newRow.slitting_manager_id = remap(newRow.slitting_manager_id);
          return newRow;
        });

        // Insert in batches of 100
        const errors: string[] = [];
        let inserted = 0;
        for (let i = 0; i < remappedRows.length; i += 100) {
          const batch = remappedRows.slice(i, i + 100);
          const { error } = await newClient.from(table).upsert(batch, { onConflict: "id" });
          if (error) {
            errors.push(`Batch ${i}: ${error.message}`);
          } else {
            inserted += batch.length;
          }
        }
        results[table] = { inserted, errors };
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Create users in new project from profiles data
    if (step === "create_users") {
      const { profiles: profilesList, userRoles } = body;
      const newClient = createClient(NEW_URL, NEW_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const userIdMap: Record<string, string> = {};
      const userResults: any[] = [];

      for (const profile of profilesList) {
        const email = profile.username; // username stores email
        if (!email) continue;

        // Create user in new project via admin API
        const { data: userData, error: userError } =
          await newClient.auth.admin.createUser({
            email,
            password: "TempPass123!", // temporary password, users must reset
            email_confirm: true,
            user_metadata: {
              name: profile.name,
              employee_id: profile.employee_id,
              requested_department: profile.requested_department,
            },
          });

        if (userError) {
          // User might already exist
          if (userError.message?.includes("already been registered")) {
            // Look up existing user
            const { data: existingUsers } = await newClient.auth.admin.listUsers();
            const existing = existingUsers?.users?.find((u: any) => u.email === email);
            if (existing) {
              userIdMap[profile.user_id] = existing.id;
              userResults.push({ email, status: "exists", oldId: profile.user_id, newId: existing.id });
            }
          } else {
            userResults.push({ email, status: "error", error: userError.message });
          }
          continue;
        }

        if (userData?.user) {
          userIdMap[profile.user_id] = userData.user.id;
          userResults.push({ email, status: "created", oldId: profile.user_id, newId: userData.user.id });

          // Create profile for new user
          await newClient.from("profiles").upsert({
            user_id: userData.user.id,
            name: profile.name,
            employee_id: profile.employee_id,
            username: profile.username,
            requested_department: profile.requested_department,
            status: profile.status,
          }, { onConflict: "user_id" });

          // Assign roles
          const roles = (userRoles || []).filter((r: any) => r.user_id === profile.user_id);
          for (const roleEntry of roles) {
            await newClient.from("user_roles").upsert({
              user_id: userData.user.id,
              role: roleEntry.role,
            }, { onConflict: "user_id,role" });
          }
        }
      }

      return new Response(JSON.stringify({ success: true, userIdMap, userResults }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 4: Reset password for a user
    if (step === "reset_password") {
      const { user_id, new_password } = body;
      const newClient = createClient(NEW_URL, NEW_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error } = await newClient.auth.admin.updateUserById(user_id, {
        password: new_password,
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid step." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Migration error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});