import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Product } from "@/lib/supabase";
import { ShoppingBag } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
  onBuyNow: () => void;
}

export function ProductCard({ product, onClick, onBuyNow }: ProductCardProps) {
  const imageUrl = product.images && product.images.length > 0 ? product.images[0] : "https://placehold.co/400x400/png";

  return (
    <Card
      className="overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] hover-elevate flex flex-col"
      onClick={onClick}
      data-testid={`product-card-${product.id}`}
    >
      <div className="aspect-square relative overflow-hidden">
        <img
          src={imageUrl}
          alt={product.name}
          className="object-cover w-full h-full"
        />
        {!product.in_stock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold text-sm bg-black/60 px-3 py-1 rounded-full">Out of Stock</span>
          </div>
        )}
      </div>
      <CardContent className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <h3 className="font-semibold text-sm line-clamp-1" data-testid={`product-name-${product.id}`}>{product.name}</h3>
          <p className="font-bold text-base text-primary mt-0.5" data-testid={`product-price-${product.id}`}>₹{product.price}</p>
        </div>
        <Button
          size="sm"
          className="w-full rounded-full mt-auto"
          disabled={!product.in_stock}
          onClick={e => { e.stopPropagation(); onBuyNow(); }}
        >
          <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
          Buy Now
        </Button>
      </CardContent>
    </Card>
  );
}
