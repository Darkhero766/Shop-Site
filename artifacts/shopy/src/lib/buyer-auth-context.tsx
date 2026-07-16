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
    const { data, error } = await buyerSupabase
      .from("buyers")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) console.error("[BuyerAuth] fetchProfile error:", error.message, error.code);
    setBuyerProfile(data ?? null);
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
    buyerSupabase.auth.getSession().then(async ({ data: { session } }) => {
      setBuyerSession(session);
      if (session?.user.id) {
        hadSession.current = true;
        await fetchProfile(session.user.id);
      }
      setBuyerLoading(false);
    });

    const { data: { subscription } } = buyerSupabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        hadSession.current = true;
        setBuyerSession(session);
        if (session?.user.id) await fetchProfile(session.user.id);
        setBuyerLoading(false);
      } else if (event === "SIGNED_OUT") {
        setBuyerSession(null);
        setBuyerProfile(null);
        setBuyerLoading(false);
        if (hadSession.current && !intentionalSignOut.current) {
          toast.info("Your session expired. Please log in again.", {
            duration: 6000,
            action: { label: "Login", onClick: () => {} },
          });
        }
        hadSession.current = false;
        intentionalSignOut.current = false;
      } else {
        setBuyerSession(session);
        if (session?.user.id) {
          await fetchProfile(session.user.id);
        } else {
          setBuyerProfile(null);
        }
        setBuyerLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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
