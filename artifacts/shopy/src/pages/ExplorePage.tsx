import { useState, useEffect, useRef, useCallback } from "react";
import shopgramLogo from "@assets/IMG_0100_1783990707990.png";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import type { Shop, Product } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Search, Store, ArrowRight, Star, BadgeCheck, ChevronLeft, ChevronRight,
  ShoppingBag, Sparkles, X, Package, SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── types ─── */
type ProductWithShop = Product & {
  shops: Pick<Shop, "shop_name" | "subdomain" | "logo_url" | "status" | "category">;
  avg_rating?: number;
  review_count?: number;
};

/* ─── constants ─── */
const CATEGORIES = [
  { label: "All", emoji: "✨" },
  { label: "Jewellery", emoji: "💍" },
  { label: "Clothes", emoji: "👗" },
  { label: "Candles", emoji: "🕯️" },
  { label: "Food", emoji: "🍱" },
  { label: "Handmade", emoji: "🎨" },
  { label: "Accessories", emoji: "👜" },
  { label: "Other", emoji: "🌿" },
];

const PAGE_SIZE = 12;

/* ─── helpers ─── */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3 h-3 ${s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
        />
      ))}
      {count !== undefined && (
        <span className="text-[11px] text-gray-400 ml-0.5">({count})</span>
      )}
    </div>
  );
}

function ShopAvatar({ shop, size = "sm" }: { shop: ProductWithShop["shops"]; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-6 h-6 text-[10px]" : "w-10 h-10 text-sm";
  return shop.logo_url ? (
    <img src={shop.logo_url} alt={shop.shop_name} className={`${sz} rounded-full object-cover border border-purple-100`} />
  ) : (
    <div className={`${sz} rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold border border-purple-100`}>
      {shop.shop_name[0]}
    </div>
  );
}

/* ─── product card ─── */
function ProductCard({
  product,
  onClick,
  delay = 0,
}: {
  product: ProductWithShop;
  onClick: () => void;
  delay?: number;
}) {
  const img = product.images?.[0];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      onClick={onClick}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* image */}
      <div className="relative overflow-hidden bg-gray-50 aspect-[4/5]">
        {img ? (
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-gray-200" />
          </div>
        )}
        {/* hover buy button */}
        <div className="absolute bottom-0 inset-x-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-2.5 text-center text-white text-xs font-semibold flex items-center justify-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" /> Buy Now
          </div>
        </div>
      </div>

      {/* info */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <ShopAvatar shop={product.shops} />
          <span className="text-[11px] text-gray-500 truncate">{product.shops.shop_name}</span>
          <BadgeCheck className="w-3 h-3 text-purple-500 shrink-0" />
        </div>
        <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 mb-1">{product.name}</p>
        <p className="text-purple-600 font-bold text-sm">₹{product.price.toLocaleString("en-IN")}</p>
        {product.avg_rating ? (
          <div className="mt-1.5">
            <StarRating rating={product.avg_rating} count={product.review_count} />
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

/* ─── featured (trending) card ─── */
function FeaturedCard({ product, onClick }: { product: ProductWithShop; onClick: () => void }) {
  const img = product.images?.[0];
  return (
    <div
      onClick={onClick}
      className="group shrink-0 w-60 bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
    >
      <div className="relative overflow-hidden bg-gray-50 h-48">
        {img ? (
          <img src={img} alt={product.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-gray-200" />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <ShopAvatar shop={product.shops} />
          <span className="text-[11px] text-purple-600 font-medium truncate">{product.shops.shop_name}</span>
          <BadgeCheck className="w-3 h-3 text-purple-500 shrink-0" />
        </div>
        <p className="font-bold text-gray-900 text-sm line-clamp-2 mb-1.5">{product.name}</p>
        <p className="text-amber-500 font-bold text-base">₹{product.price.toLocaleString("en-IN")}</p>
        <div className="mt-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full py-1.5 text-center text-xs font-semibold text-white">
          Shop Now →
        </div>
      </div>
    </div>
  );
}

/* ─── product modal ─── */
function ProductModal({ product, onClose }: { product: ProductWithShop; onClose: () => void }) {
  const [activeImg, setActiveImg] = useState(0);
  const images = product.images ?? [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.97 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full md:max-w-3xl rounded-t-3xl md:rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
        >
          <div className="flex md:flex-row flex-col overflow-auto">
            {/* images */}
            <div className="md:w-1/2 bg-gray-50 flex-shrink-0">
              <div className="relative aspect-square">
                {images[activeImg] ? (
                  <img src={images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-gray-200" />
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setActiveImg(i)}
                      className={`shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-colors ${i === activeImg ? "border-purple-500" : "border-transparent"}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* details */}
            <div className="md:w-1/2 p-6 flex flex-col gap-4 overflow-auto">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <ShopAvatar shop={product.shops} size="md" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{product.shops.shop_name}</p>
                    <div className="flex items-center gap-1">
                      <BadgeCheck className="w-3 h-3 text-purple-500" />
                      <span className="text-[11px] text-purple-600">Verified seller</span>
                    </div>
                  </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">{product.name}</h2>
                <p className="text-2xl font-extrabold text-amber-500">₹{product.price.toLocaleString("en-IN")}</p>
              </div>

              {product.avg_rating ? (
                <StarRating rating={product.avg_rating} count={product.review_count} />
              ) : null}

              {product.description && (
                <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
              )}

              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Size</p>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((s) => (
                      <button key={s} className="px-3 py-1.5 rounded-full border border-gray-200 text-sm text-gray-700 hover:border-purple-500 hover:text-purple-600 transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-4">
                <a
                  href={`https://${product.shops.subdomain}.shopgram.in`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-semibold text-base border-0 shadow-lg shadow-purple-200">
                    Buy Now — ₹{product.price.toLocaleString("en-IN")}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </a>
                <p className="text-center text-xs text-gray-400 mt-2 flex items-center justify-center gap-1">
                  <BadgeCheck className="w-3 h-3 text-emerald-500" /> Verified seller · UPI payment
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── horizontal scroll row ─── */
function HScrollRow({ products, onSelect }: { products: ProductWithShop[]; onSelect: (p: ProductWithShop) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: "l" | "r") => {
    ref.current?.scrollBy({ left: dir === "l" ? -300 : 300, behavior: "smooth" });
  };
  return (
    <div className="relative group/row">
      <button onClick={() => scroll("l")}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-9 h-9 rounded-full bg-white shadow-lg border border-gray-100 items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity">
        <ChevronLeft className="w-4 h-4 text-gray-600" />
      </button>
      <div ref={ref} className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {products.map((p, i) => (
          <div key={p.id} className="snap-start shrink-0 w-44">
            <ProductCard product={p} onClick={() => onSelect(p)} delay={i * 0.04} />
          </div>
        ))}
      </div>
      <button onClick={() => scroll("r")}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-9 h-9 rounded-full bg-white shadow-lg border border-gray-100 items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity">
        <ChevronRight className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
export default function ExplorePage() {
  const [products, setProducts] = useState<ProductWithShop[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<ProductWithShop[]>([]);
  const [spotlightShop, setSpotlightShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState<ProductWithShop | null>(null);
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebounce(search, 300);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const trendingRef = useRef<HTMLDivElement>(null);

  /* fetch products */
  const fetchProducts = useCallback(async (pageNum: number, reset = false) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("products")
      .select("*, shops!inner(shop_name, subdomain, logo_url, status, category)")
      .eq("in_stock", true)
      .eq("shops.status", "active")
      .order("created_at", { ascending: false })
      .range(from, to);

    const { data, error } = await query;
    if (error || !data) { setLoading(false); setLoadingMore(false); return; }

    const mapped = data as unknown as ProductWithShop[];
    if (reset) setProducts(mapped); else setProducts((prev) => [...prev, ...mapped]);
    if (mapped.length < PAGE_SIZE) setAllLoaded(true);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  /* initial load */
  useEffect(() => {
    fetchProducts(0, true);

    // fetch spotlight shop
    supabase
      .from("shops")
      .select("*")
      .eq("status", "active")
      .limit(20)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSpotlightShop(data[Math.floor(Math.random() * data.length)] as Shop);
        }
      });
  }, [fetchProducts]);

  /* fetch featured (first 8 products as trending) */
  useEffect(() => {
    supabase
      .from("products")
      .select("*, shops!inner(shop_name, subdomain, logo_url, status, category)")
      .eq("in_stock", true)
      .eq("shops.status", "active")
      .limit(8)
      .then(({ data }) => {
        if (data) setFeaturedProducts(data as unknown as ProductWithShop[]);
      });
  }, []);

  /* reset & re-fetch when search/category changes */
  useEffect(() => {
    setPage(0);
    setAllLoaded(false);
    fetchProducts(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, activeCategory]);

  /* infinite scroll */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && !allLoaded && !loading) {
          const next = page + 1;
          setPage(next);
          fetchProducts(next);
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [page, loadingMore, allLoaded, loading, fetchProducts]);

  /* client-side filter */
  const filtered = products.filter((p) => {
    const q = debouncedSearch.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.shops.shop_name.toLowerCase().includes(q) ||
      (p.description ?? "").toLowerCase().includes(q);
    const matchCat =
      activeCategory === "All" ||
      (p.shops.category ?? "").toLowerCase().includes(activeCategory.toLowerCase());
    return matchSearch && matchCat;
  });

  /* category buckets for sections */
  const categoryBuckets = CATEGORIES.filter((c) => c.label !== "All").map((cat) => ({
    ...cat,
    items: products.filter((p) =>
      (p.shops.category ?? "").toLowerCase().includes(cat.label.toLowerCase())
    ),
  })).filter((c) => c.items.length > 0);

  /* trending scroll */
  const scrollTrending = (dir: "l" | "r") => {
    trendingRef.current?.scrollBy({ left: dir === "l" ? -300 : 300, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] text-gray-900">

      {/* ── NAV ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1 font-bold text-lg shrink-0">
            <img src={shopgramLogo} alt="Shopgram" className="w-14 h-14 object-contain -my-2" style={{ mixBlendMode: "multiply" }} />
            <span className="text-gray-900 text-xl">Shopgram</span>
          </Link>

          <div className="flex-1" />

          <div className="flex gap-3 items-center">
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden md:block">Login</Link>
            <Link href="/join">
              <Button className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 font-semibold text-sm px-5 h-9 border-0">
                Sell on Shopgram
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-br from-[#1a0533] via-[#2d0a5e] to-[#4c1d95] text-white overflow-hidden">
        {/* decorative blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-80px] right-[-80px] w-[500px] h-[500px] bg-purple-400/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[400px] h-[400px] bg-pink-400/15 rounded-full blur-[120px]" />
          {/* grid */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "56px 56px" }} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 text-center flex flex-col items-center">
          {/* eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-amber-400 text-xs font-bold tracking-[0.25em] uppercase mb-5"
          >
            Discover · Shop · Support Small
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-4"
          >
            India's Finest<br />
            <span className="bg-gradient-to-r from-amber-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
              Instagram Stores
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-white/60 text-base md:text-lg mb-10 max-w-xl"
          >
            Handpicked products from verified sellers — pay directly via UPI
          </motion.p>

          {/* search */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full max-w-xl relative mb-8"
          >
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, stores, categories…"
              className="w-full pl-12 pr-14 py-4 rounded-full bg-white text-gray-900 text-sm shadow-2xl shadow-black/20 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder:text-gray-400"
            />
            {search ? (
              <button onClick={() => setSearch("")} className="absolute right-5 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-gray-700" />
              </button>
            ) : (
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[11px] text-gray-300 hidden sm:block">⌘K</span>
            )}
          </motion.div>

          {/* category pills */}
          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x w-full max-w-2xl justify-center flex-wrap"
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(cat.label)}
                className={`shrink-0 snap-start px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat.label
                    ? "bg-amber-400 text-gray-900 shadow-lg shadow-amber-400/30"
                    : "bg-white/10 text-white/80 hover:bg-white/20 border border-white/10"
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-8">

        {/* ── TRENDING ── */}
        {featuredProducts.length > 0 && (
          <section className="py-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-purple-600 text-xs font-bold tracking-widest uppercase mb-1">Trending Now</p>
                <h2 className="text-2xl font-extrabold text-gray-900">Most Popular Picks</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={() => scrollTrending("l")}
                  className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-purple-400 transition-colors shadow-sm">
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <button onClick={() => scrollTrending("r")}
                  className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-purple-400 transition-colors shadow-sm">
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
            <div ref={trendingRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {featuredProducts.map((p) => (
                <FeaturedCard key={p.id} product={p} onClick={() => setSelectedProduct(p)} />
              ))}
            </div>
          </section>
        )}

        {/* ── DIVIDER ── */}
        <div className="flex items-center gap-4 mb-10">
          <div className="flex-1 h-px bg-gray-100" />
          <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {filtered.length} products
          </div>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* ── PRODUCT GRID ── */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
                <div className="bg-gray-100 aspect-[4/5]" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-100 rounded-full w-3/4" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-xl font-bold text-gray-900 mb-2">
              {search ? `Nothing found for "${search}"` : "No products found"}
            </p>
            <p className="text-gray-400 mb-6">Try browsing a different category</p>
            <div className="flex gap-2 justify-center flex-wrap">
              {["jewellery", "candles", "clothes"].map((s) => (
                <button key={s} onClick={() => setSearch(s)}
                  className="px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* first 12 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {filtered.slice(0, 12).map((p, i) => (
                <ProductCard key={p.id} product={p} onClick={() => setSelectedProduct(p)} delay={i * 0.04} />
              ))}
            </div>

            {/* ── SHOP SPOTLIGHT ── */}
            {spotlightShop && filtered.length >= 12 && !debouncedSearch && (
              <section className="my-10 rounded-3xl overflow-hidden bg-gradient-to-br from-[#1a0533] via-[#2d0a5e] to-[#4c1d95] text-white">
                <div className="md:flex items-center gap-10 p-8 md:p-12">
                  <div className="flex-1 mb-8 md:mb-0">
                    <p className="text-amber-400 text-xs font-bold tracking-[0.2em] uppercase mb-3">Featured Store</p>
                    <h3 className="text-3xl md:text-4xl font-extrabold mb-2">{spotlightShop.shop_name}</h3>
                    {spotlightShop.category && (
                      <p className="text-purple-300 text-sm mb-3">{spotlightShop.category}</p>
                    )}
                    {spotlightShop.bio && (
                      <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-md">{spotlightShop.bio}</p>
                    )}
                    <a
                      href={`https://${spotlightShop.subdomain}.shopgram.in`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="rounded-full bg-white text-purple-700 hover:bg-white/90 font-semibold px-6 h-11 border-0">
                        Visit Store <ArrowRight className="ml-1.5 w-4 h-4" />
                      </Button>
                    </a>
                  </div>

                  {/* decorative store card */}
                  <div className="flex-shrink-0 mx-auto md:mx-0">
                    <div className="w-56 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        {spotlightShop.logo_url ? (
                          <img src={spotlightShop.logo_url} className="w-12 h-12 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xl">
                            {spotlightShop.shop_name[0]}
                          </div>
                        )}
                        <div>
                          <p className="text-white text-sm font-bold leading-tight">{spotlightShop.shop_name}</p>
                          <p className="text-white/50 text-[11px]">{spotlightShop.subdomain}.shopgram.in</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-purple-300 text-xs">
                        <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Verified Seller
                      </div>
                      <div className="mt-4 flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* rest of grid */}
            {filtered.length > 12 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {filtered.slice(12).map((p, i) => (
                  <ProductCard key={p.id} product={p} onClick={() => setSelectedProduct(p)} delay={i * 0.03} />
                ))}
              </div>
            )}
          </>
        )}

        {/* infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-4" />
        {loadingMore && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 rounded-full border-2 border-purple-200 border-t-purple-600 animate-spin" />
          </div>
        )}
        {allLoaded && products.length > 0 && (
          <p className="text-center text-gray-400 text-sm py-8">🎉 You've seen everything!</p>
        )}

        {/* ── CATEGORY SECTIONS ── */}
        {!debouncedSearch && categoryBuckets.length > 0 && (
          <section className="mt-16 space-y-14 pb-8">
            <div className="text-center mb-8">
              <p className="text-purple-600 text-xs font-bold tracking-widest uppercase mb-2">Browse by category</p>
              <h2 className="text-2xl font-extrabold text-gray-900">Shop What You Love</h2>
            </div>
            {categoryBuckets.map((cat) => (
              <div key={cat.label}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    {cat.emoji} {cat.label} Picks
                  </h3>
                  <button
                    onClick={() => setActiveCategory(cat.label)}
                    className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1 transition-colors"
                  >
                    See all <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <HScrollRow products={cat.items.slice(0, 10)} onSelect={setSelectedProduct} />
              </div>
            ))}
          </section>
        )}

        {/* ── JOIN CTA ── */}
        <section className="my-16 rounded-3xl overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100">
          <div className="md:flex items-center">
            <div className="flex-1 p-8 md:p-12">
              <p className="text-purple-500 text-xs font-bold tracking-widest uppercase mb-3">For sellers</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 leading-tight">
                Sell smarter.<br />Not harder.
              </h2>
              <p className="text-gray-500 mb-6 leading-relaxed">
                Get your own store link, accept UPI, and get WhatsApp order alerts — all in 5 minutes.
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                {["✓ Free forever", "✓ UPI built in", "✓ Verified reviews"].map((pill) => (
                  <span key={pill} className="px-3 py-1.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
                    {pill}
                  </span>
                ))}
              </div>
              <Link href="/join">
                <Button className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-semibold px-8 h-12 border-0 shadow-lg shadow-purple-200">
                  Create your free store →
                </Button>
              </Link>
            </div>

            {/* visual side */}
            <div className="flex-shrink-0 p-8 md:p-12 flex items-center justify-center">
              <div className="relative">
                {/* phone mockup */}
                <div className="w-52 bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 h-24 flex items-end px-4 pb-2">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-purple-700 font-bold text-xl shadow-lg -mb-6 border-2 border-white">A</div>
                  </div>
                  <div className="pt-8 px-4 pb-4">
                    <p className="font-bold text-gray-900 text-sm">Aisha's Jewels</p>
                    <p className="text-gray-400 text-xs mb-3">Jewellery · Surat</p>
                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                      {["💍", "📿", "✨"].map((e, i) => (
                        <div key={i} className="bg-purple-50 rounded-xl p-2 aspect-square flex flex-col items-center justify-center gap-1">
                          <span className="text-lg">{e}</span>
                          <span className="text-[9px] text-gray-400">₹{[599, 899, 299][i]}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-full py-2 text-center text-xs font-semibold text-white">
                      Buy via UPI →
                    </div>
                  </div>
                </div>
                {/* floating badge */}
                <div className="absolute -top-3 -right-3 bg-white rounded-2xl shadow-lg px-3 py-2 border border-green-100 flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[11px] font-semibold text-gray-700">New order!</span>
                </div>
                <div className="absolute -bottom-3 -left-3 bg-white rounded-2xl shadow-lg px-3 py-2 border border-purple-100">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">Verified review</p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 py-10 px-6 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Store className="w-3.5 h-3.5 text-white" />
            </div>
            Shopgram
          </div>
          <p className="text-gray-400 text-sm">
            Discover more stores on ShopGram · Built with ❤️ for India's Instagram sellers
          </p>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/" className="hover:text-gray-700 transition-colors">Home</Link>
            <Link href="/join" className="hover:text-gray-700 transition-colors">Sell</Link>
            <Link href="/login" className="hover:text-gray-700 transition-colors">Login</Link>
          </div>
        </div>
      </footer>

      {/* ── PRODUCT MODAL ── */}
      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  );
}
