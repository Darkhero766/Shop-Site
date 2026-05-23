import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@/lib/supabase";

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const imageUrl = product.images && product.images.length > 0 ? product.images[0] : "https://placehold.co/400x400/png";

  return (
    <Card
      className="overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] hover-elevate"
      onClick={onClick}
      data-testid={`product-card-${product.id}`}
    >
      <div className="aspect-square relative overflow-hidden">
        <img
          src={imageUrl}
          alt={product.name}
          className="object-cover w-full h-full"
        />
      </div>
      <CardContent className="p-4 space-y-1">
        <h3 className="font-semibold text-sm line-clamp-1" data-testid={`product-name-${product.id}`}>{product.name}</h3>
        <p className="font-bold text-lg text-primary" data-testid={`product-price-${product.id}`}>₹{product.price}</p>
        <p className="text-xs text-muted-foreground">Tap to view details</p>
      </CardContent>
    </Card>
  );
}
