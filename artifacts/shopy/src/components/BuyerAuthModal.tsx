import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, X, User, Loader2 } from "lucide-react";
import { buyerSupabase } from "@/lib/buyer-supabase";
import { supabase } from "@/lib/supabase";
import { useBuyerAuth } from "@/lib/buyer-auth-context";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Tab = "login" | "signup";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : true
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

function PasswordInput({
  value, onChange, placeholder, error,
}: {
  value: string; onChange: (v: string) => void; placeholder: string; error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`pr-10 rounded-lg text-base focus-visible:ring-purple-500 ${error ? "border-red-500 focus-visible:ring-red-400" : ""}`}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!email.includes("@")) errs.email = "Enter a valid email";
    if (!password) errs.password = "Password is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});
    const { data, error } = await buyerSupabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        setErrors({ general: "Please confirm your email first — check your inbox for a verification link." });
      } else {
        setErrors({ general: error.message });
      }
      return;
    }

    const name = data.user?.user_metadata?.full_name ?? email.split("@")[0];
    toast.success(`Welcome back, ${name}! 👋`, { duration: 3000 });
    onSuccess();
  };

  const handleForgot = async () => {
    if (!email.includes("@")) { setErrors({ email: "Enter your email first" }); return; }
    await buyerSupabase.auth.resetPasswordForEmail(email);
    setForgotSent(true);
    toast.success("Password reset email sent!");
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4 pt-2">
      <div>
        <label className="text-sm font-medium mb-1 block">Email</label>
        <Input
          type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors({}); }}
          placeholder="you@example.com"
          className={`rounded-lg text-base focus-visible:ring-purple-500 ${errors.email ? "border-red-500" : ""}`}
        />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Password</label>
        <PasswordInput value={password} onChange={v => { setPassword(v); setErrors({}); }} placeholder="Your password" error={errors.password} />
      </div>
      {errors.general && <p className="text-xs text-red-500">{errors.general}</p>}
      <Button type="submit" disabled={loading} className="w-full rounded-full bg-purple-600 hover:bg-purple-700 h-11">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Login"}
      </Button>
      <button
        type="button"
        onClick={handleForgot}
        className="w-full text-center text-sm text-purple-600 hover:underline"
      >
        {forgotSent ? "Reset email sent ✓" : "Forgot password?"}
      </button>
    </form>
  );
}

function SignupForm({ onSuccess, onSwitchTab }: { onSuccess: () => void; onSwitchTab: (tab: Tab) => void }) {
  const { refreshProfile } = useBuyerAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Partial<typeof form & { general: string }>>({});
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors({}); };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!form.name.trim()) errs.name = "Full name is required";
    if (!form.email.includes("@")) errs.email = "Enter a valid email";
    if (!/^\d{10}$/.test(form.phone)) errs.phone = "Enter a valid 10-digit phone number";
    if (form.password.length < 8) errs.password = "Minimum 8 characters";
    if (form.password !== form.confirm) errs.confirm = "Passwords don't match";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});

    const { data, error } = await buyerSupabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name } },
    });

    if (error) {
      setLoading(false);
      const msg = error.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("email taken")) {
        setErrors({ general: "already_exists" });
      } else {
        setErrors({ general: error.message });
      }
      return;
    }

    // Supabase quirk: when email confirmation is on + email already exists,
    // it returns a user with empty identities instead of an error
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setLoading(false);
      setErrors({ general: "already_exists" });
      return;
    }

    if (data.user) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const { error: insertErr } = await buyerSupabase.from("buyers").upsert({
        id: data.user.id,
        full_name: form.name,
        phone: form.phone,
        email: form.email,
      });
      if (insertErr) console.error("[BuyerAuth] profile insert error:", insertErr.message);
    }

    setLoading(false);

    if (!data.session) {
      setConfirmationSent(true);
      return;
    }

    await refreshProfile();
    toast.success(`Welcome, ${form.name}! 🎉`, { duration: 3000 });
    onSuccess();
  };

  if (confirmationSent) {
    return (
      <div className="py-8 text-center space-y-4">
        <div className="text-5xl">📧</div>
        <h3 className="font-bold text-lg">Check your email</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We've sent a confirmation link to <span className="font-semibold text-foreground">{form.email}</span>.
          <br />Click it to verify your account, then log in below.
        </p>
        <button
          type="button"
          onClick={() => setConfirmationSent(false)}
          className="text-sm text-purple-600 hover:underline font-medium"
        >
          ← Back to sign up
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSignup} className="space-y-4 pt-2">
      <div>
        <label className="text-sm font-medium mb-1 block">Full Name *</label>
        <Input value={form.name} onChange={e => set("name")(e.target.value)} placeholder="Your full name"
          className={`rounded-lg text-base focus-visible:ring-purple-500 ${errors.name ? "border-red-500" : ""}`} />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Email *</label>
        <Input type="email" value={form.email} onChange={e => set("email")(e.target.value)} placeholder="you@example.com"
          className={`rounded-lg text-base focus-visible:ring-purple-500 ${errors.email ? "border-red-500" : ""}`} />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Phone Number *</label>
        <Input value={form.phone} onChange={e => set("phone")(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="10-digit mobile number" inputMode="numeric" maxLength={10}
          className={`rounded-lg text-base focus-visible:ring-purple-500 ${errors.phone ? "border-red-500" : ""}`} />
        {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Password *</label>
        <PasswordInput value={form.password} onChange={set("password")} placeholder="Min. 8 characters" error={errors.password} />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Confirm Password *</label>
        <PasswordInput value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" error={errors.confirm} />
      </div>
      {errors.general && (
        errors.general === "already_exists" ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            This email is already registered.{" "}
            <button
              type="button"
              onClick={() => onSwitchTab("login")}
              className="font-semibold underline underline-offset-2 hover:text-amber-900"
            >
              Log in instead →
            </button>
          </div>
        ) : (
          <p className="text-xs text-red-500">{errors.general}</p>
        )
      )}
      <Button type="submit" disabled={loading} className="w-full rounded-full bg-purple-600 hover:bg-purple-700 h-11">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
      </Button>
    </form>
  );
}

function AdaptiveSheet({
  open, onClose, children, maxHeight = "85vh",
}: {
  open: boolean; onClose: () => void; children: React.ReactNode; maxHeight?: string;
}) {
  const isMobile = useIsMobile();

  const mobileVariants = {
    hidden: { y: "100%" },
    visible: { y: 0 },
    exit: { y: "100%" },
  };

  const desktopVariants = {
    hidden: { opacity: 0, scale: 0.95, y: "-48%" },
    visible: { opacity: 1, scale: 1, y: "-50%" },
    exit: { opacity: 0, scale: 0.95, y: "-48%" },
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          {isMobile ? (
            <motion.div
              key="sheet-mobile"
              variants={mobileVariants}
              initial="hidden" animate="visible" exit="exit"
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[24px] shadow-2xl"
              style={{ maxWidth: 480, width: "100%", marginLeft: "auto", marginRight: "auto", left: 0, right: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              </div>
              <div style={{ maxHeight }} className="overflow-y-auto">
                {children}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="sheet-desktop"
              variants={desktopVariants}
              initial="hidden" animate="visible" exit="exit"
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed left-1/2 top-1/2 z-50 bg-white rounded-2xl shadow-2xl"
              style={{
                width: "min(480px, calc(100vw - 32px))",
                maxHeight: "min(90vh, 720px)",
                transform: "translateX(-50%) translateY(-50%)",
                overflowY: "auto",
              }}
              onClick={e => e.stopPropagation()}
            >
              {children}
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}

export function BuyerAuthModal({ open, onClose, defaultTab = "login" }: {
  open: boolean; onClose: () => void; defaultTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  return (
    <AdaptiveSheet open={open} onClose={onClose} maxHeight="85vh">
      <div className="px-6 pb-8">
        <div className="flex items-center justify-between mb-5 pt-4">
          <h2 className="text-xl font-bold">My Account</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b mb-5">
          {(["login", "signup"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 pb-2 text-sm font-semibold transition-colors capitalize ${
                tab === t
                  ? "border-b-2 border-purple-600 text-purple-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "login" ? "Login" : "Sign Up"}
            </button>
          ))}
        </div>

        {tab === "login" ? (
          <LoginForm onSuccess={onClose} />
        ) : (
          <SignupForm onSuccess={onClose} onSwitchTab={setTab} />
        )}
      </div>
    </AdaptiveSheet>
  );
}

export function BuyerAccountButton({
  onOpenAuth,
  variant = "icon",
}: {
  onOpenAuth: (tab?: Tab) => void;
  variant?: "icon" | "drawer";
}) {
  const { buyerSession, buyerProfile, buyerLoading, signOut } = useBuyerAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  if (buyerLoading) {
    if (variant === "drawer") {
      return <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />;
    }
    return null;
  }

  if (!buyerSession) {
    if (variant === "drawer") {
      return (
        <div className="space-y-2">
          <button
            onClick={() => onOpenAuth("login")}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            <User className="w-4 h-4" />
            Login to my account
          </button>
          <button
            onClick={() => onOpenAuth("signup")}
            className="w-full flex items-center justify-center gap-2 border border-purple-200 text-purple-600 hover:bg-purple-50 font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            Create account
          </button>
        </div>
      );
    }
    return (
      <button
        onClick={() => onOpenAuth("login")}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Login"
      >
        <User className="w-6 h-6 text-gray-600" />
      </button>
    );
  }

  const initial = (buyerProfile?.full_name ?? buyerSession.user.email ?? "?")[0].toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(o => !o)}
        className="w-9 h-9 rounded-full bg-purple-600 text-white font-bold text-sm flex items-center justify-center hover:bg-purple-700 transition-colors"
      >
        {initial}
      </button>
      <AnimatePresence>
        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-11 z-40 bg-white border rounded-2xl shadow-xl w-48 overflow-hidden"
            >
              <div className="px-4 py-3 border-b">
                <p className="font-semibold text-sm truncate">{buyerProfile?.full_name ?? "Buyer"}</p>
                <p className="text-xs text-muted-foreground truncate">{buyerSession.user.email}</p>
              </div>
              <button
                onClick={() => { setDropdownOpen(false); setShowOrders(true); }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
              >
                📦 My Orders
              </button>
              <button
                onClick={() => { setDropdownOpen(false); setShowProfile(true); }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
              >
                👤 My Profile
              </button>
              <button
                onClick={() => { setDropdownOpen(false); signOut(); }}
                className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors border-t"
              >
                Logout
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {showOrders && <BuyerOrdersSheet onClose={() => setShowOrders(false)} />}
      {showProfile && <BuyerProfileSheet onClose={() => setShowProfile(false)} />}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="text-2xl transition-transform hover:scale-110 active:scale-95">
          <span className={(hovered || value) >= n ? "text-amber-400" : "text-gray-200"}>★</span>
        </button>
      ))}
    </div>
  );
}

function BuyerOrdersSheet({ onClose }: { onClose: () => void }) {
  const { buyerSession } = useBuyerAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  // Review state
  const [existingReview, setExistingReview] = useState<any | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  useEffect(() => {
    if (!buyerSession) { setLoading(false); return; }
    supabase
      .from("orders")
      .select("*, products(name, images)")
      .eq("buyer_email", buyerSession.user.email)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setOrders(data ?? []); setLoading(false); });
  }, [buyerSession?.user.id]);

  // When a completed order is opened, check for an existing review
  useEffect(() => {
    if (!selected || selected.status !== "completed") {
      setExistingReview(null); setRating(0); setReviewText(""); setReviewDone(false);
      return;
    }
    setReviewLoading(true);
    supabase.from("reviews").select("*").eq("order_id", selected.id).maybeSingle()
      .then(({ data }) => { setExistingReview(data ?? null); setReviewLoading(false); });
  }, [selected?.id]);

  const submitReview = async () => {
    if (!selected || rating === 0) return;
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      shop_id: selected.shop_id,
      order_id: selected.id,
      rating,
      review_text: reviewText.trim() || null,
      buyer_name: selected.buyer_name,
      verified: true,
    });
    setSubmitting(false);
    if (error) { toast.error("Failed to submit review"); return; }
    setReviewDone(true);
    setExistingReview({ rating, review_text: reviewText.trim() || null });
    toast.success("Review submitted! Thank you ⭐");
  };

  const statusColor = (s: string) =>
    s === "confirmed"  ? "bg-green-100 text-green-700" :
    s === "completed"  ? "bg-blue-100 text-blue-700" :
    s === "declined"   ? "bg-red-100 text-red-700" :
    "bg-yellow-100 text-yellow-700";

  return (
    <>
      <AdaptiveSheet open={true} onClose={onClose} maxHeight="80vh">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-xl font-bold">My Orders</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>}
          {!loading && orders.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-4xl mb-3">📦</p>
              <p className="font-medium">No orders yet</p>
              <p className="text-sm">Your orders will appear here after you buy something</p>
            </div>
          )}
          {orders.map(order => (
            <button key={order.id} onClick={() => setSelected(order)}
              className="w-full text-left bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-colors">
              <div className="flex gap-3 items-start">
                {order.products?.images?.[0] && (
                  <img src={order.products.images[0]} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{order.products?.name ?? "Product"}</p>
                  <p className="text-xs text-muted-foreground">Order ID: {order.order_id}</p>
                  <p className="font-bold text-purple-600 text-sm">₹{order.amount}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${statusColor(order.status)}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </AdaptiveSheet>

      {selected && (
        <AdaptiveSheet open={true} onClose={() => setSelected(null)} maxHeight="85vh">
          <div className="flex items-center justify-between px-6 py-4 border-b mb-4">
            <h3 className="font-bold text-lg">Order Details</h3>
            <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
          </div>
          <div className="px-6 pb-8 space-y-4">
            <div className="flex items-center gap-3">
              {selected.products?.images?.[0] && (
                <img src={selected.products.images[0]} alt="" className="w-20 h-20 rounded-xl object-cover" />
              )}
              <div>
                <p className="font-bold">{selected.products?.name}</p>
                <p className="text-2xl font-extrabold text-purple-600">₹{selected.amount}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Order ID</span><span className="font-mono font-bold">{selected.order_id}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(selected.status)}`}>
                  {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
                </span>
              </div>
              {selected.size && <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span>{selected.size}</span></div>}
              {selected.quantity && <div className="flex justify-between"><span className="text-muted-foreground">Qty</span><span>{selected.quantity}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{new Date(selected.created_at).toLocaleDateString("en-IN")}</span></div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 text-sm space-y-1">
              <p className="font-medium mb-2">Delivery Address</p>
              <p>{selected.buyer_name} · {selected.buyer_phone}</p>
              <p className="text-muted-foreground">{selected.full_address}, {selected.city}, {selected.state_name} – {selected.pincode}</p>
            </div>

            {/* ── Review section (only for completed orders) ── */}
            {selected.status === "completed" && (
              <div className="border-t pt-4">
                {reviewLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-purple-600" /></div>
                ) : existingReview ? (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-2">⭐ Your Review</p>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <span key={n} className={`text-xl ${existingReview.rating >= n ? "text-amber-400" : "text-gray-200"}`}>★</span>
                      ))}
                    </div>
                    {existingReview.review_text && (
                      <p className="text-sm text-muted-foreground italic">"{existingReview.review_text}"</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Rate your experience</p>
                    <StarPicker value={rating} onChange={setRating} />
                    <textarea
                      value={reviewText}
                      onChange={e => setReviewText(e.target.value)}
                      placeholder="Share your thoughts (optional)"
                      rows={3}
                      className="w-full rounded-xl border border-input bg-gray-50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <Button
                      onClick={submitReview}
                      disabled={rating === 0 || submitting}
                      className="w-full rounded-full bg-purple-600 hover:bg-purple-700 h-11"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Review"}
                    </Button>
                    {rating === 0 && <p className="text-xs text-muted-foreground text-center">Tap a star to rate</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </AdaptiveSheet>
      )}
    </>
  );
}

function BuyerProfileSheet({ onClose }: { onClose: () => void }) {
  const { buyerSession, buyerProfile, refreshProfile } = useBuyerAuth();
  const [form, setForm] = useState({
    full_name: buyerProfile?.full_name ?? "",
    phone: buyerProfile?.phone ?? "",
    default_address: buyerProfile?.default_address ?? "",
    default_city: buyerProfile?.default_city ?? "",
    default_state: buyerProfile?.default_state ?? "",
    default_pincode: buyerProfile?.default_pincode ?? "",
  });
  const [saving, setSaving] = useState(false);

  const set = useCallback(
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value })),
    []
  );

  const handleSave = async () => {
    if (!buyerSession) return;
    setSaving(true);
    const { error } = await buyerSupabase.from("buyers").upsert(
      {
        id: buyerSession.user.id,
        email: buyerSession.user.email ?? "",
        ...form,
      },
      { onConflict: "id" }
    );
    if (error) {
      toast.error(`Could not save: ${error.message}`);
      setSaving(false);
      return;
    }
    await refreshProfile();
    setSaving(false);
    toast.success("Profile saved!");
    onClose();
  };

  return (
    <AdaptiveSheet open={true} onClose={onClose} maxHeight="85vh">
      <div className="flex items-center justify-between px-6 py-4 border-b mb-5">
        <h2 className="text-xl font-bold">My Profile</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
      </div>
      <div className="px-6 pb-8 space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Full Name</label>
          <Input value={form.full_name} onChange={set("full_name")} placeholder="Your full name"
            className="rounded-lg text-base focus-visible:ring-purple-500" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Phone Number</label>
          <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
            placeholder="10-digit number" inputMode="numeric" maxLength={10}
            className="rounded-lg text-base focus-visible:ring-purple-500" />
        </div>
        <div className="pt-2 border-t">
          <p className="font-semibold text-sm mb-3">Default Delivery Address</p>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Address</label>
              <Input value={form.default_address} onChange={set("default_address")} placeholder="House No., Street, Area"
                className="rounded-lg text-base focus-visible:ring-purple-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">City</label>
                <Input value={form.default_city} onChange={set("default_city")} placeholder="Mumbai"
                  className="rounded-lg text-base focus-visible:ring-purple-500" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Pincode</label>
                <Input value={form.default_pincode} onChange={e => setForm(f => ({ ...f, default_pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                  placeholder="400001" inputMode="numeric" maxLength={6}
                  className="rounded-lg text-base focus-visible:ring-purple-500" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">State</label>
              <Input value={form.default_state} onChange={set("default_state")} placeholder="Maharashtra"
                className="rounded-lg text-base focus-visible:ring-purple-500" />
            </div>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full rounded-full bg-purple-600 hover:bg-purple-700 h-11 mt-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
        </Button>
      </div>
    </AdaptiveSheet>
  );
}
