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
    let settled = false;

    buyerSupabase.auth.getSession().then(async ({ data: { session } }) => {
      if (settled) return;
      settled = true;
      setBuyerSession(session);
      if (session?.user.id) {
        hadSession.current = true;
        await fetchProfile(session.user.id);
      }
      setBuyerLoading(false);
    }).catch((err) => {
      console.error("[BuyerAuth] getSession error:", err);
      if (!settled) {
        settled = true;
        setBuyerLoading(false);
      }
    });

    const { data: { subscription } } = buyerSupabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (!settled) { settled = true; }
        hadSession.current = true;
        setBuyerSession(session);
        if (session?.user.id) await fetchProfile(session.user.id);
        setBuyerLoading(false);
      } else if (event === "SIGNED_OUT") {
        if (!settled) { settled = true; }
        setBuyerSession(null);
        setBuyerProfile(null);
        setBuyerLoading(false);
        if (hadSession.current && !intentionalSignOut.current) {
          toast.info("Session expired — tap the menu ☰ to log back in.", {
            duration: 8000,
          });
        }
        hadSession.current = false;
        intentionalSignOut.current = false;
      } else if (event === "INITIAL_SESSION") {
        if (settled) return;
        settled = true;
        setBuyerSession(session);
        if (session?.user.id) {
          hadSession.current = true;
          await fetchProfile(session.user.id);
        }
        setBuyerLoading(false);
      } else {
        setBuyerSession(session);
        if (session?.user.id) {
          await fetchProfile(session.user.id);
        } else {
          setBuyerProfile(null);
        }
        if (!settled) {
          settled = true;
          setBuyerLoading(false);
        }
      }
    });

    const safetyTimer = setTimeout(() => {
      if (!settled) {
        console.warn("[BuyerAuth] loading timed out — forcing done");
        settled = true;
        setBuyerLoading(false);
      }
    }, 4000);

    return () => {
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
