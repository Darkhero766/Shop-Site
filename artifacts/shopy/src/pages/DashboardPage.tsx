import { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { supabase, Shop, Product, Order, Review, uploadImage } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import {
  Store, LogOut, Package, ShoppingBag, Star, LayoutDashboard,
  Copy, Check, Plus, Trash2, Pencil, X, Settings as SettingsIcon,
  TrendingUp, Clock, Search, ChevronRight, ExternalLink, Instagram,
  Phone, MapPin, CreditCard, CalendarDays, Hash, StickyNote, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ImageUpload } from "@/components/ImageUpload";

type ProductForm = {
  name: string;
  price: number;
  description: string;
  sizes: string;
};

const emptyForm: ProductForm = { name: "", price: 0, description: "", sizes: "" };

type DateRange = "today" | "week" | "month" | "all";

function isInRange(dateStr: string, range: DateRange): boolean {
  if (range === "all") return true;
  const d = new Date(dateStr);
  const now = new Date();
  if (range === "today") {
    return d.toDateString() === now.toDateString();
  }
  if (range === "week") {
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo;
  }
  if (range === "month") {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  return true;
}

function StatusBadge({ status }: { status: Order["status"] }) {
  return (
    <Badge
      variant={status === "confirmed" ? "default" : status === "declined" ? "destructive" : "secondary"}
      className={`capitalize whitespace-nowrap ${status === "confirmed" ? "bg-emerald-500 hover:bg-emerald-600" : status === "pending" ? "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100" : ""}`}
    >
      {status}
    </Badge>
  );
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { session, loading: authLoading } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "confirmed" | "declined">("all");

  // Orders search & date filter
  const [orderSearch, setOrderSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("all");

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{ order: Order } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Decline dialog
  const [declineDialog, setDeclineDialog] = useState<{ order: Order } | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [isDeclining, setIsDeclining] = useState(false);

  // Order detail panel
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

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
    if (authLoading) return;
    if (!session) { setLocation("/login"); return; }
    const user = session.user;

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
    toast.success("Shop link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnInstagram = () => {
    if (!shop) return;
    const text = encodeURIComponent(`Shop here 🛍️ https://${shop.subdomain}.shopgram.in`);
    window.open(`https://www.instagram.com/`, "_blank");
    navigator.clipboard.writeText(`Shop here 🛍️ https://${shop.subdomain}.shopgram.in`);
    toast.success("Link copied — paste it in your Instagram bio or story!");
  };

  // ── Confirm order ──
  const handleConfirmOrder = async () => {
    if (!confirmDialog) return;
    setIsConfirming(true);
    const { error } = await supabase.from("orders").update({ status: "confirmed" }).eq("id", confirmDialog.order.id);
    setIsConfirming(false);
    if (!error) {
      setOrders(prev => prev.map(o => o.id === confirmDialog.order.id ? { ...o, status: "confirmed" } : o));
      if (detailOrder?.id === confirmDialog.order.id) setDetailOrder(d => d ? { ...d, status: "confirmed" } : d);
      toast.success(`Order confirmed for ${confirmDialog.order.buyer_name} ✓`);
    } else {
      toast.error("Failed to confirm order");
    }
    setConfirmDialog(null);
  };

  // ── Decline order ──
  const handleDeclineOrder = async () => {
    if (!declineDialog) return;
    setIsDeclining(true);
    const updatePayload: Record<string, string> = { status: "declined" };
    if (declineReason.trim()) updatePayload.decline_reason = declineReason.trim();
    const { error } = await supabase.from("orders").update(updatePayload).eq("id", declineDialog.order.id);
    setIsDeclining(false);
    if (!error) {
      setOrders(prev => prev.map(o => o.id === declineDialog.order.id ? { ...o, status: "declined" } : o));
      if (detailOrder?.id === declineDialog.order.id) setDetailOrder(d => d ? { ...d, status: "declined" } : d);
      toast.success("Order declined");
    } else {
      toast.error("Failed to decline order");
    }
    setDeclineDialog(null);
    setDeclineReason("");
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
    setProductForm({ name: p.name, price: p.price, description: p.description ?? "", sizes: p.sizes?.join(", ") ?? "" });
    setProductImageFiles([null, null, null, null]);
    setProductImagePreviews([null, null, null, null]);
    setExistingImages(p.images ?? []);
    setShowProductForm(true);
  };

  const handleProductImageSlot = (slotIdx: number, file: File | null) => {
    setProductImageFiles(prev => { const n = [...prev]; n[slotIdx] = file; return n; });
    setProductImagePreviews(prev => { const n = [...prev]; n[slotIdx] = file ? URL.createObjectURL(file) : null; return n; });
  };

  const removeExistingImage = (idx: number) => setExistingImages(prev => prev.filter((_, i) => i !== idx));

  const saveProduct = async () => {
    if (!shop) return;
    if (!productForm.name.trim()) { toast.error("Product name is required"); return; }
    if (!productForm.price || productForm.price <= 0) { toast.error("Enter a valid price"); return; }
    setIsSavingProduct(true);
    try {
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

  // ── Computed stats ──
  const confirmedOrders = useMemo(() => orders.filter(o => o.status === "confirmed"), [orders]);
  const totalRevenue = useMemo(() => confirmedOrders.reduce((sum, o) => sum + (o.amount ?? 0), 0), [confirmedOrders]);
  const pendingCount = useMemo(() => orders.filter(o => o.status === "pending").length, [orders]);
  const avgRating = useMemo(() => reviews.length > 0 ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) : null, [reviews]);

  // ── Filtered orders ──
  const filteredOrders = useMemo(() => {
    let list = orderFilter === "all" ? orders : orders.filter(o => o.status === orderFilter);
    if (dateRange !== "all") list = list.filter(o => isInRange(o.created_at, dateRange));
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      list = list.filter(o =>
        o.buyer_name?.toLowerCase().includes(q) ||
        o.buyer_phone?.includes(q) ||
        o.order_id?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, orderFilter, dateRange, orderSearch]);

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

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-muted/30">
      {/* ── Sidebar ── */}
      <aside className="w-full md:w-64 bg-card border-r flex flex-col shrink-0">
        <div className="p-6 border-b">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <Store className="w-6 h-6" /> Shopgram
          </Link>
        </div>
        <div className="p-4 flex-1">
          <div className="p-4 bg-muted/50 rounded-xl">
            <p className="font-bold truncate">{shop.shop_name}</p>
            <a href={`?shop=${shop.subdomain}`} target="_blank" rel="noreferrer"
              className="text-xs text-primary hover:underline block mt-1 truncate">
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

      {/* ── Main ── */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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

          {/* ══════════════ OVERVIEW TAB ══════════════ */}
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
                    <Button variant="outline" size="sm" className="rounded-full border-amber-400 text-amber-800 hover:bg-amber-100">Preview store</Button>
                  </a>
                  {session?.user?.app_metadata?.role === "admin" && (
                    <Link href="/admin">
                      <Button size="sm" className="rounded-full bg-amber-500 hover:bg-amber-600 text-white">Go to Admin Panel</Button>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* 2×2 Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Total Revenue */}
              <Card className="border-l-4 border-l-emerald-500">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium mb-1">Total Revenue</p>
                      <p className="text-2xl md:text-3xl font-extrabold text-emerald-600">₹{totalRevenue.toLocaleString("en-IN")}</p>
                      <p className="text-xs text-muted-foreground mt-1">{confirmedOrders.length} confirmed orders</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Orders */}
              <Card className="border-l-4 border-l-violet-500">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium mb-1">Total Orders</p>
                      <p className="text-2xl md:text-3xl font-extrabold text-violet-600">{orders.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">{orders.filter(o => o.status === "confirmed").length} confirmed</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-5 h-5 text-violet-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pending Orders — clickable */}
              <Card className="border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setActiveTab("orders"); setOrderFilter("pending"); }}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium mb-1">Pending Orders</p>
                      <p className="text-2xl md:text-3xl font-extrabold text-amber-600">{pendingCount}</p>
                      <p className="text-xs text-primary mt-1 font-medium">Click to view →</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Average Rating */}
              <Card className="border-l-4 border-l-yellow-400">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium mb-1">Avg Rating</p>
                      <p className="text-2xl md:text-3xl font-extrabold text-yellow-600">
                        {avgRating !== null ? avgRating.toFixed(1) : "—"}
                        {avgRating !== null && <span className="text-base font-normal text-muted-foreground"> / 5</span>}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
                  <Button variant="ghost" size="sm" className="text-primary text-xs h-7"
                    onClick={() => setActiveTab("orders")}>
                    View all <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {orders.length === 0 ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">No orders yet.</p>
                ) : (
                  <div className="divide-y">
                    {orders.slice(0, 5).map(o => (
                      <div key={o.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setDetailOrder(o)}>
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                          {o.buyer_name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{o.buyer_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{o.products?.name ?? "—"}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-sm">₹{o.amount}</p>
                          <StatusBadge status={o.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Quick Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" className="rounded-full gap-2" onClick={copyUrl} data-testid="btn-copy-url">
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy shop link"}
                  </Button>
                  <a href={`?shop=${shop.subdomain}`} target="_blank" rel="noreferrer">
                    <Button variant="outline" className="rounded-full gap-2">
                      <ExternalLink className="w-4 h-4" /> Preview store
                    </Button>
                  </a>
                  <Button variant="outline" className="rounded-full gap-2" onClick={shareOnInstagram}>
                    <Instagram className="w-4 h-4" /> Share on Instagram
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Your store: <span className="font-mono font-medium text-primary">{shop.subdomain}.shopgram.in</span></p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════ PRODUCTS TAB ══════════════ */}
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
                  <div>
                    <label className="block text-sm font-medium mb-3">Product Images (up to 4)</label>
                    <div className="grid grid-cols-4 gap-3">
                      {existingImages.map((url, i) => (
                        <div key={`existing-${i}`} className="aspect-square relative rounded-xl overflow-hidden border">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button type="button"
                            className="absolute top-1 right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center"
                            onClick={() => removeExistingImage(i)}>
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {Array.from({ length: Math.max(0, 4 - existingImages.length) }).map((_, slotIdx) => (
                        <div key={`slot-${slotIdx}`} className="aspect-square">
                          {productImagePreviews[slotIdx] ? (
                            <div className="relative rounded-xl overflow-hidden border w-full h-full">
                              <img src={productImagePreviews[slotIdx]!} alt="" className="w-full h-full object-cover" />
                              <button type="button"
                                className="absolute top-1 right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center"
                                onClick={() => handleProductImageSlot(slotIdx, null)}>
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="w-full h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer text-muted-foreground hover:border-primary/50 hover:text-primary/70 transition-colors">
                              <Plus className="w-5 h-5 mb-1" />
                              <span className="text-xs">{slotIdx === 0 && existingImages.length === 0 ? "Main" : "Add"}</span>
                              <input type="file" accept="image/*" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleProductImageSlot(slotIdx, f); }} />
                            </label>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Product Name</label>
                      <Input placeholder="Handwoven Top" value={productForm.name}
                        onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))} data-testid="input-product-name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Price (₹)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                        <Input type="number" placeholder="999" className="pl-7" value={productForm.price || ""}
                          onChange={e => setProductForm(p => ({ ...p, price: Number(e.target.value) }))} data-testid="input-product-price" />
                      </div>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Sizes (comma separated, optional)</label>
                      <Input placeholder="S, M, L, XL" value={productForm.sizes}
                        onChange={e => setProductForm(p => ({ ...p, sizes: e.target.value }))} data-testid="input-product-sizes" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
                      <Input placeholder="Soft cotton material..." value={productForm.description}
                        onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))} data-testid="input-product-desc" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button onClick={saveProduct} disabled={isSavingProduct} className="rounded-full px-6" data-testid="btn-save-product">
                      {isSavingProduct ? "Saving..." : editingProduct ? "Save Changes" : "Add Product"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowProductForm(false)} className="rounded-full px-6">Cancel</Button>
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

          {/* ══════════════ ORDERS TAB ══════════════ */}
          <TabsContent value="orders" className="space-y-4">
            {/* Status filter */}
            <div className="flex flex-wrap gap-2">
              {(["all", "pending", "confirmed", "declined"] as const).map(f => {
                const count = f === "all" ? orders.length : orders.filter(o => o.status === f).length;
                return (
                  <Button key={f} variant={orderFilter === f ? "default" : "outline"} size="sm"
                    className="rounded-full capitalize" onClick={() => setOrderFilter(f)}>
                    {f === "all" ? "All Orders" : f}
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${orderFilter === f ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                      {count}
                    </span>
                  </Button>
                );
              })}
            </div>

            {/* Search + Date filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by name, phone or order ID…" className="pl-9 rounded-full"
                  value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
              </div>
              <div className="flex gap-1.5 shrink-0">
                {(["today", "week", "month", "all"] as const).map(r => (
                  <Button key={r} size="sm" variant={dateRange === r ? "default" : "outline"}
                    className="rounded-full text-xs px-3 capitalize"
                    onClick={() => setDateRange(r)}>
                    {r === "today" ? "Today" : r === "week" ? "This Week" : r === "month" ? "This Month" : "All Time"}
                  </Button>
                ))}
              </div>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Order ID</TableHead>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Buyer</TableHead>
                      <TableHead className="whitespace-nowrap">Phone</TableHead>
                      <TableHead className="whitespace-nowrap">Product</TableHead>
                      <TableHead className="whitespace-nowrap">Size</TableHead>
                      <TableHead className="whitespace-nowrap text-center">Qty</TableHead>
                      <TableHead className="whitespace-nowrap">Amount</TableHead>
                      <TableHead className="whitespace-nowrap">Payment</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                          {orderSearch ? "No orders match your search." : orderFilter === "all" ? "No orders yet." : `No ${orderFilter} orders.`}
                        </TableCell>
                      </TableRow>
                    ) : filteredOrders.map(order => (
                      <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                        <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                          {order.order_id ? `#${order.order_id}` : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{new Date(order.created_at).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap font-medium">{order.buyer_name}</TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{order.buyer_phone}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap max-w-[140px] truncate">{order.products?.name ?? "—"}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {order.size ? <span className="px-2 py-0.5 bg-muted rounded-full text-xs font-medium">{order.size}</span> : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-center">{order.quantity ?? 1}</TableCell>
                        <TableCell className="font-semibold whitespace-nowrap text-primary">₹{order.amount}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {order.payment_screenshot_url ? (
                            <a href={order.payment_screenshot_url} target="_blank" rel="noreferrer">
                              <img src={order.payment_screenshot_url} alt="proof"
                                className="w-10 h-10 rounded-lg object-cover border hover:opacity-80 transition-opacity" />
                            </a>
                          ) : order.utr ? (
                            <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">{order.utr}</span>
                          ) : "—"}
                        </TableCell>
                        <TableCell><StatusBadge status={order.status} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {order.status === "pending" && (
                              <>
                                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 rounded-full text-xs h-7 whitespace-nowrap"
                                  onClick={() => setConfirmDialog({ order })} data-testid={`btn-confirm-${order.id}`}>
                                  Confirm
                                </Button>
                                <Button size="sm" variant="destructive" className="rounded-full text-xs h-7"
                                  onClick={() => setDeclineDialog({ order })} data-testid={`btn-decline-${order.id}`}>
                                  Decline
                                </Button>
                              </>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full shrink-0"
                              onClick={() => setDetailOrder(order)} title="View details">
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════ REVIEWS TAB ══════════════ */}
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

          {/* ══════════════ SETTINGS TAB ══════════════ */}
          <TabsContent value="settings">
            <Card>
              <CardHeader><CardTitle>Shop Settings</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">WhatsApp Number</label>
                    <Input value={settingsForm.whatsapp}
                      onChange={e => setSettingsForm(p => ({ ...p, whatsapp: e.target.value }))}
                      placeholder="+919876543210" data-testid="settings-whatsapp" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">UPI ID</label>
                    <Input value={settingsForm.upi_id}
                      onChange={e => setSettingsForm(p => ({ ...p, upi_id: e.target.value }))}
                      placeholder="yourname@upi" data-testid="settings-upi" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Bio</label>
                  <Textarea value={settingsForm.bio}
                    onChange={e => setSettingsForm(p => ({ ...p, bio: e.target.value }))}
                    placeholder="Tell customers about your store…" rows={3} data-testid="settings-bio" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Delivery Info</label>
                  <Input value={settingsForm.delivery_info}
                    onChange={e => setSettingsForm(p => ({ ...p, delivery_info: e.target.value }))}
                    placeholder="Delivery in 5–7 days across India" data-testid="settings-delivery" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-3">UPI QR Code</label>
                  {settingsQrPreview && (
                    <img src={settingsQrPreview} alt="UPI QR" className="w-40 h-40 object-contain rounded-xl border mb-3" />
                  )}
                  <ImageUpload
                    onFileSelect={(file) => {
                      setSettingsQrFile(file);
                      setSettingsQrPreview(file ? URL.createObjectURL(file) : shop.upi_qr_url);
                    }}
                    label="Upload new QR code"
                  />
                </div>
                <Button onClick={saveSettings} disabled={isSavingSettings} className="rounded-full px-6" data-testid="btn-save-settings">
                  {isSavingSettings ? "Saving…" : "Save Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ══════════════ CONFIRM DIALOG ══════════════ */}
      <Dialog open={!!confirmDialog} onOpenChange={open => !open && setConfirmDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Order</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Confirm this order from{" "}
            <span className="font-semibold text-foreground">{confirmDialog?.order.buyer_name}</span>{" "}
            for{" "}
            <span className="font-semibold text-primary">₹{confirmDialog?.order.amount}</span>?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button className="rounded-full bg-emerald-500 hover:bg-emerald-600" onClick={handleConfirmOrder} disabled={isConfirming}>
              {isConfirming ? "Confirming…" : "Yes, Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════ DECLINE DIALOG ══════════════ */}
      <Dialog open={!!declineDialog} onOpenChange={open => { if (!open) { setDeclineDialog(null); setDeclineReason(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Declining order from <span className="font-semibold text-foreground">{declineDialog?.order.buyer_name}</span> for <span className="font-semibold">₹{declineDialog?.order.amount}</span>.
            </p>
            <div>
              <label className="block text-sm font-medium mb-1.5">Reason for declining <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Textarea placeholder="e.g. Out of stock, payment not received…" rows={3} value={declineReason}
                onChange={e => setDeclineReason(e.target.value)} className="resize-none" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => { setDeclineDialog(null); setDeclineReason(""); }}>Cancel</Button>
            <Button variant="destructive" className="rounded-full" onClick={handleDeclineOrder} disabled={isDeclining}>
              {isDeclining ? "Declining…" : "Decline Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════ ORDER DETAIL PANEL ══════════════ */}
      <Sheet open={!!detailOrder} onOpenChange={open => !open && setDetailOrder(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {detailOrder && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-2">
                  Order Details
                  {detailOrder.order_id && (
                    <span className="text-sm font-mono text-muted-foreground">#{detailOrder.order_id}</span>
                  )}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-5">
                {/* Status */}
                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <StatusBadge status={detailOrder.status} />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Date</p>
                    <p className="text-sm font-medium">{new Date(detailOrder.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                </div>

                {/* Buyer */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Buyer Info</h4>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary font-bold text-sm">{detailOrder.buyer_name?.[0]?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{detailOrder.buyer_name}</p>
                        {detailOrder.buyer_email && <p className="text-xs text-muted-foreground">{detailOrder.buyer_email}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-mono">{detailOrder.buyer_phone}</span>
                    </div>
                    {(detailOrder.full_address || detailOrder.city) && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">
                          {[detailOrder.full_address, detailOrder.city, detailOrder.pincode, detailOrder.state_name].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t" />

                {/* Order */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order Info</h4>
                  <div className="bg-muted/30 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium">{detailOrder.products?.name ?? "Product"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      {detailOrder.size && (
                        <div className="bg-white rounded-lg p-2">
                          <p className="text-xs text-muted-foreground">Size</p>
                          <p className="font-semibold text-sm">{detailOrder.size}</p>
                        </div>
                      )}
                      <div className="bg-white rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">Qty</p>
                        <p className="font-semibold text-sm">{detailOrder.quantity ?? 1}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="font-semibold text-sm text-primary">₹{detailOrder.amount}</p>
                      </div>
                    </div>
                    {detailOrder.special_instructions && (
                      <div className="flex items-start gap-2 text-sm mt-1">
                        <StickyNote className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{detailOrder.special_instructions}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t" />

                {/* Payment */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment</h4>
                  {detailOrder.payment_screenshot_url ? (
                    <a href={detailOrder.payment_screenshot_url} target="_blank" rel="noreferrer">
                      <img src={detailOrder.payment_screenshot_url} alt="Payment proof"
                        className="w-full rounded-xl border object-cover max-h-64 hover:opacity-90 transition-opacity" />
                      <p className="text-xs text-primary mt-1.5 text-center">Tap to view full image</p>
                    </a>
                  ) : detailOrder.utr ? (
                    <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl">
                      <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">UTR Number</p>
                        <p className="font-mono font-semibold tracking-wider">{detailOrder.utr}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No payment proof uploaded.</p>
                  )}
                </div>

                {/* Actions */}
                {detailOrder.status === "pending" && (
                  <>
                    <div className="border-t" />
                    <div className="flex gap-3">
                      <Button className="flex-1 rounded-full bg-emerald-500 hover:bg-emerald-600"
                        onClick={() => { setDetailOrder(null); setConfirmDialog({ order: detailOrder }); }}>
                        Confirm Order
                      </Button>
                      <Button variant="destructive" className="flex-1 rounded-full"
                        onClick={() => { setDetailOrder(null); setDeclineDialog({ order: detailOrder }); }}>
                        Decline
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
