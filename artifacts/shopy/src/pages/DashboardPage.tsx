import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { supabase, Shop, Product, Order, Review, uploadImage } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import {
  Store, LogOut, Package, ShoppingBag, Star, LayoutDashboard,
  Copy, Check, Plus, Trash2, Pencil, X, Settings as SettingsIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/ImageUpload";

type ProductForm = {
  name: string;
  price: number;
  description: string;
  sizes: string;
};

const emptyForm: ProductForm = { name: "", price: 0, description: "", sizes: "" };

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { session, loading: authLoading } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "confirmed" | "declined">("all");

  // Product form state
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(emptyForm);
  const [productImageFiles, setProductImageFiles] = useState<(File | null)[]>([null, null, null, null]);
  const [productImagePreviews, setProductImagePreviews] = useState<(string | null)[]>([null, null, null, null]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({ bio: "", whatsapp: "", upi_id: "", delivery_info: "" });
  const [settingsQrFile, setSettingsQrFile] = useState<File | null>(null);
  const [settingsQrPreview, setSettingsQrPreview] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    // Wait until auth has resolved — avoids false redirects while session loads
    if (authLoading) return;
    if (!session) { setLocation("/login"); return; }

    const user = session.user;
    setUserEmail(user.email ?? "");

    async function loadData() {
      try {
        const { data: shopData } = await supabase.from("shops").select("*").eq("email", user.email).maybeSingle();
        if (!shopData) { toast.error("Shop not found"); setIsLoading(false); return; }
        setShop(shopData);
        setSettingsForm({
          bio: shopData.bio ?? "",
          whatsapp: shopData.whatsapp ?? "",
          upi_id: shopData.upi_id ?? "",
          delivery_info: shopData.delivery_info ?? "",
        });
        setSettingsQrPreview(shopData.upi_qr_url ?? null);

        const [prodRes, orderRes, revRes] = await Promise.all([
          supabase.from("products").select("*").eq("shop_id", shopData.id).order("created_at", { ascending: false }),
          supabase.from("orders").select("*, products(name)").eq("shop_id", shopData.id).order("created_at", { ascending: false }),
          supabase.from("reviews").select("*").eq("shop_id", shopData.id).order("created_at", { ascending: false }),
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
  }, [authLoading, session, setLocation]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLocation("/login");
  };

  const copyUrl = () => {
    if (!shop) return;
    navigator.clipboard.writeText(`https://${shop.subdomain}.shopgram.in`);
    setCopied(true);
    toast.success("URL copied!");
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

  // ── Product form helpers ──
  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm(emptyForm);
    setProductImageFiles([null, null, null, null]);
    setProductImagePreviews([null, null, null, null]);
    setExistingImages([]);
    setShowProductForm(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      price: p.price,
      description: p.description ?? "",
      sizes: p.sizes?.join(", ") ?? "",
    });
    setProductImageFiles([null, null, null, null]);
    setProductImagePreviews([null, null, null, null]);
    setExistingImages(p.images ?? []);
    setShowProductForm(true);
  };

  const handleProductImageSlot = (slotIdx: number, file: File | null) => {
    setProductImageFiles(prev => { const n = [...prev]; n[slotIdx] = file; return n; });
    setProductImagePreviews(prev => { const n = [...prev]; n[slotIdx] = file ? URL.createObjectURL(file) : null; return n; });
  };

  const removeExistingImage = (idx: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== idx));
  };

  const saveProduct = async () => {
    if (!shop) return;
    if (!productForm.name.trim()) { toast.error("Product name is required"); return; }
    if (!productForm.price || productForm.price <= 0) { toast.error("Enter a valid price"); return; }
    setIsSavingProduct(true);
    try {
      // Upload new images
      const newUrls: string[] = [];
      for (let i = 0; i < productImageFiles.length; i++) {
        const file = productImageFiles[i];
        if (file) {
          const path = `${shop.subdomain}/${Date.now()}_${i}`;
          const { url, error: uploadErr } = await uploadImage("Product-images", file, path);
          if (uploadErr) toast.error(`Image upload failed: ${uploadErr}`);
          if (url) newUrls.push(url);
        }
      }
      const allImages = [...existingImages, ...newUrls];

      const payload = {
        shop_id: shop.id,
        name: productForm.name.trim(),
        price: Number(productForm.price),
        description: productForm.description.trim() || null,
        sizes: productForm.sizes ? productForm.sizes.split(",").map(s => s.trim()).filter(Boolean) : null,
        images: allImages,
        in_stock: true,
      };

      if (editingProduct) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
        if (error) throw error;
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...payload } as Product : p));
        toast.success("Product updated");
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select().single();
        if (error) throw error;
        setProducts(prev => [data as Product, ...prev]);
        toast.success("Product added");
      }
      setShowProductForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save product");
    } finally {
      setIsSavingProduct(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) {
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success("Product deleted");
    } else {
      toast.error("Failed to delete product");
    }
  };

  // ── Settings save ──
  const saveSettings = async () => {
    if (!shop) return;
    setIsSavingSettings(true);
    try {
      let qrUrl = shop.upi_qr_url;
      if (settingsQrFile) {
        const path = `${shop.subdomain}/${Date.now()}_qr`;
        const { url: uploadedQr, error: qrErr } = await uploadImage("Upi-qr", settingsQrFile, path);
        if (qrErr) toast.error(`QR upload failed: ${qrErr}`);
        if (uploadedQr) qrUrl = uploadedQr;
      }
      const { error } = await supabase.from("shops").update({
        bio: settingsForm.bio,
        whatsapp: settingsForm.whatsapp,
        upi_id: settingsForm.upi_id,
        delivery_info: settingsForm.delivery_info,
        upi_qr_url: qrUrl,
      }).eq("id", shop.id);
      if (error) throw error;
      setShop(prev => prev ? { ...prev, ...settingsForm, upi_qr_url: qrUrl } : prev);
      toast.success("Settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
    </div>
  );
  if (!shop) return (
    <div className="p-8 text-center">
      <p className="mb-4 text-muted-foreground">Shop not found.</p>
      <Link href="/join"><Button className="rounded-full">Create your store</Button></Link>
    </div>
  );

  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const avgRating = reviews.length > 0 ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : "—";

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-muted/30">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r flex flex-col shrink-0">
        <div className="p-6 border-b">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <Store className="w-6 h-6" /> Shopgram
          </Link>
        </div>
        <div className="p-4 flex-1">
          <div className="p-4 bg-muted/50 rounded-xl">
            <p className="font-bold truncate">{shop.shop_name}</p>
            <a
              href={`?shop=${shop.subdomain}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline block mt-1 truncate"
            >
              Preview store →
            </a>
            <Badge variant={shop.status === "active" ? "default" : "secondary"} className="mt-2 capitalize text-xs">
              {shop.status}
            </Badge>
          </div>
        </div>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start text-destructive" onClick={handleLogout} data-testid="btn-logout">
            <LogOut className="w-4 h-4 mr-2" /> Log out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
            <TabsList className="bg-card border w-full md:w-auto overflow-x-auto justify-start">
              <TabsTrigger value="overview"><LayoutDashboard className="w-4 h-4 mr-1.5 hidden md:block" />Overview</TabsTrigger>
              <TabsTrigger value="products"><Package className="w-4 h-4 mr-1.5 hidden md:block" />Products</TabsTrigger>
              <TabsTrigger value="orders"><ShoppingBag className="w-4 h-4 mr-1.5 hidden md:block" />Orders</TabsTrigger>
              <TabsTrigger value="reviews"><Star className="w-4 h-4 mr-1.5 hidden md:block" />Reviews</TabsTrigger>
              <TabsTrigger value="settings"><SettingsIcon className="w-4 h-4 mr-1.5 hidden md:block" />Settings</TabsTrigger>
            </TabsList>
          </div>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="space-y-6">
            {shop.status === "pending" && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <p className="font-bold text-amber-800 mb-1">Your store is pending approval</p>
                  <p className="text-sm text-amber-700">
                    {session?.user?.app_metadata?.role === "admin"
                      ? <>You are the admin — go to the Admin Panel and click <strong>Approve</strong> next to this store. URL: <span className="font-mono font-bold">{shop.subdomain}.shopgram.in</span></>
                      : <>Your store is under review. An admin will activate it shortly. Your future URL: <span className="font-mono font-bold">{shop.subdomain}.shopgram.in</span></>
                    }
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a href={`/?shop=${shop.subdomain}`} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="rounded-full border-amber-400 text-amber-800 hover:bg-amber-100">
                      Preview store
                    </Button>
                  </a>
                  {session?.user?.app_metadata?.role === "admin" && (
                    <Link href="/admin">
                      <Button size="sm" className="rounded-full bg-amber-500 hover:bg-amber-600 text-white">
                        Go to Admin Panel
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Store Link</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-primary truncate">{shop.subdomain}.shopgram.in</span>
                    <Button variant="ghost" size="icon" onClick={copyUrl} className="h-8 w-8 shrink-0" data-testid="btn-copy-url">
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <a href={`?shop=${shop.subdomain}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-1 block">
                    Preview your store →
                  </a>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending Orders</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold text-amber-500">{pendingOrders}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Rating</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold flex items-center gap-1.5">
                    {avgRating} {reviews.length > 0 && <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />}
                  </p>
                  {reviews.length > 0 && <p className="text-xs text-muted-foreground">{reviews.length} reviews</p>}
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Quick Stats</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-2xl font-bold">{products.length}</p><p className="text-xs text-muted-foreground">Products</p></div>
                  <div><p className="text-2xl font-bold">{orders.length}</p><p className="text-xs text-muted-foreground">Total Orders</p></div>
                  <div><p className="text-2xl font-bold">{orders.filter(o => o.status === "confirmed").length}</p><p className="text-xs text-muted-foreground">Confirmed</p></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Products ── */}
          <TabsContent value="products">
            {showProductForm ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{editingProduct ? "Edit Product" : "Add Product"}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setShowProductForm(false)} className="rounded-full">
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Image slots */}
                  <div>
                    <label className="block text-sm font-medium mb-3">Product Images (up to 4)</label>
                    <div className="grid grid-cols-4 gap-3">
                      {/* Existing images */}
                      {existingImages.map((url, i) => (
                        <div key={`existing-${i}`} className="aspect-square relative rounded-xl overflow-hidden border">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            className="absolute top-1 right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center"
                            onClick={() => removeExistingImage(i)}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {/* New image slots */}
                      {Array.from({ length: Math.max(0, 4 - existingImages.length) }).map((_, slotIdx) => (
                        <div key={`slot-${slotIdx}`} className="aspect-square">
                          {productImagePreviews[slotIdx] ? (
                            <div className="relative rounded-xl overflow-hidden border w-full h-full">
                              <img src={productImagePreviews[slotIdx]!} alt="" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                className="absolute top-1 right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center"
                                onClick={() => handleProductImageSlot(slotIdx, null)}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="w-full h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer text-muted-foreground hover:border-primary/50 hover:text-primary/70 transition-colors">
                              <Plus className="w-5 h-5 mb-1" />
                              <span className="text-xs">{slotIdx === 0 && existingImages.length === 0 ? "Main" : "Add"}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleProductImageSlot(slotIdx, file);
                                }}
                              />
                            </label>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Product Name</label>
                      <Input
                        placeholder="Handwoven Top"
                        value={productForm.name}
                        onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}
                        data-testid="input-product-name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Price (₹)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          placeholder="999"
                          className="pl-7"
                          value={productForm.price || ""}
                          onChange={e => setProductForm(p => ({ ...p, price: Number(e.target.value) }))}
                          data-testid="input-product-price"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Sizes (comma separated, optional)</label>
                      <Input
                        placeholder="S, M, L, XL"
                        value={productForm.sizes}
                        onChange={e => setProductForm(p => ({ ...p, sizes: e.target.value }))}
                        data-testid="input-product-sizes"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
                      <Input
                        placeholder="Soft cotton material..."
                        value={productForm.description}
                        onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))}
                        data-testid="input-product-desc"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button onClick={saveProduct} disabled={isSavingProduct} className="rounded-full px-6" data-testid="btn-save-product">
                      {isSavingProduct ? "Saving..." : editingProduct ? "Save Changes" : "Add Product"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowProductForm(false)} className="rounded-full px-6">
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Your Catalog ({products.length})</CardTitle>
                  <Button size="sm" className="rounded-full" onClick={openAddProduct} data-testid="btn-add-product">
                    <Plus className="w-4 h-4 mr-1" /> Add Product
                  </Button>
                </CardHeader>
                <CardContent>
                  {products.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium mb-2">No products yet</p>
                      <Button variant="outline" size="sm" className="rounded-full" onClick={openAddProduct}>Add your first product</Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {products.map(p => (
                        <div key={p.id} className="border rounded-xl overflow-hidden bg-card group" data-testid={`product-card-${p.id}`}>
                          <div className="aspect-square bg-muted relative overflow-hidden">
                            {p.images?.[0]
                              ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                              : <Package className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/40" />
                            }
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => openEditProduct(p)} data-testid={`btn-edit-${p.id}`}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={() => deleteProduct(p.id)} data-testid={`btn-delete-${p.id}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="p-3">
                            <h4 className="font-medium text-sm truncate">{p.name}</h4>
                            <p className="text-primary font-bold text-sm">₹{p.price}</p>
                            {p.images && p.images.length > 1 && (
                              <p className="text-xs text-muted-foreground">{p.images.length} photos</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Orders ── */}
          <TabsContent value="orders" className="space-y-4">
            {/* Filter bar */}
            <div className="flex flex-wrap gap-2">
              {(["all", "pending", "confirmed", "declined"] as const).map(f => {
                const count = f === "all" ? orders.length : orders.filter(o => o.status === f).length;
                return (
                  <Button
                    key={f}
                    variant={orderFilter === f ? "default" : "outline"}
                    size="sm"
                    className="rounded-full capitalize"
                    onClick={() => setOrderFilter(f)}
                  >
                    {f === "all" ? "All Orders" : f}
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${orderFilter === f ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                      {count}
                    </span>
                  </Button>
                );
              })}
            </div>

            <Card>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Order ID</TableHead>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Product</TableHead>
                      <TableHead className="whitespace-nowrap">Size</TableHead>
                      <TableHead className="whitespace-nowrap">Qty</TableHead>
                      <TableHead className="whitespace-nowrap">Amount</TableHead>
                      <TableHead className="whitespace-nowrap">Buyer Name</TableHead>
                      <TableHead className="whitespace-nowrap">Phone</TableHead>
                      <TableHead className="whitespace-nowrap">City</TableHead>
                      <TableHead className="whitespace-nowrap">Pincode</TableHead>
                      <TableHead className="whitespace-nowrap min-w-[180px]">Address</TableHead>
                      <TableHead className="whitespace-nowrap">Payment Proof</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const filtered = orderFilter === "all" ? orders : orders.filter(o => o.status === orderFilter);
                      if (filtered.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={14} className="text-center py-12 text-muted-foreground">
                              {orderFilter === "all" ? "No orders yet." : `No ${orderFilter} orders.`}
                            </TableCell>
                          </TableRow>
                        );
                      }
                      return filtered.map((order) => (
                        <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                          <TableCell className="font-mono text-xs whitespace-nowrap">{order.order_id ?? "—"}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{new Date(order.created_at).toLocaleDateString("en-IN")}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{order.products?.name ?? "—"}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{order.size ?? "—"}</TableCell>
                          <TableCell className="text-sm text-center">{order.quantity ?? 1}</TableCell>
                          <TableCell className="font-semibold whitespace-nowrap">₹{order.amount}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap font-medium">{order.buyer_name}</TableCell>
                          <TableCell className="font-mono text-xs whitespace-nowrap">{order.buyer_phone}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{order.city ?? "—"}</TableCell>
                          <TableCell className="font-mono text-xs whitespace-nowrap">{order.pincode ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px]">{order.full_address ?? "—"}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {order.payment_screenshot_url ? (
                              <a href={order.payment_screenshot_url} target="_blank" rel="noreferrer"
                                className="text-primary underline underline-offset-2 hover:opacity-80">
                                View screenshot
                              </a>
                            ) : order.utr ? (
                              <span className="font-mono">{order.utr}</span>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={order.status === "confirmed" ? "default" : order.status === "declined" ? "destructive" : "secondary"}
                              className="capitalize whitespace-nowrap"
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {order.status === "pending" && (
                              <div className="flex gap-1.5">
                                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 rounded-full text-xs h-7 whitespace-nowrap"
                                  onClick={() => updateOrderStatus(order.id, "confirmed")} data-testid={`btn-confirm-${order.id}`}>
                                  Confirm
                                </Button>
                                <Button size="sm" variant="destructive" className="rounded-full text-xs h-7"
                                  onClick={() => updateOrderStatus(order.id, "declined")} data-testid={`btn-decline-${order.id}`}>
                                  Decline
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Reviews ── */}
          <TabsContent value="reviews">
            <Card>
              <CardHeader><CardTitle>Customer Reviews ({reviews.length})</CardTitle></CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground">No reviews yet.</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map(r => (
                      <div key={r.id} className="border-b last:border-0 pb-4 last:pb-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-medium text-sm">{r.buyer_name || "Anonymous"}</span>
                          <div className="flex text-yellow-400">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-current" : "text-muted fill-muted"}`} />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleDateString("en-IN")}</span>
                        </div>
                        {r.review_text && <p className="text-sm text-muted-foreground">{r.review_text}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Settings ── */}
          <TabsContent value="settings">
            <Card>
              <CardHeader><CardTitle>Shop Settings</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">WhatsApp Number</label>
                    <Input
                      value={settingsForm.whatsapp}
                      onChange={e => setSettingsForm(p => ({ ...p, whatsapp: e.target.value }))}
                      placeholder="+919876543210"
                      data-testid="settings-whatsapp"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">UPI ID</label>
                    <Input
                      value={settingsForm.upi_id}
                      onChange={e => setSettingsForm(p => ({ ...p, upi_id: e.target.value }))}
                      placeholder="store@okaxis"
                      data-testid="settings-upi-id"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Bio</label>
                  <Textarea
                    value={settingsForm.bio}
                    onChange={e => setSettingsForm(p => ({ ...p, bio: e.target.value }))}
                    maxLength={150}
                    className="resize-none"
                    placeholder="Tell buyers about your shop..."
                    data-testid="settings-bio"
                  />
                  <p className="text-xs text-muted-foreground text-right mt-1">{settingsForm.bio.length}/150</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Delivery Info</label>
                  <Textarea
                    value={settingsForm.delivery_info}
                    onChange={e => setSettingsForm(p => ({ ...p, delivery_info: e.target.value }))}
                    className="resize-none"
                    placeholder="Ships in 3-5 days..."
                    data-testid="settings-delivery"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">UPI QR Code</label>
                  <ImageUpload
                    onUpload={(file) => {
                      setSettingsQrFile(file);
                      setSettingsQrPreview(file ? URL.createObjectURL(file) : shop.upi_qr_url);
                    }}
                    previewUrl={settingsQrPreview}
                    label="Update QR Image"
                    dataTestId="settings-qr"
                  />
                </div>
                <Button onClick={saveSettings} disabled={isSavingSettings} className="rounded-full px-8" data-testid="btn-save-settings">
                  {isSavingSettings ? "Saving..." : "Save Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
