import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.email) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = (payload.email as string).toLowerCase();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Look up user by email in profiles
    const { data: profile } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("username", userEmail)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check super_admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.user_id)
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

      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);

        const cleanBatch = batch.map((row: Record<string, unknown>) => {
          const clean = { ...row };
          if (table === "production_entries") {
            delete clean.total_quantity;
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
