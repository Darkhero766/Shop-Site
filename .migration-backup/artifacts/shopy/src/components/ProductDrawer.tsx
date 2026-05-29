import { useState, useEffect, useCallback, useRef } from "react";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Product, Review } from "@/lib/supabase";
import useEmblaCarousel from "embla-carousel-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Star, Truck, BadgeCheck,
  X, Maximize2, ArrowLeft, Share2, Zap, Check, Minus, Plus,
  Shield, Package,
} from "lucide-react";

interface ProductDrawerProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onOrder?: () => void;
  reviews?: Review[];
  shopName?: string;
}

export function ProductDrawer({
  product, isOpen, onClose, onOrder, reviews = [], shopName,
}: ProductDrawerProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const [bouncingSize, setBouncingSize] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const imageCount = product?.images?.length ?? 0;

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    setSelectedIndex(0);
    setSelectedSize(null);
    setQuantity(1);
    setSizeError(false);
    setShowCheckmark(false);
  }, [product]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const handleSizeSelect = (size: string) => {
    const next = size === selectedSize ? null : size;
    setSelectedSize(next);
    if (next) {
      setBouncingSize(size);
      setTimeout(() => setBouncingSize(null), 500);
    }
    setSizeError(false);
  };

  const handleOrder = () => {
    if (product?.sizes && product.sizes.length > 0 && !selectedSize) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 700);
      return;
    }
    setShowCheckmark(true);
    setTimeout(() => {
      setShowCheckmark(false);
      onOrder?.();
    }, 700);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name,
        text: `Check out ${product?.name} on Shopgram!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (!product) return null;

  const avgRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : null;

  const totalPrice = product.price * quantity;
  const mostRecentReview = reviews[0];
  const currentImage = product.images?.[selectedIndex];

  return (
    <>
      <AnimatePresence>
        {fullscreenImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
            onClick={() => setFullscreenImg(null)}
          >
            <button
              className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
              onClick={() => setFullscreenImg(null)}
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <img
              src={fullscreenImg}
              alt="Fullscreen view"
              className="max-w-full max-h-full object-contain"
              style={{ touchAction: "pinch-zoom" }}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="h-[92vh] flex flex-col p-0 overflow-hidden focus:outline-none">
          <DrawerTitle className="sr-only">Product details for {product.name}</DrawerTitle>
          <DrawerDescription className="sr-only">View product info, select size and order</DrawerDescription>

          {/* ── Fixed Header ── */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b bg-white z-10">
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            {shopName && (
              <span className="text-sm font-medium text-muted-foreground truncate max-w-[160px]">
                {shopName}
              </span>
            )}
            <button
              onClick={handleShare}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* ── Scrollable Body ── */}
          <div className="flex-1 overflow-y-auto" ref={scrollAreaRef}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {/* Image carousel — edge to edge */}
              <div className="relative bg-gray-50">
                <div className="overflow-hidden" ref={emblaRef}>
                  <div className="flex">
                    {product.images && product.images.length > 0 ? (
                      product.images.map((img, i) => (
                        <div className="flex-[0_0_100%] min-w-0" key={i}>
                          <div className="aspect-square">
                            <img
                              src={img}
                              alt={`${product.name} ${i + 1}`}
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex-[0_0_100%] min-w-0">
                        <div className="aspect-square bg-muted flex items-center justify-center">
                          <span className="text-muted-foreground text-sm">No image available</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Counter pill — top left */}
                {imageCount > 1 && (
                  <div className="absolute top-3 left-3 bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-full select-none">
                    {selectedIndex + 1} / {imageCount}
                  </div>
                )}

                {/* Fullscreen button — top right */}
                {currentImage && (
                  <button
                    onClick={() => setFullscreenImg(currentImage)}
                    className="absolute top-3 right-3 w-9 h-9 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                    aria-label="View fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}

                {/* Prev / Next arrows */}
                {imageCount > 1 && (
                  <>
                    <button
                      onClick={scrollPrev}
                      disabled={selectedIndex === 0}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center transition-opacity disabled:opacity-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={scrollNext}
                      disabled={selectedIndex === imageCount - 1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center transition-opacity disabled:opacity-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Dot indicators */}
                {imageCount > 1 && (
                  <div className="flex justify-center gap-1.5 py-3">
                    {product.images!.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => emblaApi?.scrollTo(i)}
                        aria-label={`Go to image ${i + 1}`}
                        className={`rounded-full transition-all duration-300 ${
                          i === selectedIndex
                            ? "w-5 h-2 bg-primary"
                            : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* ── Product Info ── */}
              <div className="px-4 pt-5 space-y-4">

                {/* Name */}
                <h2 className="text-2xl font-bold leading-tight" data-testid="drawer-product-name">
                  {product.name}
                </h2>

                {/* Price + Stock badge */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className="text-[32px] font-extrabold text-primary leading-none"
                    data-testid="drawer-product-price"
                  >
                    ₹{product.price}
                  </span>
                  {product.in_stock ? (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      In Stock ✓
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-red-500 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                      Out of Stock
                    </span>
                  )}
                </div>

                {/* Star rating row */}
                {avgRating !== null && (
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.round(avgRating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "fill-gray-200 text-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {avgRating.toFixed(1)} ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
                    </span>
                  </div>
                )}

                <div className="border-t border-gray-100" />

                {/* Size selector */}
                {product.sizes && product.sizes.length > 0 && (
                  <div className={`space-y-2 ${sizeError ? "animate-shake" : ""}`}>
                    <h4 className="font-semibold text-sm">
                      Select Size
                      {selectedSize && (
                        <span className="text-primary ml-2 font-normal">— {selectedSize}</span>
                      )}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((size) => (
                        <motion.button
                          key={size}
                          animate={
                            bouncingSize === size
                              ? { scale: [1, 1.25, 0.9, 1.08, 1] }
                              : {}
                          }
                          transition={{ type: "spring", duration: 0.45 }}
                          onClick={() => handleSizeSelect(size)}
                          data-testid={`drawer-size-${size}`}
                          className={`min-w-[44px] min-h-[44px] px-4 rounded-full border text-sm font-semibold transition-all duration-150 ${
                            selectedSize === size
                              ? "bg-primary text-white border-primary shadow-md"
                              : "bg-white text-primary border-primary/50 hover:bg-primary/5"
                          }`}
                        >
                          {size}
                        </motion.button>
                      ))}
                    </div>
                    {sizeError && (
                      <p className="text-red-500 text-xs font-medium">Please select a size</p>
                    )}
                  </div>
                )}

                {/* Description */}
                {product.description && (
                  <p
                    className="text-base text-muted-foreground leading-relaxed"
                    data-testid="drawer-product-desc"
                  >
                    {product.description}
                  </p>
                )}

                {/* Trust badges */}
                <div className="flex items-center justify-around py-3 border-y border-gray-100 text-xs text-muted-foreground">
                  <div className="flex flex-col items-center gap-1">
                    <Shield className="w-5 h-5 text-gray-400" />
                    <span>Secure UPI</span>
                  </div>
                  <div className="w-px h-8 bg-gray-200" />
                  <div className="flex flex-col items-center gap-1">
                    <BadgeCheck className="w-5 h-5 text-emerald-500" />
                    <span>Verified Seller</span>
                  </div>
                  <div className="w-px h-8 bg-gray-200" />
                  <div className="flex flex-col items-center gap-1">
                    <Package className="w-5 h-5 text-gray-400" />
                    <span>Direct Shipping</span>
                  </div>
                </div>

                {/* Delivery info */}
                {product.delivery_info && (
                  <div className="flex gap-3 items-start bg-muted/40 p-3.5 rounded-xl text-sm">
                    <Truck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">{product.delivery_info}</p>
                  </div>
                )}

                {/* Reviews mini preview */}
                <div className="bg-muted/30 rounded-xl p-3.5">
                  {reviews.length > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < Math.round(avgRating ?? 0)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "fill-gray-200 text-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-foreground">
                          ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
                        </span>
                      </div>
                      {mostRecentReview?.review_text && (
                        <p className="text-xs text-muted-foreground truncate">
                          <span className="font-medium text-foreground">
                            {mostRecentReview.buyer_name?.split(" ")[0] ?? "Buyer"}:
                          </span>{" "}
                          "{mostRecentReview.review_text}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      Be the first to review this product ✨
                    </p>
                  )}
                </div>

                {/* Bottom padding so sticky footer doesn't cover content */}
                <div className="h-6" />
              </div>
            </motion.div>
          </div>

          {/* ── Sticky Footer ── */}
          <div className="shrink-0 border-t bg-white px-4 pt-3 pb-4 space-y-3">
            {/* Quantity selector */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Quantity</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-6 text-center font-bold text-base tabular-nums">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Buy Now button */}
            <motion.button
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.08 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleOrder}
              disabled={!product.in_stock || showCheckmark}
              data-testid="drawer-order-btn"
              className="w-full py-4 rounded-full text-white font-bold text-base flex items-center justify-center gap-2 shadow-xl relative overflow-hidden disabled:opacity-60"
              style={{
                background: product.in_stock
                  ? "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)"
                  : "#9CA3AF",
              }}
            >
              {/* Subtle pulse ring */}
              {!showCheckmark && product.in_stock && (
                <span className="absolute inset-0 rounded-full animate-btn-pulse pointer-events-none" />
              )}

              <AnimatePresence mode="wait">
                {showCheckmark ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Check className="w-5 h-5" /> Done!
                  </motion.span>
                ) : (
                  <motion.span
                    key="buy"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                    {product.in_stock ? `Buy Now — ₹${totalPrice}` : "Out of Stock"}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
