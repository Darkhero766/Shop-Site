import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { supabase, Shop, Product, Order, Review } from "@/lib/supabase";
import { Store, LogOut, Package, ShoppingBag, Star, Settings as SettingsIcon, LayoutDashboard, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLocation("/login");
        return;
      }

      try {
        const { data: shopData } = await supabase.from("shops").select("*").eq("email", user.email).maybeSingle();
        if (!shopData) {
          toast.error("Shop not found");
          return;
        }
        setShop(shopData);

        const [prodRes, orderRes, revRes] = await Promise.all([
          supabase.from("products").select("*").eq("shop_id", shopData.id).order("created_at", { ascending: false }),
          supabase.from("orders").select("*, products(name)").eq("shop_id", shopData.id).order("created_at", { ascending: false }),
          supabase.from("reviews").select("*").eq("shop_id", shopData.id).order("created_at", { ascending: false })
        ]);

        if (prodRes.data) setProducts(prodRes.data);
        if (orderRes.data) setOrders(orderRes.data as Order[]);
        if (revRes.data) setReviews(revRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [setLocation]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLocation("/login");
  };

  const copyUrl = () => {
    if (!shop) return;
    const url = `https://${shop.subdomain}.shopsite.in`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("URL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const updateOrderStatus = async (id: string, status: "confirmed" | "declined") => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (!error) {
      setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
      toast.success(`Order ${status}`);
    } else {
      toast.error("Failed to update order");
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading dashboard...</div>;
  if (!shop) return <div className="p-8">Shop not found. <Link href="/join"><Button className="ml-4">Create one</Button></Link></div>;

  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const avgRating = reviews.length > 0 ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : "0.0";

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-muted/30">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r flex flex-col">
        <div className="p-6 border-b">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <Store className="w-6 h-6" /> ShopSite
          </Link>
        </div>
        <div className="p-4 flex-1">
          <div className="mb-6 p-4 bg-muted/50 rounded-xl">
            <p className="font-bold truncate">{shop.shop_name}</p>
            <Badge variant={shop.status === "active" ? "default" : "secondary"} className="mt-2 capitalize">
              {shop.status}
            </Badge>
          </div>
          {/* Quick Nav visible on mobile as row, col on desktop (handled by Tabs below generally, but here just visual rep) */}
        </div>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start text-destructive" onClick={handleLogout} data-testid="btn-logout">
            <LogOut className="w-4 h-4 mr-2" /> Log out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <TabsList className="bg-card border w-full md:w-auto overflow-x-auto justify-start">
              <TabsTrigger value="overview" className="flex-1 md:flex-none"><LayoutDashboard className="w-4 h-4 mr-2 hidden md:block" /> Overview</TabsTrigger>
              <TabsTrigger value="orders" className="flex-1 md:flex-none"><ShoppingBag className="w-4 h-4 mr-2 hidden md:block" /> Orders</TabsTrigger>
              <TabsTrigger value="products" className="flex-1 md:flex-none"><Package className="w-4 h-4 mr-2 hidden md:block" /> Products</TabsTrigger>
              <TabsTrigger value="reviews" className="flex-1 md:flex-none"><Star className="w-4 h-4 mr-2 hidden md:block" /> Reviews</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Store Link</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-primary truncate max-w-[200px]">{shop.subdomain}.shopsite.in</span>
                    <Button variant="ghost" size="icon" onClick={copyUrl} className="h-8 w-8 shrink-0">
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending Orders</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold">{pendingOrders}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Rating</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold flex items-center gap-2">
                    {avgRating} <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Recent Orders (UTR Submissions)</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>UTR</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No orders yet.</TableCell></TableRow>
                    ) : (
                      orders.map((order) => (
                        <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                          <TableCell className="whitespace-nowrap">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="font-medium">{order.buyer_name}</div>
                            <div className="text-xs text-muted-foreground">{order.buyer_phone}</div>
                          </TableCell>
                          <TableCell>{order.products?.name}</TableCell>
                          <TableCell>₹{order.amount}</TableCell>
                          <TableCell className="font-mono text-xs">{order.utr}</TableCell>
                          <TableCell>
                            <Badge variant={order.status === "confirmed" ? "default" : order.status === "declined" ? "destructive" : "secondary"}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {order.status === "pending" && (
                              <div className="flex gap-2">
                                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 rounded-full" onClick={() => updateOrderStatus(order.id, "confirmed")}>Confirm</Button>
                                <Button size="sm" variant="destructive" className="rounded-full" onClick={() => updateOrderStatus(order.id, "declined")}>Decline</Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Your Catalog</CardTitle>
                <Button size="sm" className="rounded-full">Add Product</Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {products.map(p => (
                    <div key={p.id} className="border rounded-xl p-3 bg-card" data-testid={`admin-product-${p.id}`}>
                      <div className="aspect-square bg-muted rounded-lg mb-2 overflow-hidden relative">
                        {p.images?.[0] ? <img src={p.images[0]} alt="" className="object-cover w-full h-full" /> : <Package className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />}
                      </div>
                      <h4 className="font-medium text-sm truncate">{p.name}</h4>
                      <p className="text-primary font-bold text-sm">₹{p.price}</p>
                    </div>
                  ))}
                  {products.length === 0 && <div className="col-span-full text-center py-8 text-muted-foreground">No products found.</div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
             <Card>
              <CardHeader><CardTitle>Customer Reviews</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reviews.length === 0 ? <p className="text-center py-8 text-muted-foreground">No reviews yet.</p> : reviews.map(r => (
                    <div key={r.id} className="border-b last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{r.buyer_name || "Anonymous"}</span>
                        <div className="flex text-yellow-400">
                          {Array.from({length: 5}).map((_, i) => <Star key={i} className={`w-3 h-3 ${i < r.rating ? "fill-current" : "text-muted fill-muted"}`} />)}
                        </div>
                      </div>
                      <p className="text-sm">{r.review_text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}