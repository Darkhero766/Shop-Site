import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session } from "@supabase/supabase-js";
import { buyerSupabase } from "./buyer-supabase";
import { toast } from "sonner";

export type BuyerProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string;
  default_address: string | null;
  default_city: string | null;
  default_state: string | null;
  default_pincode: string | null;
  created_at: string;
};

type BuyerAuthContextType = {
  buyerSession: Session | null;
  buyerProfile: BuyerProfile | null;
  buyerLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const BuyerAuthContext = createContext<BuyerAuthContextType>({
  buyerSession: null,
  buyerProfile: null,
  buyerLoading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function BuyerAuthProvider({ children }: { children: ReactNode }) {
  const [buyerSession, setBuyerSession] = useState<Session | null>(null);
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfile | null>(null);
  const [buyerLoading, setBuyerLoading] = useState(true);
  const intentionalSignOut = useRef(false);
  const hadSession = useRef(false);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await buyerSupabase
        .from("buyers")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) console.error("[BuyerAuth] fetchProfile error:", error.message, error.code);

      // First login after email confirmation — no profile exists yet, create one from user metadata
      if (!data && !error) {
        const { data: { user } } = await buyerSupabase.auth.getUser();
        if (user) {
          const { error: upsertErr } = await buyerSupabase.from("buyers").upsert({
            id: user.id,
            email: user.email ?? "",
            full_name: user.user_metadata?.full_name ?? null,
            phone: user.user_metadata?.phone ?? null,
          }, { onConflict: "id" });
          if (upsertErr) console.error("[BuyerAuth] auto-create profile error:", upsertErr.message);
          // Re-fetch after creating
          const { data: fresh } = await buyerSupabase.from("buyers").select("*").eq("id", userId).maybeSingle();
          setBuyerProfile(fresh ?? null);
          return;
        }
      }

      setBuyerProfile(data ?? null);
    } catch (err) {
      console.error("[BuyerAuth] fetchProfile threw:", err);
      setBuyerProfile(null);
    }
  }

  async function refreshProfile() {
    if (buyerSession?.user.id) await fetchProfile(buyerSession.user.id);
  }

  async function signOut() {
    intentionalSignOut.current = true;
    await buyerSupabase.auth.signOut();
    setBuyerSession(null);
    setBuyerProfile(null);
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: { session } } = await buyerSupabase.auth.getSession();
        if (!mounted) return;
        setBuyerSession(session);
        if (session?.user?.id) {
          hadSession.current = true;
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error("[BuyerAuth] init error:", err);
      } finally {
        if (mounted) setBuyerLoading(false);
      }
    }

    init();

    const { data: { subscription } } = buyerSupabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          hadSession.current = true;
          setBuyerSession(session);
          if (session?.user?.id) await fetchProfile(session.user.id);
          setBuyerLoading(false);
        } else if (event === "SIGNED_OUT") {
          setBuyerSession(null);
          setBuyerProfile(null);
          setBuyerLoading(false);
          if (hadSession.current && !intentionalSignOut.current) {
            toast.info("Session expired — tap menu to log back in.", { duration: 6000 });
          }
          hadSession.current = false;
          intentionalSignOut.current = false;
        }
      }
    );

    const safetyTimer = setTimeout(() => {
      if (mounted) setBuyerLoading(false);
    }, 3000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  return (
    <BuyerAuthContext.Provider value={{ buyerSession, buyerProfile, buyerLoading, refreshProfile, signOut }}>
      {children}
    </BuyerAuthContext.Provider>
  );
}

export function useBuyerAuth() {
  return useContext(BuyerAuthContext);
}
