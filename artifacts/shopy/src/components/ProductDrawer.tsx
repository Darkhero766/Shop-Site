import { useState, useEffect, useCallback } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Product, Review } from "@/lib/supabase";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Star, Truck, BadgeCheck } from "lucide-react";

interface ProductDrawerProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  reviews?: Review[];
}

export function ProductDrawer({ product, isOpen, onClose, reviews = [] }: ProductDrawerProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

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
  }, [product]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (!product) return null;

  const avgRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : null;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[92vh]">
        <div className="mx-auto w-full max-w-sm overflow-y-auto pb-6">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="text-left text-lg leading-snug" data-testid="drawer-product-name">
              {product.name}
            </DrawerTitle>
            <DrawerDescription className="sr-only">Product details for {product.name}</DrawerDescription>
          </DrawerHeader>

          {/* Image Carousel */}
          <div className="relative mt-3">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {product.images && product.images.length > 0 ? (
                  product.images.map((img, i) => (
                    <div className="flex-[0_0_100%] min-w-0" key={i}>
                      <div className="aspect-square px-4">
                        <img
                          src={img}
                          alt={`${product.name} - ${i + 1}`}
                          className="w-full h-full object-cover rounded-2xl shadow-sm"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex-[0_0_100%] min-w-0">
                    <div className="aspect-square px-4">
                      <div className="w-full h-full bg-muted rounded-2xl flex items-center justify-center">
                        <span className="text-muted-foreground text-sm">No image available</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Prev / Next arrows */}
            {imageCount > 1 && (
              <>
                <button
                  onClick={scrollPrev}
                  className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition-colors disabled:opacity-30"
                  disabled={selectedIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={scrollNext}
                  className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition-colors disabled:opacity-30"
                  disabled={selectedIndex === imageCount - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Dot indicators + counter */}
            {imageCount > 1 && (
              <div className="flex flex-col items-center gap-2 mt-3">
                <div className="flex gap-1.5">
                  {product.images!.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => emblaApi?.scrollTo(i)}
                      className={`rounded-full transition-all duration-300 ${
                        i === selectedIndex
                          ? "w-5 h-2 bg-primary"
                          : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {selectedIndex + 1} / {imageCount} photos
                </span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="px-4 mt-5 space-y-5">

            {/* Price + Rating row */}
            <div className="flex items-start justify-between">
              <p className="text-3xl font-extrabold text-primary" data-testid="drawer-product-price">
                ₹{product.price}
              </p>
              {avgRating !== null && (
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < Math.round(avgRating) ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {avgRating.toFixed(1)} · {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-sm text-muted-foreground leading-relaxed" data-testid="drawer-product-desc">
                {product.description}
              </p>
            )}

            {/* Size selector */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="font-semibold text-sm">
                  Select Size
                  {selectedSize && <span className="text-primary ml-2">— {selectedSize}</span>}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      className={`px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200 ${
                        selectedSize === size
                          ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                          : "border-border hover:border-primary/60 hover:bg-primary/5"
                      }`}
                      onClick={() => setSelectedSize(size === selectedSize ? null : size)}
                      data-testid={`drawer-size-${size}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery info */}
            {product.delivery_info && (
              <div className="flex gap-3 bg-muted/40 p-3.5 rounded-xl text-sm">
                <Truck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-0.5">Delivery</p>
                  <p className="text-muted-foreground">{product.delivery_info}</p>
                </div>
              </div>
            )}

            {/* Mini reviews preview */}
            {reviews.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  Top Reviews
                </h4>
                {reviews.slice(0, 2).map(r => (
                  <div key={r.id} className="bg-muted/30 rounded-xl p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"}`} />
                        ))}
                      </div>
                      <span className="font-medium text-xs">{r.buyer_name || "Anonymous"}</span>
                      {r.verified && (
                        <span className="flex items-center text-xs text-emerald-600">
                          <BadgeCheck className="w-3 h-3 mr-0.5" /> Verified
                        </span>
                      )}
                    </div>
                    {r.review_text && (
                      <p className="text-muted-foreground text-xs line-clamp-2">"{r.review_text}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DrawerFooter className="mt-6">
            <Button
              className="w-full rounded-full py-6 text-base font-semibold shadow-lg"
              onClick={onClose}
              data-testid="drawer-order-btn"
            >
              Order via UPI ↓
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
