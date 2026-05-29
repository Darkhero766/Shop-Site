import { useEffect, useState } from "react";
import { supabase, Shop, Product, Review } from "@/lib/supabase";
import { ProductCard } from "@/components/ProductCard";
import { ProductDrawer } from "@/components/ProductDrawer";
import { ReviewSection } from "@/components/ReviewSection";
import { UTRForm } from "@/components/UTRForm";
import { SkeletonGrid } from "@/components/SkeletonGrid";
import { BadgeCheck, Instagram, MessageCircle, AlertCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

export default function ShopPage({ slug }: { slug: string }) {
  const [, setLocation] = useLocation();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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
        if (!shopData) {
          setIsNotFound(true);
          setIsLoading(false);
          return;
        }

        // Suspended shops show not-found
        if (shopData.status === "suspended") {
          setIsNotFound(true);
          setIsLoading(false);
          return;
        }

        setShop(shopData);

        const { data: prodData } = await supabase
          .from("products")
          .select("*")
          .eq("shop_id", shopData.id)
          .eq("in_stock", true)
          .order("created_at", { ascending: false });

        if (prodData) setProducts(prodData);

        const { data: reviewData } = await supabase
          .from("reviews")
          .select("*")
          .eq("shop_id", shopData.id)
          .order("created_at", { ascending: false });

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
      navigator.share({
        title: shop?.shop_name,
        text: `Check out ${shop?.shop_name} on Shopgram!`,
        url: window.location.href,
      }).catch(console.error);
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
        <header className="text-center space-y-4">
          <div className="flex justify-center mb-2">
            <Badge variant="secondary" className="px-3 py-1 text-sm rounded-full">
              {shop.category || "Shop"}
            </Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight flex items-center justify-center gap-3">
            {shop.shop_name}
            <BadgeCheck className="text-emerald-500 w-8 h-8 shrink-0" data-testid="verified-badge" />
          </h1>
          {shop.bio && (
            <p className="text-muted-foreground max-w-lg mx-auto text-lg leading-relaxed">{shop.bio}</p>
          )}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <a 
              href={`https://instagram.com/${shop.insta_handle?.replace('@', '')}`} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-muted/50 hover:bg-muted font-medium transition-colors text-sm"
              data-testid="link-insta"
            >
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
                onBuyNow={() => setLocation(`/s/${slug}/product/${product.id}`)}
              />
            ))}
          </div>
          {products.length === 0 && (
            <div className="text-center py-12 bg-muted/30 rounded-xl">
              <p className="text-muted-foreground">No products available right now.</p>
            </div>
          )}
        </section>

        {/* Payment & Ordering */}
        <section className="bg-primary/5 border border-primary/20 rounded-3xl p-6 md:p-10 space-y-8">
          <div className="text-center max-w-lg mx-auto">
            <h2 className="text-3xl font-bold mb-4">How to order</h2>
            <ol className="text-left text-muted-foreground space-y-3 mb-8">
              <li className="flex gap-3"><span className="font-bold text-primary">1.</span> Select your products and chat with us on WhatsApp to confirm availability.</li>
              <li className="flex gap-3"><span className="font-bold text-primary">2.</span> Scan the QR code below and pay the total amount.</li>
              <li className="flex gap-3"><span className="font-bold text-primary">3.</span> Submit your 12-digit UTR reference number in the form below.</li>
            </ol>
          </div>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm border border-border">
              <h3 className="font-semibold text-lg mb-4">Scan to Pay</h3>
              {shop.upi_qr_url ? (
                <img src={shop.upi_qr_url} alt="UPI QR" className="w-48 h-48 md:w-64 md:h-64 object-contain rounded-xl mb-4" />
              ) : (
                <div className="w-48 h-48 md:w-64 md:h-64 bg-muted rounded-xl flex items-center justify-center mb-4">
                  <span className="text-muted-foreground text-sm">No QR provided</span>
                </div>
              )}
              {shop.upi_id && (
                <p className="font-medium text-lg font-mono bg-muted px-4 py-2 rounded-lg break-all text-center w-full">
                  {shop.upi_id}
                </p>
              )}
            </div>

            <UTRForm shopId={shop.id} products={products} />
          </div>
        </section>

        {/* Reviews */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
          <ReviewSection reviews={reviews} />
        </section>
      </main>

      <footer className="py-8 text-center border-t text-muted-foreground text-sm bg-muted/20">
        <p className="mb-2">Powered by Shopgram</p>
        <Button variant="link" onClick={() => setLocation("/")}>Create your own free store →</Button>
      </footer>

      <ProductDrawer
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onOrder={() => selectedProduct && setLocation(`/s/${slug}/product/${selectedProduct.id}`)}
        reviews={reviews}
        shopName={shop.shop_name}
      />
    </div>
  );
}