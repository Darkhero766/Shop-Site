import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Product } from "@/lib/supabase";
import { ShoppingBag, Images, Star } from "lucide-react";

interface ProductCardProps {
  product: Product;
  avgRating?: number;
  reviewCount?: number;
  onClick?: () => void;
  onBuyNow: () => void;
  animationDelay?: number;
}

export function ProductCard({ product, avgRating, reviewCount, onClick, onBuyNow, animationDelay = 0 }: ProductCardProps) {
  const imageUrl = product.images && product.images.length > 0
    ? product.images[0]
    : "https://placehold.co/400x400/png";
  const imageCount = product.images?.length ?? 0;

  return (
    <Card
      className="overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col border-0 shadow-md"
      style={{ animationDelay: `${animationDelay}ms` }}
      onClick={onClick}
      data-testid={`product-card-${product.id}`}
    >
      <div className="aspect-square relative overflow-hidden bg-muted">
        <img
          src={imageUrl}
          alt={product.name}
          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Image count badge */}
        {imageCount > 1 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
            <Images className="w-3 h-3" />
            <span>{imageCount}</span>
          </div>
        )}

        {/* In Stock badge */}
        {product.in_stock && (
          <div className="absolute top-2 left-2">
            <span className="bg-emerald-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
              In Stock
            </span>
          </div>
        )}

        {/* Out of stock overlay */}
        {!product.in_stock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold text-sm bg-black/60 px-3 py-1 rounded-full">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      <CardContent className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex-1">
          <h3 className="font-semibold text-sm line-clamp-1 leading-snug" data-testid={`product-name-${product.id}`}>
            {product.name}
          </h3>

          {/* Rating row */}
          {avgRating !== undefined && reviewCount !== undefined && reviewCount > 0 ? (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium text-foreground">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({reviewCount})</span>
            </div>
          ) : (
            <div className="h-4" />
          )}

          <p className="font-bold text-base text-primary mt-1" data-testid={`product-price-${product.id}`}>
            ₹{product.price}
          </p>
        </div>

        <Button
          size="sm"
          className="w-full rounded-full mt-auto text-xs h-8 transition-all duration-200 group-hover:shadow-md"
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
