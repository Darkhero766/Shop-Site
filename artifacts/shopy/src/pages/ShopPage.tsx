import { useEffect, useRef, useState } from "react";
import { supabase, Shop, Product, Review } from "@/lib/supabase";
import { ProductCard } from "@/components/ProductCard";
import { ProductDrawer } from "@/components/ProductDrawer";
import { ReviewSection } from "@/components/ReviewSection";
import { SkeletonGrid } from "@/components/SkeletonGrid";
import { BadgeCheck, Instagram, AlertCircle, Share2, PauseCircle, QrCode, X, Star, Users, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { BuyerAuthModal, BuyerAccountButton } from "@/components/BuyerAuthModal";
import { useBuyerAuth } from "@/lib/buyer-auth-context";
import { motion } from "framer-motion";

export default function ShopPage({ slug }: { slug: string }) {
  const [, setLocation] = useLocation();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [orderCount, setOrderCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "signup">("login");
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const { buyerSession } = useBuyerAuth();

  // After login: if a product was pending, open it automatically
  useEffect(() => {
    if (buyerSession && pendingProduct) {
      setSelectedProduct(pendingProduct);
      setPendingProduct(null);
      setAuthModalOpen(false);
    }
  }, [buyerSession, pendingProduct]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const { data: shopData, error: shopErr } = await supabase
          .from("shops")
          .select("*")
          .eq("subdomain", slug)
          .maybeSingle();

        if (shopErr) throw shopErr;
        if (!shopData) { setIsNotFound(true); setIsLoading(false); return; }
        if (shopData.status === "suspended") { setIsNotFound(true); setIsLoading(false); return; }
        if (shopData.status === "paused") { setIsPaused(true); setShop(shopData); setIsLoading(false); return; }

        setShop(shopData);

        const [prodRes, reviewRes, orderRes] = await Promise.all([
          supabase.from("products").select("*").eq("shop_id", shopData.id).eq("in_stock", true).order("created_at", { ascending: false }),
          supabase.from("reviews").select("*").eq("shop_id", shopData.id).order("created_at", { ascending: false }),
          supabase.from("orders").select("id", { count: "exact", head: true }).eq("shop_id", shopData.id).in("status", ["confirmed", "completed"]),
        ]);
        if (prodRes.data) setProducts(prodRes.data);
        if (reviewRes.data) setReviews(reviewRes.data);
        if (orderRes.count) setOrderCount(orderRes.count);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [slug]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: shop?.shop_name, text: `Check out ${shop?.shop_name} on Shopgram!`, url: window.location.href }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  const copyUpi = () => {
    if (!shop?.upi_id) return;
    navigator.clipboard.writeText(shop.upi_id);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background max-w-3xl mx-auto p-4 md:p-8 space-y-8 animate-pulse">
        <div className="h-32 bg-muted rounded-2xl"></div>
        <SkeletonGrid />
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-6 text-center">
        <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Shop not available</h1>
        <p className="text-muted-foreground mb-8">This shop doesn't exist or has been suspended.</p>
        <Button onClick={() => setLocation("/")} className="rounded-full">Create your own store</Button>
      </div>
    );
  }

  if (isPaused && shop) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-5">
          <PauseCircle className="w-10 h-10 text-amber-500" />
        </div>
        {shop.logo_url && (
          <img src={shop.logo_url} alt={shop.shop_name} className="w-14 h-14 rounded-full object-cover border-2 border-border mb-3" />
        )}
        <h1 className="text-2xl font-bold mb-2">{shop.shop_name}</h1>
        <p className="text-muted-foreground max-w-sm mb-6">This store is temporarily paused. Check back soon — we'll be back shortly!</p>
        {shop.whatsapp && (
          <a href={`https://wa.me/${shop.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="rounded-full">Contact on WhatsApp</Button>
          </a>
        )}
      </div>
    );
  }

  if (!shop) return null;

  const isPending = shop.status === "pending";
  const isTrialExpired = shop.plan === "trial" && shop.trial_ends_at && new Date(shop.trial_ends_at) < new Date();
  const avgRating = reviews.length > 0 ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : null;

  return (
    <div className="min-h-[100dvh] bg-background" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {isPending && (
        <div className="bg-amber-500 text-white text-center py-3 px-4 text-sm font-medium flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            This store is <strong>pending review</strong> and is only visible to you as a preview.
            Go to <Link href="/admin" className="underline font-bold">Admin Panel</Link> to approve it.
          </span>
        </div>
      )}

      {/* ── Full-width Banner ── */}
      <div className="relative">
        <div className="w-full h-44 md:h-56 overflow-hidden">
          {shop.banner_url ? (
            <img src={shop.banner_url} alt="Shop banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 via-purple-500 to-pink-400" />
          )}
          {/* Subtle dark overlay for contrast */}
          <div className="absolute inset-0 bg-black/10" />
        </div>

        {/* Buyer account button — top right over banner */}
        <div className="absolute top-3 right-3">
          <BuyerAccountButton onOpenAuth={(tab = "login") => { setAuthModalTab(tab); setAuthModalOpen(true); }} />
        </div>

        {/* Avatar overlapping banner */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-12">
          <div className="relative">
            {shop.logo_url && !logoError ? (
              <img
                src={shop.logo_url}
                alt={shop.shop_name}
                className="w-24 h-24 rounded-full object-cover border-4 border-background shadow-xl"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-background shadow-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white text-4xl font-extrabold select-none">
                  {shop.shop_name?.charAt(0).toUpperCase() ?? "S"}
                </span>
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-md">
              <BadgeCheck className="text-emerald-500 w-5 h-5" />
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 md:px-8 pt-16 pb-28 space-y-10">
        {/* ── Header ── */}
        <header className="text-center space-y-3 pt-2">
          <div className="flex justify-center">
            <Badge variant="secondary" className="px-3 py-1 text-sm rounded-full">{shop.category || "Shop"}</Badge>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            {shop.shop_name}
          </h1>

          {/* Review summary */}
          {avgRating !== null ? (
            <div className="flex items-center justify-center gap-1.5 text-sm">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{avgRating.toFixed(1)}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Be the first to review</p>
          )}

          {/* Happy customers */}
          {orderCount > 0 && (
            <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span>{orderCount} happy customer{orderCount !== 1 ? "s" : ""}</span>
            </div>
          )}

          {shop.bio && <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">{shop.bio}</p>}

          <div className="flex flex-wrap justify-center gap-3 pt-1">
            {shop.insta_handle && (
              <a
                href={`https://instagram.com/${shop.insta_handle.replace('@', '')}`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-muted/50 hover:bg-muted font-medium transition-colors text-sm"
              >
                <Instagram className="w-4 h-4" /> {shop.insta_handle}
              </a>
            )}
            <Button variant="outline" size="sm" className="rounded-full" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-1.5" /> Share
            </Button>
          </div>
        </header>

        {/* ── Products ── */}
        <section>
          <h2 className="text-2xl font-bold mb-5">Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
              >
                <ProductCard
                  product={product}
                  avgRating={avgRating ?? undefined}
                  reviewCount={reviews.length > 0 ? reviews.length : undefined}
                  onClick={() => setSelectedProduct(product)}
                  onBuyNow={() => setSelectedProduct(product)}
                />
              </motion.div>
            ))}
          </div>
          {products.length === 0 && (
            <div className="text-center py-12 bg-muted/30 rounded-xl">
              <p className="text-muted-foreground">No products available right now.</p>
            </div>
          )}
        </section>

        {/* ── How to order ── */}
        <section className="bg-primary/5 border border-primary/20 rounded-3xl p-6 md:p-10">
          <div className="text-center max-w-lg mx-auto">
            <h2 className="text-3xl font-bold mb-6">How to order</h2>
            <ol className="text-left space-y-5">
              {[
                { title: "Select a product and tap Buy Now", desc: "Browse the catalog, choose your size and quantity, then hit Buy Now." },
                { title: "Scan QR code & complete payment", desc: "Scan the UPI QR shown during checkout and pay the exact amount." },
                { title: "Upload payment proof or enter UTR", desc: "Take a screenshot of the payment or enter the 12-digit UTR number to confirm your order." },
              ].map((step, i) => (
                <li key={i} className="flex gap-4 items-start">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center">{i + 1}</span>
                  <div>
                    <p className="font-semibold text-foreground">{step.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Reviews ── */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
          <ReviewSection reviews={reviews} />
        </section>
      </main>

      {isTrialExpired && (
        <div className="bg-amber-50 border-t border-amber-200 py-3 px-4 text-center text-sm text-amber-700">
          This store's trial has ended. The seller is renewing soon.
        </div>
      )}

      <footer className="py-8 text-center border-t text-muted-foreground text-sm bg-muted/20">
        <p className="mb-2">Powered by Shopgram</p>
        <Button variant="link" onClick={() => setLocation("/")}>Create your own free store →</Button>
      </footer>

      {/* ── Floating Pay via UPI button ── */}
      {(shop.upi_id || shop.upi_qr_url) && (
        <button
          onClick={() => setUpiModalOpen(true)}
          className="fixed bottom-6 right-4 z-40 flex items-center gap-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white px-4 py-3 rounded-full shadow-xl transition-all duration-200 font-semibold text-sm"
        >
          <QrCode className="w-4 h-4" />
          Pay via UPI
        </button>
      )}

      {/* ── UPI Modal ── */}
      {upiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setUpiModalOpen(false)} />
          <div className="relative bg-background rounded-t-3xl md:rounded-3xl w-full max-w-sm mx-auto p-6 shadow-2xl">
            <button
              onClick={() => setUpiModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold mb-1 text-center">Pay via UPI</h3>
            <p className="text-xs text-muted-foreground text-center mb-5">Scan QR or copy UPI ID to pay {shop.shop_name}</p>
            <div className="flex flex-col items-center gap-4">
              {shop.upi_qr_url && (
                <img src={shop.upi_qr_url} alt="UPI QR" className="w-48 h-48 object-contain rounded-2xl border-2 border-muted p-2 bg-white" />
              )}
              {shop.upi_id && (
                <button
                  onClick={copyUpi}
                  className="flex items-center gap-2 bg-muted hover:bg-muted/80 px-4 py-2.5 rounded-full transition-colors w-full justify-center"
                >
                  <span className="font-mono text-sm font-semibold">{shop.upi_id}</span>
                  {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
              )}
              <p className="text-xs text-muted-foreground text-center">
                After paying, place your order and upload payment proof during checkout.
              </p>
            </div>
          </div>
        </div>
      )}

      <ProductDrawer
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onOrder={(size, qty) => {
          if (!selectedProduct) return;
          if (!buyerSession) {
            setPendingProduct(selectedProduct);
            setSelectedProduct(null);
            setAuthModalTab("login");
            setAuthModalOpen(true);
            return;
          }
          const params = new URLSearchParams({ qty: String(qty) });
          if (size) params.set("size", size);
          setLocation(`/s/${slug}/product/${selectedProduct.id}?${params.toString()}`);
        }}
        reviews={reviews}
        shopName={shop.shop_name}
      />

      <BuyerAuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} defaultTab={authModalTab} />
    </div>
  );
}
