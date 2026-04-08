import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Lovable's publisher looks for these exact environment variable declarations
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Original proxy URL for Indian ISPs and hardcoded key for local dev
const PROXY_URL = "https://chhaperia-supabase-proxy.chhaperia.workers.dev";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6YnBnd2l2eHZraGFiaHB4anF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTAzMTYsImV4cCI6MjA4NzU4NjMxNn0.cIAHZMeMdCN3tadOMwQcbH-tBXXSHaoAFwBGQ4bU7xI";

export const supabase = createClient<Database>(PROXY_URL || supabaseUrl, FALLBACK_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
