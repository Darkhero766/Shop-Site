import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { supabase, Shop, Product, uploadImage } from "@/lib/supabase";
import { buyerSupabase } from "@/lib/buyer-supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Copy, Check, CheckCircle2, MapPin, PlusCircle, Loader2 } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBuyerAuth } from "@/lib/buyer-auth-context";
import { BuyerAuthModal } from "@/components/BuyerAuthModal";
import { UPIPayment } from "@/components/UPIPayment";

// ─── Constants ────────────────────────────────────────────────────────────────

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
  "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
  "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands",
  "Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi",
  "Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

function generateOrderId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return "ORD-" + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ─── Types ────────────────────────────────────────────────────────────────────

type BuyerData = {
  name: string; phone: string; email: string;
  address: string; city: string; pincode: string;
  state: string; instructions: string;
};

type CartData = { size: string | null; quantity: number };

// ─── Progress Bar (steps 2, 3, 4) ────────────────────────────────────────────

function ProgressBar({ current }: { current: 2 | 3 | 4 }) {
  const steps = ["Details", "Payment", "Done"];
  const idx = current - 2;
  return (
    <div className="flex items-center px-4 py-3 bg-background border-b">
      {steps.map((label, i) => (
        <div key={label} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < idx ? "bg-emerald-500 text-white" :
              i === idx ? "bg-primary text-primary-foreground" :
              "bg-muted text-muted-foreground"
            }`}>
              {i < idx ? "✓" : i + 1}
            </div>
            <span className={`text-xs font-medium ${i === idx ? "text-primary font-semibold" : "text-muted-foreground"}`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-3 ${i < idx ? "bg-emerald-500" : "bg-muted"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Product Detail ───────────────────────────────────────────────────

function ProductStep({ product, shop, onProceed, onBack }: {
  product: Product; shop: Shop;
  onProceed: (cart: CartData) => void;
  onBack: () => void;
}) {
  const [emblaRef] = useEmblaCarousel({ loop: false });
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { buyerSession } = useBuyerAuth();

  const images = product.images?.filter(Boolean) ?? [];
  const total = product.price * quantity;
  const hasSizes = (product.sizes?.length ?? 0) > 0;

  const handleBuyNow = () => {
    if (hasSizes && !selectedSize) { setSizeError(true); return; }
    onProceed({ size: selectedSize, quantity });
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background border-b flex items-center px-4 h-14">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold ml-2 truncate">{shop.shop_name}</h1>
      </header>

      {images.length > 0 ? (
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {images.map((img, i) => (
              <div key={i} className="flex-[0_0_100%] min-w-0 aspect-square">
                <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="aspect-square bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-sm">No image</span>
        </div>
      )}

      <div className="flex-1 px-4 py-6 pb-36 space-y-6 max-w-lg mx-auto w-full">
        <div>
          <h2 className="text-2xl font-bold">{product.name}</h2>
          <p className="text-2xl font-bold text-primary mt-1">₹{product.price}</p>
          {product.description && (
            <p className="text-muted-foreground mt-3 leading-relaxed">{product.description}</p>
          )}
        </div>

        {hasSizes && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Select Size</h3>
              {sizeError && <span className="text-xs text-destructive">— Please select a size</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes!.map(size => (
                <button key={size}
                  onClick={() => { setSelectedSize(size); setSizeError(false); }}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                    selectedSize === size
                      ? "bg-primary text-primary-foreground border-primary"
                      : `border-border hover:border-primary/50 ${sizeError ? "border-destructive/30" : ""}`
                  }`}
                >{size}</button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Quantity</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-full border flex items-center justify-center text-xl font-medium hover:bg-muted transition-colors"
            >−</button>
            <span className="text-xl font-bold w-8 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(q => Math.min(10, q + 1))}
              className="w-10 h-10 rounded-full border flex items-center justify-center text-xl font-medium hover:bg-muted transition-colors"
            >+</button>
          </div>
        </div>

        {product.delivery_info && (
          <div className="bg-muted/50 rounded-xl p-4 text-sm">
            <p className="font-medium mb-1">Delivery Info</p>
            <p className="text-muted-foreground">{product.delivery_info}</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t px-4 py-4">
        <div className="flex flex-col gap-2 max-w-lg mx-auto">
          {!buyerSession && (
            <p className="text-xs text-center text-muted-foreground">
              <button onClick={() => setAuthOpen(true)} className="text-purple-600 font-medium hover:underline">Login</button>
              {" "}to track your orders and auto-fill your address
            </p>
          )}
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold text-primary">₹{total}</p>
            </div>
            <Button className="flex-1 rounded-full h-12 text-base" onClick={handleBuyNow}>
              Buy Now
            </Button>
          </div>
        </div>
      </div>

      <BuyerAuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultTab="login" />
    </div>
  );
}

// ─── Step 2: Buyer Details ────────────────────────────────────────────────────

function DetailsStep({ product, cart, initialData, onProceed, onBack }: {
  product: Product; cart: CartData; initialData: BuyerData;
  onProceed: (buyer: BuyerData) => void;
  onBack: () => void;
}) {
  const { buyerProfile, buyerSession, buyerLoading } = useBuyerAuth();
  const hasSavedAddress = !buyerLoading && !!buyerProfile?.default_address;
  const [authOpen, setAuthOpen] = useState(false);

  const savedData: BuyerData = {
    name: buyerProfile?.full_name ?? "",
    phone: buyerProfile?.phone ?? "",
    email: buyerSession?.user.email ?? "",
    address: buyerProfile?.default_address ?? "",
    city: buyerProfile?.default_city ?? "",
    pincode: buyerProfile?.default_pincode ?? "",
    state: buyerProfile?.default_state ?? "",
    instructions: "",
  };

  // "saved" = use saved profile; "new" = enter new address
  const [mode, setMode] = useState<"saved" | "new">("new");
  const [modeChosen, setModeChosen] = useState(false);
  const [form, setForm] = useState<BuyerData>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof BuyerData, string>>>({});
  const [saveForNext, setSaveForNext] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Switch to saved mode once profile finishes loading (if user hasn't manually chosen)
  useEffect(() => {
    if (!buyerLoading && !modeChosen && buyerProfile?.default_address) {
      setMode("saved");
    }
  }, [buyerLoading, buyerProfile, modeChosen]);

  const switchMode = (m: "saved" | "new") => { setModeChosen(true); setMode(m); };

  const set = (key: keyof BuyerData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [key]: e.target.value }));
      setErrors(er => ({ ...er, [key]: undefined }));
    };

  const validate = (data: BuyerData): boolean => {
    const e: Partial<Record<keyof BuyerData, string>> = {};
    if (!data.name.trim()) e.name = "Full name is required";
    if (!/^\d{10}$/.test(data.phone)) e.phone = "Enter a valid 10-digit phone number";
    if (!data.address.trim()) e.address = "Address is required";
    if (!data.city.trim()) e.city = "City is required";
    if (!/^\d{6}$/.test(data.pincode)) e.pincode = "Enter a valid 6-digit pincode";
    if (!data.state) e.state = "Select your state";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleProceed = async () => {
    const data = mode === "saved" ? savedData : form;
    if (!validate(data)) return;

    if (mode === "new" && saveForNext && buyerSession) {
      setIsSaving(true);
      const { error: upsertErr } = await buyerSupabase.from("buyers").upsert({
        id: buyerSession.user.id,
        full_name: form.name,
        phone: form.phone,
        default_address: form.address,
        default_city: form.city,
        default_pincode: form.pincode,
        default_state: form.state,
      }, { onConflict: "id" });
      if (upsertErr) console.error("[Checkout] buyer upsert failed:", upsertErr.message);
      setIsSaving(false);
    }

    onProceed(data);
  };

  const total = product.price * cart.quantity;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background border-b flex items-center px-4 h-14">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold ml-2">Delivery Details</h1>
      </header>
      <ProgressBar current={2} />

      <div className="flex-1 px-4 py-6 pb-28 space-y-5 max-w-lg mx-auto w-full">
        {!buyerSession && (
          <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
            <span className="text-sm text-purple-700">
              <strong>Tip:</strong> Login to auto-fill your address and track orders
            </span>
            <button
              onClick={() => setAuthOpen(true)}
              className="ml-auto text-xs font-semibold text-purple-600 underline whitespace-nowrap"
            >
              Login
            </button>
          </div>
        )}
        {/* Order summary */}
        <div className="bg-muted/30 rounded-2xl p-4 flex gap-3 items-center">
          {product.images?.[0] && (
            <img src={product.images[0]} alt={product.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{product.name}</p>
            <div className="flex gap-3 text-sm text-muted-foreground">
              {cart.size && <span>Size: {cart.size}</span>}
              <span>Qty: {cart.quantity}</span>
            </div>
            <p className="font-bold text-primary">₹{total}</p>
          </div>
        </div>

        {/* Address choice — only shown when buyer has a saved address */}
        {hasSavedAddress && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Where should we deliver?</p>

            {/* Saved address card */}
            <button
              type="button"
              onClick={() => switchMode("saved")}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                mode === "saved"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                  mode === "saved" ? "border-primary" : "border-muted-foreground"
                }`}>
                  {mode === "saved" && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-sm font-semibold text-primary">Saved address</span>
                  </div>
                  <p className="font-medium text-sm">{savedData.name} · {savedData.phone}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {savedData.address}, {savedData.city}, {savedData.state} – {savedData.pincode}
                  </p>
                </div>
                {mode === "saved" && (
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                )}
              </div>
            </button>

            {/* New address card */}
            <button
              type="button"
              onClick={() => switchMode("new")}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                mode === "new"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                  mode === "new" ? "border-primary" : "border-muted-foreground"
                }`}>
                  {mode === "new" && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <PlusCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold">Enter a different address</span>
              </div>
            </button>
          </div>
        )}

        {/* Form fields — shown when entering new or no saved address */}
        {mode === "new" && (
          <div className="space-y-4">
            {hasSavedAddress && (
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">New delivery address</p>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Full Name *</label>
              <Input value={form.name} onChange={set("name")} placeholder="Your full name"
                className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone Number *</label>
              <Input value={form.phone} onChange={set("phone")} placeholder="10-digit mobile number"
                maxLength={10} inputMode="numeric"
                className={errors.phone ? "border-destructive focus-visible:ring-destructive" : ""} />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Input value={form.email} onChange={set("email")} placeholder="your@email.com" type="email" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Full Address *</label>
              <Textarea value={form.address} onChange={set("address")} placeholder="House No., Street, Area, Landmark"
                className={`resize-none ${errors.address ? "border-destructive focus-visible:ring-destructive" : ""}`} rows={3} />
              {errors.address && <p className="text-xs text-destructive mt-1">{errors.address}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">City *</label>
                <Input value={form.city} onChange={set("city")} placeholder="Mumbai"
                  className={errors.city ? "border-destructive focus-visible:ring-destructive" : ""} />
                {errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Pincode *</label>
                <Input value={form.pincode} onChange={set("pincode")} placeholder="400001"
                  maxLength={6} inputMode="numeric"
                  className={errors.pincode ? "border-destructive focus-visible:ring-destructive" : ""} />
                {errors.pincode && <p className="text-xs text-destructive mt-1">{errors.pincode}</p>}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">State *</label>
              <Select value={form.state} onValueChange={v => { setForm(f => ({ ...f, state: v })); setErrors(e => ({ ...e, state: undefined })); }}>
                <SelectTrigger className={errors.state ? "border-destructive focus-visible:ring-destructive" : ""}>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.state && <p className="text-xs text-destructive mt-1">{errors.state}</p>}
            </div>

            {/* Save for next time — only if logged in */}
            {buyerSession && (
              <button
                type="button"
                onClick={() => setSaveForNext(v => !v)}
                className="flex items-center gap-2.5 w-full text-left"
              >
                <div className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                  saveForNext ? "bg-primary border-primary" : "border-muted-foreground"
                }`}>
                  {saveForNext && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <span className="text-sm text-muted-foreground">Save this address to my account for next time</span>
              </button>
            )}
          </div>
        )}

        {/* Special instructions — always shown */}
        <div>
          <label className="text-sm font-medium mb-1 block">Special Instructions <span className="text-muted-foreground font-normal">(optional)</span></label>
          <Textarea
            value={mode === "saved" ? savedData.instructions : form.instructions}
            onChange={mode === "new" ? set("instructions") : undefined}
            readOnly={mode === "saved"}
            placeholder="Any delivery notes or preferences..."
            className="resize-none"
            rows={2}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t px-4 py-4">
        <div className="max-w-lg mx-auto">
          <Button className="w-full rounded-full h-12 text-base" onClick={handleProceed} disabled={isSaving}>
            {isSaving ? "Saving…" : "Proceed to Payment"}
          </Button>
        </div>
      </div>

      <BuyerAuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultTab="login" />
    </div>
  );
}

// ─── Step 3: Payment ──────────────────────────────────────────────────────────

function PaymentStep({ product, shop, cart, orderId, onProceed, onBack }: {
  product: Product; shop: Shop; cart: CartData;
  orderId: string;
  onProceed: (utr: string | null, screenshotUrl: string | null) => Promise<void>;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const total = product.price * cart.quantity;

  const handleUTR = async (utr: string) => {
    setIsSubmitting(true);
    try {
      const { data: existing } = await supabase.from("orders").select("id").eq("utr", utr).maybeSingle();
      if (existing) {
        toast.error("This transaction ID has already been used. Check your payment app and enter the correct UTR.");
        setIsSubmitting(false);
        return;
      }
      await onProceed(utr, null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background border-b flex items-center px-4 h-14">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold ml-2">Payment</h1>
      </header>
      <ProgressBar current={3} />

      <div className="flex-1 px-4 py-6 pb-10 space-y-4 max-w-lg mx-auto w-full">
        {/* Order summary */}
        <div className="bg-muted/30 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium">{product.name}</span>
            <span className="font-bold text-primary">₹{total}</span>
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            {cart.size && <span>Size: {cart.size}</span>}
            <span>Qty: {cart.quantity}</span>
          </div>
        </div>

        {/* Order ID */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Your Order ID</p>
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-lg text-primary">{orderId}</span>
            <button
              onClick={() => { navigator.clipboard.writeText(orderId); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-primary" />}
            </button>
          </div>
        </div>

        {/* Dynamic UPI payment */}
        {shop.upi_id ? (
          <UPIPayment
            upiId={shop.upi_id}
            shopName={shop.shop_name ?? "Shop"}
            amount={total}
            orderId={orderId}
            onPaymentSubmitted={handleUTR}
            isSubmitting={isSubmitting}
          />
        ) : (
          <div className="bg-muted rounded-2xl p-6 text-center text-muted-foreground text-sm">
            This seller hasn't set up UPI payments yet. Please contact them directly.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 4: Success ──────────────────────────────────────────────────────────

function SuccessStep({ product, cart, buyer, orderId, shopSlug }: {
  product: Product; cart: CartData; buyer: BuyerData;
  orderId: string; shopSlug: string;
}) {
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);
  const total = product.price * cart.quantity;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <ProgressBar current={4} />
      <div className="flex-1 flex flex-col items-center px-4 py-10 max-w-lg mx-auto w-full">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mb-6"
        >
          <Check className="w-12 h-12 text-emerald-500" strokeWidth={3} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="text-center mb-8">
          <h1 className="text-3xl font-extrabold mb-2">Order Placed!</h1>
          <p className="text-muted-foreground">Your order has been received and is pending confirmation</p>
        </motion.div>

        <div className="w-full bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Order ID</p>
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-xl text-primary">{orderId}</span>
            <button
              onClick={() => { navigator.clipboard.writeText(orderId); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-primary" />}
            </button>
          </div>
        </div>

        <div className="w-full bg-muted/30 rounded-2xl p-4 space-y-4 mb-6">
          <div className="flex gap-3 items-start">
            {product.images?.[0] && (
              <img src={product.images[0]} alt={product.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
            )}
            <div>
              <p className="font-semibold">{product.name}</p>
              <div className="flex gap-3 text-sm text-muted-foreground">
                {cart.size && <span>Size: {cart.size}</span>}
                <span>Qty: {cart.quantity}</span>
              </div>
              <p className="font-bold text-primary mt-1">₹{total}</p>
            </div>
          </div>
          <div className="border-t pt-3 space-y-1">
            <p className="font-medium text-sm">{buyer.name} · {buyer.phone}</p>
            <p className="text-sm text-muted-foreground">{buyer.address}, {buyer.city}, {buyer.state} – {buyer.pincode}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700">
            ⏱ Sellers typically confirm within 24 hours
          </div>
        </div>

        <Button className="w-full rounded-full h-12 text-base" onClick={() => navigate(`/?shop=${shopSlug}`)}>
          Back to Shop
        </Button>
      </div>
    </div>
  );
}

// ─── Main CheckoutFlow ────────────────────────────────────────────────────────

export default function CheckoutFlow({ shopSlug, productId }: { shopSlug: string; productId: string }) {
  const searchParams = new URLSearchParams(window.location.search);
  const preSize = searchParams.get("size");
  const preQty = parseInt(searchParams.get("qty") ?? "1", 10);
  const hasPreCart = searchParams.has("qty");

  const [step, setStep] = useState<1 | 2 | 3 | 4>(hasPreCart ? 2 : 1);
  const [shop, setShop] = useState<Shop | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<CartData>({ size: preSize, quantity: isNaN(preQty) ? 1 : preQty });
  const [buyer, setBuyer] = useState<BuyerData>({ name: "", phone: "", email: "", address: "", city: "", pincode: "", state: "", instructions: "" });
  const [orderId] = useState(() => generateOrderId());
  const [, navigate] = useLocation();
  const { buyerSession } = useBuyerAuth();

  useEffect(() => {
    async function load() {
      const [{ data: shopData }, { data: productData }] = await Promise.all([
        supabase.from("shops").select("*").eq("subdomain", shopSlug).maybeSingle(),
        supabase.from("products").select("*").eq("id", productId).maybeSingle(),
      ]);
      if (!shopData || !productData) {
        toast.error("Product not found");
        navigate(`/?shop=${shopSlug}`);
        return;
      }
      setShop(shopData);
      setProduct(productData);
      setIsLoading(false);
    }
    load();
  }, [shopSlug, productId, navigate]);

  const saveOrder = async (utr: string | null, screenshotUrl: string | null) => {
    if (!shop || !product) return;
    const { error } = await supabase.from("orders").insert({
      shop_id: shop.id,
      product_id: product.id,
      order_id: orderId,
      buyer_name: buyer.name,
      buyer_phone: buyer.phone,
      buyer_email: buyerSession?.user.email ?? buyer.email ?? null,
      full_address: buyer.address,
      city: buyer.city,
      pincode: buyer.pincode,
      state_name: buyer.state,
      special_instructions: buyer.instructions || null,
      size: cart.size,
      quantity: cart.quantity,
      amount: product.price * cart.quantity,
      utr: utr,
      payment_screenshot_url: screenshotUrl,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    setStep(4);
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!shop || !product) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {step === 1 && (
          <ProductStep
            product={product}
            shop={shop}
            onBack={() => navigate(`/?shop=${shopSlug}`)}
            onProceed={c => { setCart(c); setStep(2); }}
          />
        )}
        {step === 2 && (
          <DetailsStep
            product={product}
            cart={cart}
            initialData={buyer}
            onBack={() => setStep(1)}
            onProceed={b => { setBuyer(b); setStep(3); }}
          />
        )}
        {step === 3 && (
          <PaymentStep
            product={product}
            shop={shop}
            cart={cart}
            orderId={orderId}
            onBack={() => setStep(2)}
            onProceed={saveOrder}
          />
        )}
        {step === 4 && (
          <SuccessStep
            product={product}
            cart={cart}
            buyer={buyer}
            orderId={orderId}
            shopSlug={shopSlug}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
