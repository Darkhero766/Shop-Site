import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { supabase, Shop, Product, uploadImage } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Copy, Check, Upload, X, CheckCircle2 } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBuyerAuth } from "@/lib/buyer-auth-context";
import { BuyerAuthModal } from "@/components/BuyerAuthModal";

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
  const { buyerProfile } = useBuyerAuth();
  const hasSavedAddress = !!(buyerProfile?.default_address);
  const [usingSaved, setUsingSaved] = useState(hasSavedAddress);

  const buildFormFromProfile = (profile: typeof buyerProfile): BuyerData => ({
    name: profile?.full_name ?? initialData.name,
    phone: profile?.phone ?? initialData.phone,
    email: initialData.email,
    address: profile?.default_address ?? initialData.address,
    city: profile?.default_city ?? initialData.city,
    pincode: profile?.default_pincode ?? initialData.pincode,
    state: profile?.default_state ?? initialData.state,
    instructions: initialData.instructions,
  });

  const [form, setForm] = useState<BuyerData>(
    hasSavedAddress ? buildFormFromProfile(buyerProfile) : initialData
  );
  const [errors, setErrors] = useState<Partial<Record<keyof BuyerData, string>>>({}); 

  const set = (key: keyof BuyerData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [key]: e.target.value }));
      setErrors(er => ({ ...er, [key]: undefined }));
    };

  const validate = (): boolean => {
    const e: Partial<Record<keyof BuyerData, string>> = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!/^\d{10}$/.test(form.phone)) e.phone = "Enter a valid 10-digit phone number";
    if (!form.address.trim()) e.address = "Address is required";
    if (!form.city.trim()) e.city = "City is required";
    if (!/^\d{6}$/.test(form.pincode)) e.pincode = "Enter a valid 6-digit pincode";
    if (!form.state) e.state = "Select your state";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const total = product.price * cart.quantity;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background border-b flex items-center px-4 h-14">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold ml-2">Your Details</h1>
      </header>
      <ProgressBar current={2} />

      <div className="flex-1 px-4 py-6 pb-28 space-y-6 max-w-lg mx-auto w-full">
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

        {hasSavedAddress && (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm">
            <span className="flex items-center gap-1.5 text-green-700 font-medium">
              <CheckCircle2 className="w-4 h-4" /> Using saved address
            </span>
            <button
              type="button"
              onClick={() => { setUsingSaved(false); setForm(initialData); }}
              className="text-purple-600 hover:underline text-xs font-medium"
            >
              {usingSaved ? "Edit" : ""}
            </button>
          </div>
        )}

        <div className="space-y-4">
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
          <div>
            <label className="text-sm font-medium mb-1 block">Special Instructions <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Textarea value={form.instructions} onChange={set("instructions")}
              placeholder="Any delivery notes or preferences..." className="resize-none" rows={2} />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t px-4 py-4">
        <div className="max-w-lg mx-auto">
          <Button className="w-full rounded-full h-12 text-base"
            onClick={() => { if (validate()) onProceed(form); }}>
            Proceed to Payment
          </Button>
        </div>
      </div>
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
  const [utr, setUtr] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [activeMethod, setActiveMethod] = useState<"utr" | "screenshot" | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const total = product.price * cart.quantity;
  const utrValid = /^\d{12}$/.test(utr);
  const canSubmit = (activeMethod === "utr" && utrValid) || (activeMethod === "screenshot" && screenshotFile !== null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
    setActiveMethod("screenshot");
    setUtr("");
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (activeMethod === "utr") {
        const { data: existing } = await supabase.from("orders").select("id").eq("utr", utr).maybeSingle();
        if (existing) {
          toast.error("This transaction ID has already been used. Please recheck your payment app and enter the correct ID.");
          setIsSubmitting(false);
          return;
        }
        await onProceed(utr, null);
      } else if (activeMethod === "screenshot" && screenshotFile) {
        const ext = screenshotFile.name.split(".").pop() ?? "jpg";
        const path = `${shop.subdomain}/${orderId}.${ext}`;
        const { url, error } = await uploadImage("payment-screenshots", screenshotFile, path);
        if (error || !url) throw new Error(error ?? "Upload failed");
        await onProceed(null, url);
      }
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

      <div className="flex-1 px-4 py-6 pb-32 space-y-6 max-w-lg mx-auto w-full">
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

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Your Order ID</p>
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-lg text-primary">{orderId}</span>
            <button onClick={() => copy(orderId, "orderId")} className="p-2 hover:bg-primary/10 rounded-lg transition-colors">
              {copied === "orderId" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-primary" />}
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">Complete your payment using the QR below</p>

        <div className="flex flex-col items-center gap-4">
          {shop.upi_qr_url ? (
            <img src={shop.upi_qr_url} alt="UPI QR" className="w-56 h-56 object-contain rounded-2xl border-2 border-muted p-2 bg-white" />
          ) : (
            <div className="w-56 h-56 bg-muted rounded-2xl flex items-center justify-center">
              <span className="text-muted-foreground text-sm text-center px-4">QR code not uploaded by seller</span>
            </div>
          )}
          {shop.upi_id && (
            <button onClick={() => copy(shop.upi_id!, "upiId")} className="flex items-center gap-2 bg-muted hover:bg-muted/80 px-4 py-2 rounded-full transition-colors">
              <span className="font-mono text-sm font-medium">{shop.upi_id}</span>
              {copied === "upiId" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          )}
          <p className="text-3xl font-extrabold text-emerald-600">₹{total}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 border-t" />
          <span className="text-xs text-muted-foreground shrink-0">After paying, submit proof below</span>
          <div className="flex-1 border-t" />
        </div>

        <div className={`border-2 rounded-2xl p-4 transition-colors cursor-pointer ${activeMethod === "screenshot" ? "border-primary bg-primary/5" : "border-border"}`}
          onClick={() => !screenshotFile && fileInputRef.current?.click()}>
          <p className="font-semibold text-sm mb-3">Option A — Upload Payment Screenshot</p>
          {screenshotPreview ? (
            <div className="relative inline-block">
              <img src={screenshotPreview} alt="Payment proof" className="w-32 rounded-xl object-cover" />
              <button
                onClick={e => { e.stopPropagation(); setScreenshotFile(null); setScreenshotPreview(null); setActiveMethod(null); }}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center shadow"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-6 flex flex-col items-center gap-2"
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
              onDragOver={e => e.preventDefault()}>
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Drag & drop or tap to upload</p>
              <p className="text-xs text-muted-foreground/70">JPG · PNG · WEBP</p>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>

        <div className={`border-2 rounded-2xl p-4 transition-colors ${activeMethod === "utr" ? "border-primary bg-primary/5" : "border-border"}`}>
          <p className="font-semibold text-sm mb-3">Option B — Enter Transaction ID (UTR)</p>
          <div className="relative">
            <Input
              value={utr}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 12);
                setUtr(v);
                if (v.length > 0) { setActiveMethod("utr"); setScreenshotFile(null); setScreenshotPreview(null); }
                else setActiveMethod(null);
              }}
              placeholder="12-digit UTR number"
              inputMode="numeric"
              className={`font-mono pr-10 ${utrValid ? "border-emerald-500 focus-visible:ring-emerald-300" : ""}`}
              maxLength={12}
            />
            {utrValid && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{utr.length}/12 digits</p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t px-4 py-4">
        <div className="max-w-lg mx-auto">
          <Button className="w-full rounded-full h-12 text-base" disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
            {isSubmitting
              ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Confirming...</span>
              : "Confirm Payment"}
          </Button>
        </div>
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
      buyer_email: buyer.email || null,
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
