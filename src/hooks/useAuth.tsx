import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "super_admin" | "admin" | "worker" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  profileName: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isWorker: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureAccountProvisioned = async () => {
    const { data, error } = await supabase.functions.invoke("bootstrap-worker-access");
    return !(error || data?.error);
  };

  const fetchRole = async (userId: string) => {
    const { data } = await supabase.rpc("get_user_role", { _user_id: userId });
    let resolvedRole = data as AppRole;

    if (!resolvedRole) {
      const provisioned = await ensureAccountProvisioned();
      if (provisioned) {
        const { data: retryRole } = await supabase.rpc("get_user_role", { _user_id: userId });
        resolvedRole = retryRole as AppRole;
      }
    }

    setRole(resolvedRole ?? null);
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", userId)
      .single();
    setProfileName(data?.name ?? null);
  };

  const loadUserContext = async (userId: string) => {
    await fetchRole(userId);
    await fetchProfile(userId);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            loadUserContext(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setProfileName(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // Clear stale/corrupt session
        supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserContext(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setProfileName(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        profileName,
        loading,
        signIn,
        signOut,
        isAdmin: role === "admin" || role === "super_admin",
        isSuperAdmin: role === "super_admin",
        isWorker: role === "worker",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
