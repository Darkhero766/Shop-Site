import { useEffect, useRef, useState } from "react";
import { supabase, Shop, Product, Review } from "@/lib/supabase";
import { ProductCard } from "@/components/ProductCard";
import { ProductDrawer } from "@/components/ProductDrawer";
import { ReviewSection } from "@/components/ReviewSection";
import { SkeletonGrid } from "@/components/SkeletonGrid";
import { BadgeCheck, Instagram, AlertCircle, Share2, PauseCircle, QrCode, X, Star, Users, Copy, Check, Search, Menu, MessageCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { BuyerAuthModal, BuyerAccountButton } from "@/components/BuyerAuthModal";
import { useBuyerAuth } from "@/lib/buyer-auth-context";
import { motion, AnimatePresence } from "framer-motion";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { buyerSession } = useBuyerAuth();

  useEffect(() => {
    if (buyerSession && pendingProduct) {
      setSelectedProduct(pendingProduct);
      setPendingProduct(null);
      setAuthModalOpen(false);
    }
  }, [buyerSession, pendingProduct]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 120);
  }, [searchOpen]);

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
      toast.success("Link copied!");
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
        <div className="h-14 bg-muted rounded-xl mb-2"></div>
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
        <p className="text-muted-foreground max-w-sm mb-6">This store is temporarily paused. Check back soon!</p>
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
  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? products.filter(p => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
    : products;

  return (
    <div className="min-h-[100dvh] bg-background" style={{ fontFamily: "'Poppins', sans-serif" }}>

      {isPending && (
        <div className="bg-amber-500 text-white text-center py-2 px-4 text-xs font-medium flex items-center justify-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Store pending review — only visible to you. <Link href="/admin" className="underline font-bold">Admin Panel</Link></span>
        </div>
      )}

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Left: hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors shrink-0"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </button>

          {/* Center: shop identity */}
          <div className="flex-1 flex flex-col items-center justify-center min-w-0">
            {shop.category && (
              <p className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground leading-none mb-0.5 font-medium truncate">
                {shop.category}
              </p>
            )}
            <h1
              className="text-base md:text-lg font-bold tracking-[0.15em] uppercase text-foreground leading-tight truncate max-w-[200px] md:max-w-sm"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif", letterSpacing: "0.18em" }}
            >
              {shop.shop_name}
            </h1>
          </div>

          {/* Right: search icon */}
          <button
            onClick={() => setSearchOpen(s => !s)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors shrink-0"
            aria-label="Search"
          >
            {searchOpen
              ? <X className="w-4.5 h-4.5 text-foreground" strokeWidth={1.5} />
              : <Search className="w-4.5 h-4.5 text-foreground" strokeWidth={1.5} />
            }
          </button>
        </div>

        {/* Search bar — slides down */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="overflow-hidden border-t border-border/40"
            >
              <div className="max-w-4xl mx-auto px-4 py-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={`Search in ${shop.shop_name}…`}
                    className="w-full pl-9 pr-8 py-2 text-sm rounded-full border border-input bg-muted/50 focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Side Drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
            {/* Drawer panel */}
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              className="fixed top-0 left-0 h-full z-50 w-[300px] max-w-[85vw] bg-background shadow-2xl flex flex-col"
            >
              {/* Close */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
                <span className="text-xs tracking-widest uppercase text-muted-foreground font-medium">Menu</span>
                <button onClick={() => setDrawerOpen(false)} className="p-1.5 hover:bg-muted rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Shop profile */}
              <div className="px-5 py-5 border-b">
                <div className="flex items-center gap-3 mb-3">
                  {shop.logo_url && !logoError ? (
                    <img
                      src={shop.logo_url}
                      alt={shop.shop_name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-border shadow"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow border-2 border-background">
                      <span className="text-white text-2xl font-bold select-none">
                        {shop.shop_name?.charAt(0).toUpperCase() ?? "S"}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm truncate">{shop.shop_name}</p>
                      <BadgeCheck className="text-emerald-500 w-4 h-4 shrink-0" />
                    </div>
                    {shop.category && <p className="text-xs text-muted-foreground truncate">{shop.category}</p>}
                  </div>
                </div>
                {shop.bio && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{shop.bio}</p>}

                {/* Stats row */}
                <div className="flex gap-4 mt-3 text-center">
                  <div>
                    <p className="text-sm font-bold">{products.length}</p>
                    <p className="text-[10px] text-muted-foreground">Products</p>
                  </div>
                  {avgRating !== null && (
                    <div>
                      <p className="text-sm font-bold flex items-center gap-0.5"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{avgRating.toFixed(1)}</p>
                      <p className="text-[10px] text-muted-foreground">{reviews.length} reviews</p>
                    </div>
                  )}
                  {orderCount > 0 && (
                    <div>
                      <p className="text-sm font-bold">{orderCount}</p>
                      <p className="text-[10px] text-muted-foreground">Customers</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Buyer account section */}
              <div className="px-5 py-4 border-b">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-medium">Your Account</p>
                <BuyerAccountButton onOpenAuth={(tab = "login") => {
                  setDrawerOpen(false);
                  setAuthModalTab(tab);
                  setAuthModalOpen(true);
                }} />
              </div>

              {/* Links */}
              <div className="px-5 py-4 flex-1 space-y-1">
                {shop.insta_handle && (
                  <a
                    href={`https://instagram.com/${shop.insta_handle.replace('@', '')}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center justify-between gap-2 py-2.5 text-sm hover:text-purple-600 transition-colors"
                  >
                    <span className="flex items-center gap-2.5"><Instagram className="w-4 h-4" /> Instagram</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                )}
                {shop.whatsapp && (
                  <a
                    href={`https://wa.me/${shop.whatsapp.replace(/\D/g, "")}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center justify-between gap-2 py-2.5 text-sm hover:text-emerald-600 transition-colors"
                  >
                    <span className="flex items-center gap-2.5"><MessageCircle className="w-4 h-4" /> WhatsApp</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                )}
                {(shop.upi_id || shop.upi_qr_url) && (
                  <button
                    onClick={() => { setDrawerOpen(false); setUpiModalOpen(true); }}
                    className="w-full flex items-center justify-between gap-2 py-2.5 text-sm hover:text-purple-600 transition-colors"
                  >
                    <span className="flex items-center gap-2.5"><QrCode className="w-4 h-4" /> Pay via UPI</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
                <button
                  onClick={() => { setDrawerOpen(false); handleShare(); }}
                  className="w-full flex items-center justify-between gap-2 py-2.5 text-sm hover:text-foreground transition-colors"
                >
                  <span className="flex items-center gap-2.5"><Share2 className="w-4 h-4" /> Share Store</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              <div className="px-5 pb-6">
                <p className="text-[10px] text-muted-foreground text-center">Powered by Shopgram</p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="max-w-4xl mx-auto px-4 md:px-8 pt-6 pb-28 space-y-10">

        {/* ── Shop hero (compact) ── */}
        <section className="text-center space-y-2 pt-2">
          {/* Avatar */}
          <div className="flex justify-center mb-3">
            <div className="relative">
              {shop.logo_url && !logoError ? (
                <img
                  src={shop.logo_url}
                  alt={shop.shop_name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-background shadow-lg ring-2 ring-muted"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg border-4 border-background">
                  <span className="text-white text-3xl font-extrabold select-none">
                    {shop.shop_name?.charAt(0).toUpperCase() ?? "S"}
                  </span>
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow">
                <BadgeCheck className="text-emerald-500 w-4.5 h-4.5" />
              </span>
            </div>
          </div>

          {/* Review + customer summary */}
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground flex-wrap">
            {avgRating !== null && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span>
                <span>· {reviews.length} reviews</span>
              </span>
            )}
            {orderCount > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {orderCount} customers
              </span>
            )}
          </div>

          {shop.bio && <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">{shop.bio}</p>}

          {shop.delivery_info && (
            <p className="text-xs text-muted-foreground">🚚 {shop.delivery_info}</p>
          )}
        </section>

        {/* ── Products ── */}
        <section>
          {/* Search empty state */}
          {searchOpen && searchQuery && filtered.length === 0 && (
            <div className="text-center py-10 bg-muted/30 rounded-xl mb-4">
              <p className="text-muted-foreground text-sm">No products found for "<strong>{searchQuery}</strong>"</p>
            </div>
          )}

          {(!searchOpen || !searchQuery || filtered.length > 0) && (
            <>
              {!searchOpen && (
                <h2 className="text-xl font-bold mb-4 tracking-tight">Products <span className="text-muted-foreground font-normal text-sm">({products.length})</span></h2>
              )}
              {searchOpen && searchQuery && (
                <p className="text-sm text-muted-foreground mb-4">{filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{searchQuery}"</p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {(searchOpen && searchQuery ? filtered : products).map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
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
              {products.length === 0 && !searchQuery && (
                <div className="text-center py-12 bg-muted/30 rounded-xl">
                  <p className="text-muted-foreground">No products available right now.</p>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── How to order ── */}
        <section className="bg-primary/5 border border-primary/20 rounded-3xl p-6 md:p-10">
          <div className="text-center max-w-lg mx-auto">
            <h2 className="text-2xl font-bold mb-6">How to order</h2>
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
          <h2 className="text-xl font-bold mb-5">Customer Reviews</h2>
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
            <button onClick={() => setUpiModalOpen(false)} className="absolute top-4 right-4 p-1.5 hover:bg-muted rounded-full transition-colors">
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
