import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Product } from "@/lib/supabase";

interface ProductCardProps {
  product: Product;
  shopName: string;
  whatsapp: string;
  onClick: () => void;
}

export function ProductCard({ product, shopName, whatsapp, onClick }: ProductCardProps) {
  const imageUrl = product.images && product.images.length > 0 ? product.images[0] : "https://placehold.co/400x400/png";

  const handleWhatsAppOrder = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `Hi, I want to order ${product.name} from ${shopName}`;
    window.open(`https://wa.me/91${whatsapp}?text=${encodeURIComponent(text)}`, "_blank");
  };

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
      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold text-sm line-clamp-1" data-testid={`product-name-${product.id}`}>{product.name}</h3>
        <p className="font-bold text-lg text-primary" data-testid={`product-price-${product.id}`}>₹{product.price}</p>
        <Button 
          className="w-full rounded-full" 
          onClick={handleWhatsAppOrder}
          data-testid={`product-order-btn-${product.id}`}
        >
          Order on WhatsApp
        </Button>
      </CardContent>
    </Card>
  );
}