import { useEffect, useState } from "react";
import { supabase, Shop, Product, Review } from "@/lib/supabase";
import { ProductCard } from "@/components/ProductCard";
import { ProductDrawer } from "@/components/ProductDrawer";
import { ReviewSection } from "@/components/ReviewSection";
import { SkeletonGrid } from "@/components/SkeletonGrid";
import { BadgeCheck, Instagram, AlertCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { BuyerAuthModal, BuyerAccountButton } from "@/components/BuyerAuthModal";

export default function ShopPage({ slug }: { slug: string }) {
  const [, setLocation] = useLocation();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "signup">("login");

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

        setShop(shopData);

        const { data: prodData } = await supabase
          .from("products").select("*").eq("shop_id", shopData.id).eq("in_stock", true).order("created_at", { ascending: false });
        if (prodData) setProducts(prodData);

        const { data: reviewData } = await supabase
          .from("reviews").select("*").eq("shop_id", shopData.id).order("created_at", { ascending: false });
        if (reviewData) setReviews(reviewData);
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

  if (!shop) return null;

  const isPending = shop.status === "pending";
  const isTrialExpired = shop.plan === "trial" && shop.trial_ends_at && new Date(shop.trial_ends_at) < new Date();

  return (
    <div className="min-h-[100dvh] bg-background">
      {isPending && (
        <div className="bg-amber-500 text-white text-center py-3 px-4 text-sm font-medium flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            This store is <strong>pending review</strong> and is only visible to you as a preview.
            Go to <Link href="/admin" className="underline font-bold">Admin Panel</Link> to approve it.
          </span>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12 pb-24 space-y-12">
        {/* Header */}
        <header className="text-center space-y-4 relative">
          <div className="absolute right-0 top-0">
            <BuyerAccountButton onOpenAuth={(tab = "login") => { setAuthModalTab(tab); setAuthModalOpen(true); }} />
          </div>
          <div className="flex justify-center mb-2">
            <Badge variant="secondary" className="px-3 py-1 text-sm rounded-full">{shop.category || "Shop"}</Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight flex items-center justify-center gap-3">
            {shop.shop_name}
            <BadgeCheck className="text-emerald-500 w-8 h-8 shrink-0" data-testid="verified-badge" />
          </h1>
          {shop.bio && <p className="text-muted-foreground max-w-lg mx-auto text-lg leading-relaxed">{shop.bio}</p>}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <a href={`https://instagram.com/${shop.insta_handle?.replace('@', '')}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-muted/50 hover:bg-muted font-medium transition-colors text-sm"
              data-testid="link-insta">
              <Instagram className="w-4 h-4" /> {shop.insta_handle}
            </a>
            <Button variant="outline" size="sm" className="rounded-full" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-1.5" /> Share
            </Button>
          </div>
        </header>

        {/* Products */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                avgRating={reviews.length > 0 ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : undefined}
                reviewCount={reviews.length > 0 ? reviews.length : undefined}
                onClick={() => setSelectedProduct(product)}
                onBuyNow={() => setSelectedProduct(product)}
              />
            ))}
          </div>
          {products.length === 0 && (
            <div className="text-center py-12 bg-muted/30 rounded-xl">
              <p className="text-muted-foreground">No products available right now.</p>
            </div>
          )}
        </section>

        {/* How to order */}
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

        {/* Reviews */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
          <ReviewSection reviews={reviews} />
        </section>
      </main>

      {/* Trial expired notice — gentle, at bottom */}
      {isTrialExpired && (
        <div className="bg-amber-50 border-t border-amber-200 py-3 px-4 text-center text-sm text-amber-700">
          This store's trial has ended. The seller is renewing soon.
        </div>
      )}

      <footer className="py-8 text-center border-t text-muted-foreground text-sm bg-muted/20">
        <p className="mb-2">Powered by Shopgram</p>
        <Button variant="link" onClick={() => setLocation("/")}>Create your own free store →</Button>
      </footer>

      <ProductDrawer
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onOrder={(size, qty) => {
          if (!selectedProduct) return;
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
