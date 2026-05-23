import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Product } from "@/lib/supabase";
import useEmblaCarousel from "embla-carousel-react";

interface ProductDrawerProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDrawer({ product, isOpen, onClose }: ProductDrawerProps) {
  const [emblaRef] = useEmblaCarousel({ loop: false });
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  if (!product) return null;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-sm overflow-y-auto pb-6">
          <DrawerHeader>
            <DrawerTitle data-testid="drawer-product-name">{product.name}</DrawerTitle>
            <DrawerDescription className="sr-only">Product details for {product.name}</DrawerDescription>
          </DrawerHeader>

          {/* Carousel */}
          <div className="overflow-hidden mb-6" ref={emblaRef}>
            <div className="flex">
              {product.images && product.images.length > 0 ? (
                product.images.map((img, i) => (
                  <div className="flex-[0_0_100%] min-w-0" key={i}>
                    <div className="aspect-square p-4">
                      <img src={img} alt={`${product.name} - ${i + 1}`} className="w-full h-full object-cover rounded-xl" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-[0_0_100%] min-w-0">
                  <div className="aspect-square p-4">
                    <div className="w-full h-full bg-muted rounded-xl flex items-center justify-center">
                      <span className="text-muted-foreground">No image available</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-4 space-y-6">
            <div>
              <p className="text-2xl font-bold text-primary mb-2" data-testid="drawer-product-price">₹{product.price}</p>
              {product.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-line" data-testid="drawer-product-desc">
                  {product.description}
                </p>
              )}
            </div>

            {product.sizes && product.sizes.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Select Size</h4>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                        selectedSize === size
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedSize(size)}
                      data-testid={`drawer-size-${size}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.delivery_info && (
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <p className="font-medium mb-1">Delivery Information</p>
                <p className="text-muted-foreground">{product.delivery_info}</p>
              </div>
            )}
          </div>

          <DrawerFooter className="mt-4">
            <Button
              className="w-full rounded-full py-6 text-lg"
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
