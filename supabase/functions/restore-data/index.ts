import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is a super_admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || roleData.role !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Super admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { tables } = body;

    if (!tables || typeof tables !== "object") {
      return new Response(JSON.stringify({ error: "Invalid backup format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Restore order matters due to foreign keys
    const restoreOrder = [
      "product_categories",
      "company_clients",
      "profiles",
      "user_roles",
      "product_codes",
      "production_entries",
      "stock_issues",
    ];

    const results: Record<string, { inserted: number; errors: string[] }> = {};

    for (const table of restoreOrder) {
      const rows = tables[table];
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        results[table] = { inserted: 0, errors: [] };
        continue;
      }

      const errors: string[] = [];
      let inserted = 0;

      // Upsert in batches of 50
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);

        // Remove generated columns
        const cleanBatch = batch.map((row: Record<string, unknown>) => {
          const clean = { ...row };
          if (table === "production_entries") {
            delete clean.total_quantity; // generated column
          }
          return clean;
        });

        const { error } = await adminClient
          .from(table)
          .upsert(cleanBatch, { onConflict: "id", ignoreDuplicates: false });

        if (error) {
          errors.push(`Batch ${i}: ${error.message}`);
        } else {
          inserted += cleanBatch.length;
        }
      }

      results[table] = { inserted, errors };
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
