import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "super_admin" | "admin" | "worker" | "inventory_manager" | "pending" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  profileName: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, employeeId: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isPending: boolean;
  isWorker: boolean;
  isInventoryManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string, retries = 3) => {
    const { data } = await supabase.rpc("get_user_role", { _user_id: userId });
    if (data) {
      setRole(data as AppRole);
    } else if (retries > 0) {
      setTimeout(() => fetchRole(userId, retries - 1), 1000);
    } else {
      setRole("pending");
    }
  };

  const fetchProfile = async (userId: string, retries = 3) => {
    const { data } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", userId)
      .maybeSingle();
    if (data?.name) {
      setProfileName(data.name);
    } else if (retries > 0) {
      setTimeout(() => fetchProfile(userId, retries - 1), 1000);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            fetchRole(session.user.id);
            fetchProfile(session.user.id);
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
        supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, name: string, employeeId: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, employee_id: employeeId },
      },
    });
    if (error) return { error: error as Error | null };
    return { error: null };
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
        signUp,
        signOut,
        isAdmin: role === "admin" || role === "super_admin",
        isSuperAdmin: role === "super_admin",
        isWorker: role === "worker",
        isPending: role === "pending",
        isInventoryManager: role === "inventory_manager",
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
