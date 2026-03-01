import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = "https://chhaperia-supabase-proxy.chhaperia.workers.dev";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6YnBnd2l2eHZraGFiaHB4anF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTAzMTYsImV4cCI6MjA4NzU4NjMxNn0.cIAHZMeMdCN3tadOMwQcbH-tBXXSHaoAFwBGQ4bU7xI";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
