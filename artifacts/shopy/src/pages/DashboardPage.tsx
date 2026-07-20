import { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { supabase, Shop, Product, Order, Review, uploadImage } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import {
  Store, LogOut, Package, ShoppingBag, Star, LayoutDashboard,
  Copy, Check, Plus, Trash2, Pencil, X, Settings as SettingsIcon,
  TrendingUp, Clock, Search, ChevronRight, ExternalLink, Instagram,
  Phone, MapPin, Hash, StickyNote, CreditCard, AlertTriangle, CheckCircle2, Eye,
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
import { MiniQRPreview } from "@/components/UPIPayment";
import { validateUPIId } from "@/lib/upi";

type ProductForm = { name: string; price: number; description: string; sizes: string; in_stock: boolean };
const emptyForm: ProductForm = { name: "", price: 0, description: "", sizes: "", in_stock: true };
type DateRange = "today" | "week" | "month" | "all";

function isInRange(dateStr: string, range: DateRange): boolean {
  if (range === "all") return true;
  const d = new Date(dateStr);
  const now = new Date();
  if (range === "today") return d.toDateString() === now.toDateString();
  if (range === "week") { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w; }
  if (range === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  return true;
}

function StatusBadge({ status }: { status: Order["status"] }) {
  const cls =
    status === "confirmed"  ? "bg-emerald-500 hover:bg-emerald-600 text-white" :
    status === "completed"  ? "bg-blue-500 hover:bg-blue-600 text-white" :
    status === "pending"    ? "bg-amber-100 text-amber-700 border-amber-200" : "";
  return (
    <Badge variant={status === "declined" ? "destructive" : "default"}
      className={`capitalize whitespace-nowrap text-xs ${cls}`}>
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
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "confirmed" | "declined" | "completed">("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("all");

  // Dialogs
  const [confirmDialog, setConfirmDialog] = useState<{ order: Order } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [declineDialog, setDeclineDialog] = useState<{ order: Order } | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [isDeclining, setIsDeclining] = useState(false);
  const [completeDialog, setCompleteDialog] = useState<{ order: Order } | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(emptyForm);
  const [productImageFiles, setProductImageFiles] = useState<(File | null)[]>([null, null, null, null]);
  const [productImagePreviews, setProductImagePreviews] = useState<(string | null)[]>([null, null, null, null]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Settings
  const [settingsForm, setSettingsForm] = useState({ shop_name: "", insta_handle: "", category: "", bio: "", whatsapp: "", upi_id: "", delivery_info: "" });
  const [settingsLogoFile, setSettingsLogoFile] = useState<File | null>(null);
  const [settingsLogoPreview, setSettingsLogoPreview] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // Visit stats
  const [visitCount, setVisitCount] = useState<number>(0);
  const [todayVisitCount, setTodayVisitCount] = useState<number>(0);

  useEffect(() => {
    if (authLoading) return;
    if (!session) { setLocation("/login"); return; }
    const user = session.user;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    async function loadData() {
      try {
        const { data: shopData } = await supabase.from("shops").select("*").eq("email", user.email).maybeSingle();
        if (!shopData) { toast.error("Shop not found"); setIsLoading(false); return; }
        setShop(shopData);
        setSettingsForm({ shop_name: shopData.shop_name ?? "", insta_handle: shopData.insta_handle ?? "", category: shopData.category ?? "", bio: shopData.bio ?? "", whatsapp: shopData.whatsapp ?? "", upi_id: shopData.upi_id ?? "", delivery_info: shopData.delivery_info ?? "" });
        setSettingsLogoPreview(shopData.logo_url ?? null);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [prodRes, orderRes, revRes] = await Promise.all([
          supabase.from("products").select("*").eq("shop_id", shopData.id).order("created_at", { ascending: false }),
          supabase.from("orders").select("*, products(name)").eq("shop_id", shopData.id).order("created_at", { ascending: false }),
          supabase.from("reviews").select("*").eq("shop_id", shopData.id).order("created_at", { ascending: false }),
        ]);
        if (prodRes.data) setProducts(prodRes.data);
        if (orderRes.data) setOrders(orderRes.data as Order[]);
        if (revRes.data) setReviews(revRes.data);

        try {
          const [totalVisitRes, todayVisitRes] = await Promise.all([
            supabase.from("shop_visits").select("id", { count: "exact", head: true }).eq("shop_id", shopData.id),
            supabase.from("shop_visits").select("id", { count: "exact", head: true }).eq("shop_id", shopData.id).gte("visited_at", todayStart.toISOString()),
          ]);
          setVisitCount(totalVisitRes.count ?? 0);
          setTodayVisitCount(todayVisitRes.count ?? 0);
        } catch {
          setVisitCount(0);
          setTodayVisitCount(0);
        }

        // Subscribe to real-time new visits
        realtimeChannel = supabase
          .channel(`shop-visits-${shopData.id}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "shop_visits", filter: `shop_id=eq.${shopData.id}` },
            () => {
              setVisitCount(prev => prev + 1);
              const now = new Date();
              const isToday = now.getHours() >= 0; // always true; check date
              const visitDate = new Date();
              if (visitDate.toDateString() === new Date().toDateString()) {
                setTodayVisitCount(prev => prev + 1);
              }
            }
          )
          .subscribe();
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    }
    loadData();

    return () => {
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
  }, [authLoading, session, setLocation]);

  const handleLogout = async () => { await supabase.auth.signOut(); setLocation("/login"); };

  const copyUrl = () => {
    if (!shop) return;
    navigator.clipboard.writeText(`https://${shop.subdomain}.shopgram.in`);
    setCopied(true); toast.success("Shop link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnInstagram = () => {
    if (!shop) return;
    navigator.clipboard.writeText(`Shop here 🛍️ https://${shop.subdomain}.shopgram.in`);
    toast.success("Link copied — paste it in your Instagram bio or story!");
  };

  const handleConfirmOrder = async () => {
    if (!confirmDialog) return;
    setIsConfirming(true);
    const { error } = await supabase.from("orders").update({ status: "confirmed" }).eq("id", confirmDialog.order.id);
    setIsConfirming(false);
    if (!error) {
      setOrders(prev => prev.map(o => o.id === confirmDialog.order.id ? { ...o, status: "confirmed" } : o));
      if (detailOrder?.id === confirmDialog.order.id) setDetailOrder(d => d ? { ...d, status: "confirmed" } : d);
      toast.success(`Order confirmed for ${confirmDialog.order.buyer_name} ✓`);
    } else toast.error("Failed to confirm order");
    setConfirmDialog(null);
  };

  const handleCompleteOrder = async () => {
    if (!completeDialog) return;
    setIsCompleting(true);
    const { error } = await supabase.from("orders").update({ status: "completed" }).eq("id", completeDialog.order.id);
    setIsCompleting(false);
    if (!error) {
      setOrders(prev => prev.map(o => o.id === completeDialog.order.id ? { ...o, status: "completed" } : o));
      if (detailOrder?.id === completeDialog.order.id) setDetailOrder(d => d ? { ...d, status: "completed" } : d);
      toast.success(`Order marked as completed ✓`);
    } else toast.error("Failed to update order");
    setCompleteDialog(null);
  };

  const handleDeclineOrder = async () => {
    if (!declineDialog) return;
    setIsDeclining(true);
    const payload: Record<string, string> = { status: "declined" };
    if (declineReason.trim()) payload.decline_reason = declineReason.trim();
    const { error } = await supabase.from("orders").update(payload).eq("id", declineDialog.order.id);
    setIsDeclining(false);
    if (!error) {
      setOrders(prev => prev.map(o => o.id === declineDialog.order.id ? { ...o, status: "declined" } : o));
      if (detailOrder?.id === declineDialog.order.id) setDetailOrder(d => d ? { ...d, status: "declined" } : d);
      toast.success("Order declined");
    } else toast.error("Failed to decline order");
    setDeclineDialog(null); setDeclineReason("");
  };

  const openAddProduct = () => {
    setEditingProduct(null); setProductForm(emptyForm);
    setProductImageFiles([null, null, null, null]); setProductImagePreviews([null, null, null, null]);
    setExistingImages([]); setShowProductForm(true);
  };
  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({ name: p.name, price: p.price, description: p.description ?? "", sizes: p.sizes?.join(", ") ?? "", in_stock: p.in_stock });
    setProductImageFiles([null, null, null, null]); setProductImagePreviews([null, null, null, null]);
    setExistingImages(p.images ?? []); setShowProductForm(true);
  };
  const handleProductImageSlot = (i: number, file: File | null) => {
    setProductImageFiles(prev => { const n = [...prev]; n[i] = file; return n; });
    setProductImagePreviews(prev => { const n = [...prev]; n[i] = file ? URL.createObjectURL(file) : null; return n; });
  };
  const removeExistingImage = (i: number) => setExistingImages(prev => prev.filter((_, j) => j !== i));

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
          const { url, error } = await uploadImage("Product-images", file, `${shop.subdomain}/${Date.now()}_${i}`);
          if (error) toast.error(`Image upload failed: ${error}`);
          if (url) newUrls.push(url);
        }
      }
      const payload = {
        shop_id: shop.id, name: productForm.name.trim(), price: Number(productForm.price),
        description: productForm.description.trim() || null,
        sizes: productForm.sizes ? productForm.sizes.split(",").map(s => s.trim()).filter(Boolean) : null,
        images: [...existingImages, ...newUrls], in_stock: productForm.in_stock,
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
    } catch (err: any) { toast.error(err.message || "Failed to save product"); }
    finally { setIsSavingProduct(false); }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) { setProducts(prev => prev.filter(p => p.id !== id)); toast.success("Product deleted"); }
    else toast.error("Failed to delete product");
  };

  const saveSettings = async () => {
    if (!shop) return;
    setIsSavingSettings(true);
    try {
      let logoUrl = shop.logo_url ?? null;
      if (settingsLogoFile) {
        const { url, error } = await uploadImage("Product-images", settingsLogoFile, `${shop.subdomain}/logo_${Date.now()}`);
        if (error) toast.error(`Logo upload failed: ${error}`);
        if (url) logoUrl = url;
      }
      const { error } = await supabase.from("shops").update({
        ...settingsForm,
        logo_url: logoUrl,
      }).eq("id", shop.id);
      if (error) throw error;
      setShop(prev => prev ? { ...prev, ...settingsForm, logo_url: logoUrl } : prev);
      toast.success("Settings saved");
    } catch (err: any) { toast.error(err.message || "Failed to save settings"); }
    finally { setIsSavingSettings(false); }
  };

  // Computed
  const confirmedOrders = useMemo(() => orders.filter(o => o.status === "confirmed"), [orders]);
  const totalRevenue = useMemo(() => confirmedOrders.reduce((s, o) => s + (o.amount ?? 0), 0), [confirmedOrders]);
  const pendingCount = useMemo(() => orders.filter(o => o.status === "pending").length, [orders]);
  const avgRating = useMemo(() => reviews.length > 0 ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : null, [reviews]);
  const filteredOrders = useMemo(() => {
    let list = orderFilter === "all" ? orders : orders.filter(o => o.status === orderFilter);
    if (dateRange !== "all") list = list.filter(o => isInRange(o.created_at, dateRange));
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      list = list.filter(o => o.buyer_name?.toLowerCase().includes(q) || o.buyer_phone?.includes(q) || o.order_id?.toLowerCase().includes(q));
    }
    return list;
  }, [orders, orderFilter, dateRange, orderSearch]);

  // ── Plan / billing helpers ──
  const planType = shop?.plan ?? "trial";
  const isTrialExpired = planType === "trial" && shop?.trial_ends_at != null && new Date(shop.trial_ends_at) < new Date();
  const trialDaysLeft = shop?.trial_ends_at ? Math.ceil((new Date(shop.trial_ends_at).getTime() - Date.now()) / 86400000) : null;
  const daysExpiredAgo = isTrialExpired && shop?.trial_ends_at ? Math.ceil((Date.now() - new Date(shop.trial_ends_at).getTime()) / 86400000) : 0;

  const tabDefs = [
    { value: "overview", icon: LayoutDashboard, label: "Home" },
    { value: "products", icon: Package, label: "Products" },
    { value: "orders", icon: ShoppingBag, label: "Orders", badge: pendingCount },
    { value: "reviews", icon: Star, label: "Reviews" },
    { value: "settings", icon: SettingsIcon, label: "Settings" },
    { value: "billing", icon: CreditCard, label: "Billing" },
  ];

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

  // ── Shared tab content sections ──
  const tabLabel = tabDefs.find(t => t.value === activeTab)?.label ?? "Dashboard";

  return (
    <div className="min-h-[100dvh] bg-muted/30">

      {/* ══ MOBILE: Fixed top header ══ */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-14 bg-card border-b flex items-center px-4 gap-2 shadow-sm">
        <Store className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate leading-tight">{shop.shop_name}</p>
          <Badge variant={shop.status === "active" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-4 capitalize">
            {shop.status}
          </Badge>
        </div>
        <a href={`?shop=${shop.subdomain}`} target="_blank" rel="noreferrer">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-primary shrink-0">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </a>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      <div className="flex">
        {/* ══ DESKTOP: Sidebar ══ */}
        <aside className="hidden md:flex w-64 min-h-screen bg-card border-r flex-col shrink-0 sticky top-0 self-start">
          <div className="p-6 border-b">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
              <Store className="w-6 h-6" /> Shopgram
            </Link>
          </div>
          <div className="p-4 flex-1">
            <div className="p-4 bg-muted/50 rounded-xl">
              <p className="font-bold truncate">{shop.shop_name}</p>
              <a href={`?shop=${shop.subdomain}`} target="_blank" rel="noreferrer"
                className="text-xs text-primary hover:underline block mt-1 truncate">Preview store →</a>
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

        {/* ══ Main content ══ */}
        <main className="flex-1 pt-14 md:pt-0 pb-24 md:pb-0 overflow-y-auto min-h-screen">
          <div className="p-4 md:p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">

              {/* Desktop tab header */}
              <div className="hidden md:flex justify-between items-center gap-4">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <TabsList className="bg-card border">
                  {tabDefs.map(t => (
                    <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                      <t.icon className="w-4 h-4" />{t.label}
                      {t.badge ? <span className="ml-0.5 w-4 h-4 bg-destructive/20 text-destructive text-[10px] font-bold rounded-full flex items-center justify-center">{t.badge}</span> : null}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* Mobile page title */}
              <div className="md:hidden">
                <h1 className="text-xl font-bold">{tabLabel}</h1>
              </div>

              {/* Trial expired banner — shown on all tabs */}
              {isTrialExpired && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-800 text-sm">
                      Your free trial ended {daysExpiredAgo} {daysExpiredAgo === 1 ? "day" : "days"} ago. Your store is still live.
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">Upgrade to Pro to keep it running.</p>
                  </div>
                  <Button size="sm" className="rounded-full bg-amber-500 hover:bg-amber-600 text-white h-8 shrink-0"
                    onClick={() => setActiveTab("billing")}>
                    Upgrade Now
                  </Button>
                </div>
              )}

              {/* ════════ OVERVIEW ════════ */}
              <TabsContent value="overview" className="space-y-5 mt-0">
                {shop.status === "pending" && (
                  <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-3">
                    <p className="font-bold text-amber-800 text-sm">Your store is pending approval</p>
                    <p className="text-sm text-amber-700">
                      {session?.user?.app_metadata?.role === "admin"
                        ? <>Admin: go to Admin Panel and click <strong>Approve</strong>. URL: <span className="font-mono font-bold">{shop.subdomain}.shopgram.in</span></>
                        : <>Under review. Your URL: <span className="font-mono font-bold">{shop.subdomain}.shopgram.in</span></>}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <a href={`/?shop=${shop.subdomain}`} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" className="rounded-full border-amber-400 text-amber-800 h-8">Preview store</Button>
                      </a>
                      {session?.user?.app_metadata?.role === "admin" && (
                        <Link href="/admin"><Button size="sm" className="rounded-full bg-amber-500 hover:bg-amber-600 text-white h-8">Admin Panel</Button></Link>
                      )}
                    </div>
                  </div>
                )}

                {/* Stats 2×2 */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="border-l-4 border-l-emerald-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground font-medium mb-1 truncate">Total Revenue</p>
                          <p className="text-xl md:text-2xl font-extrabold text-emerald-600 truncate">₹{totalRevenue.toLocaleString("en-IN")}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{confirmedOrders.length} confirmed</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-violet-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-1 truncate">Total Orders</p>
                          <p className="text-xl md:text-2xl font-extrabold text-violet-600">{orders.length}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{confirmedOrders.length} confirmed</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-4 h-4 text-violet-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-amber-500 cursor-pointer active:scale-[0.98] transition-transform"
                    onClick={() => { setActiveTab("orders"); setOrderFilter("pending"); }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-1">Pending</p>
                          <p className="text-xl md:text-2xl font-extrabold text-amber-600">{pendingCount}</p>
                          <p className="text-xs text-primary mt-0.5 font-medium">Tap to view →</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4 text-amber-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-yellow-400">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-1">Avg Rating</p>
                          <p className="text-xl md:text-2xl font-extrabold text-yellow-600">
                            {avgRating !== null ? avgRating.toFixed(1) : "—"}
                            {avgRating !== null && <span className="text-sm font-normal text-muted-foreground"> /5</span>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{reviews.length} reviews</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Store Visits — full-width, live via Supabase Realtime */}
                  <Card className="col-span-2 border-l-4 border-l-sky-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                            <Eye className="w-4 h-4 text-sky-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground font-medium mb-0.5">Store Visits</p>
                            <p className="text-xl md:text-2xl font-extrabold text-sky-600">
                              {visitCount.toLocaleString("en-IN")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground font-medium mb-0.5">Today</p>
                          <p className="text-xl md:text-2xl font-extrabold text-sky-500">
                            +{todayVisitCount.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-xs text-muted-foreground">Live — updates instantly when someone visits your store</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Orders */}
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Recent Orders</CardTitle>
                      <Button variant="ghost" size="sm" className="text-primary text-xs h-7 px-2"
                        onClick={() => setActiveTab("orders")}>
                        View all <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {orders.length === 0 ? (
                      <p className="text-center py-6 text-sm text-muted-foreground">No orders yet.</p>
                    ) : (
                      <div className="divide-y">
                        {orders.slice(0, 5).map(o => (
                          <div key={o.id} className="flex items-center gap-3 px-4 py-3 active:bg-muted/50 cursor-pointer"
                            onClick={() => setDetailOrder(o)}>
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                              {o.buyer_name?.[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{o.buyer_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{o.products?.name ?? "—"}</p>
                            </div>
                            <div className="text-right shrink-0 space-y-1">
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
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold">Quick Links</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-1 gap-2">
                      <Button variant="outline" className="rounded-xl justify-start gap-2 h-11" onClick={copyUrl} data-testid="btn-copy-url">
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        {copied ? "Copied!" : "Copy shop link"}
                      </Button>
                      <a href={`?shop=${shop.subdomain}`} target="_blank" rel="noreferrer" className="block">
                        <Button variant="outline" className="rounded-xl justify-start gap-2 h-11 w-full">
                          <ExternalLink className="w-4 h-4" /> Preview store
                        </Button>
                      </a>
                      <Button variant="outline" className="rounded-xl justify-start gap-2 h-11" onClick={shareOnInstagram}>
                        <Instagram className="w-4 h-4" /> Share on Instagram
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      <span className="font-mono font-medium text-primary">{shop.subdomain}.shopgram.in</span>
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ════════ PRODUCTS ════════ */}
              <TabsContent value="products" className="mt-0">
                {showProductForm ? (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-2">
                      <CardTitle className="text-base">{editingProduct ? "Edit Product" : "Add Product"}</CardTitle>
                      <Button variant="ghost" size="icon" onClick={() => setShowProductForm(false)} className="rounded-full h-8 w-8">
                        <X className="w-4 h-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-5 px-4 pb-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Product Images (up to 4)</label>
                        <div className="grid grid-cols-4 gap-2">
                          {existingImages.map((url, i) => (
                            <div key={`ex-${i}`} className="aspect-square relative rounded-xl overflow-hidden border">
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              <button type="button" onClick={() => removeExistingImage(i)}
                                className="absolute top-1 right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {Array.from({ length: Math.max(0, 4 - existingImages.length) }).map((_, si) => (
                            <div key={`slot-${si}`} className="aspect-square">
                              {productImagePreviews[si] ? (
                                <div className="relative rounded-xl overflow-hidden border w-full h-full">
                                  <img src={productImagePreviews[si]!} alt="" className="w-full h-full object-cover" />
                                  <button type="button" onClick={() => handleProductImageSlot(si, null)}
                                    className="absolute top-1 right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <label className="w-full h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer text-muted-foreground hover:border-primary/50 transition-colors">
                                  <Plus className="w-4 h-4 mb-0.5" />
                                  <span className="text-[10px]">{si === 0 && existingImages.length === 0 ? "Main" : "Add"}</span>
                                  <input type="file" accept="image/*" className="hidden"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleProductImageSlot(si, f); }} />
                                </label>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Product Name</label>
                          <Input placeholder="Handwoven Top" value={productForm.name}
                            onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))} data-testid="input-product-name" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Price (₹)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                            <Input type="number" placeholder="999" className="pl-7" value={productForm.price || ""}
                              onChange={e => setProductForm(p => ({ ...p, price: Number(e.target.value) }))} data-testid="input-product-price" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Sizes <span className="text-muted-foreground font-normal">(comma separated)</span></label>
                          <Input placeholder="S, M, L, XL" value={productForm.sizes}
                            onChange={e => setProductForm(p => ({ ...p, sizes: e.target.value }))} data-testid="input-product-sizes" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
                          <Input placeholder="Soft cotton material..." value={productForm.description}
                            onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))} data-testid="input-product-desc" />
                        </div>
                      </div>
                      {/* Stock toggle */}
                      <div className="flex items-center justify-between rounded-xl border px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">In Stock</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {productForm.in_stock ? "Buyers can order this product" : "Product shows as Out of Stock"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setProductForm(p => ({ ...p, in_stock: !p.in_stock }))}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none ${productForm.in_stock ? "bg-emerald-500" : "bg-muted"}`}
                          data-testid="toggle-in-stock">
                          <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform ${productForm.in_stock ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                      </div>
                      <div className="flex gap-3">
                        <Button onClick={saveProduct} disabled={isSavingProduct} className="rounded-full flex-1" data-testid="btn-save-product">
                          {isSavingProduct ? "Saving..." : editingProduct ? "Save Changes" : "Add Product"}
                        </Button>
                        <Button variant="outline" onClick={() => setShowProductForm(false)} className="rounded-full flex-1">Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-2">
                      <CardTitle className="text-base">Catalog ({products.length})</CardTitle>
                      <Button size="sm" className="rounded-full h-8" onClick={openAddProduct} data-testid="btn-add-product">
                        <Plus className="w-4 h-4 mr-1" /> Add
                      </Button>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      {products.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="font-medium mb-3 text-sm">No products yet</p>
                          <Button variant="outline" size="sm" className="rounded-full" onClick={openAddProduct}>Add your first product</Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {products.map(p => (
                            <div key={p.id} className="border rounded-xl overflow-hidden bg-card group" data-testid={`product-card-${p.id}`}>
                              <div className="aspect-square bg-muted relative overflow-hidden">
                                {p.images?.[0]
                                  ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                                  : <Package className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/30" />}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => openEditProduct(p)} data-testid={`btn-edit-${p.id}`}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={() => deleteProduct(p.id)} data-testid={`btn-delete-${p.id}`}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                                {/* Mobile tap buttons */}
                                <div className="md:hidden absolute bottom-1 right-1 flex gap-1">
                                  <button className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow" onClick={() => openEditProduct(p)}>
                                    <Pencil className="w-3 h-3 text-gray-700" />
                                  </button>
                                  <button className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shadow" onClick={() => deleteProduct(p.id)}>
                                    <Trash2 className="w-3 h-3 text-white" />
                                  </button>
                                </div>
                              </div>
                              <div className="p-2.5">
                                <h4 className="font-medium text-xs truncate">{p.name}</h4>
                                <div className="flex items-center justify-between mt-0.5">
                                  <p className="text-primary font-bold text-sm">₹{p.price}</p>
                                  <button
                                    type="button"
                                    title={p.in_stock ? "Mark out of stock" : "Mark in stock"}
                                    onClick={async () => {
                                      const newVal = !p.in_stock;
                                      await supabase.from("products").update({ in_stock: newVal }).eq("id", p.id);
                                      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, in_stock: newVal } : x));
                                      toast.success(newVal ? "Marked in stock" : "Marked out of stock");
                                    }}
                                    className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${p.in_stock ? "bg-emerald-500" : "bg-gray-300"}`}>
                                    <span className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow transform transition-transform ${p.in_stock ? "translate-x-3" : "translate-x-0"}`} />
                                  </button>
                                </div>
                                {!p.in_stock && <p className="text-[10px] text-red-500 font-medium mt-0.5">Out of stock</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ════════ ORDERS ════════ */}
              <TabsContent value="orders" className="space-y-3 mt-0">
                {/* Status pills */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {(["all", "pending", "confirmed", "completed", "declined"] as const).map(f => {
                    const count = f === "all" ? orders.length : orders.filter(o => o.status === f).length;
                    return (
                      <Button key={f} variant={orderFilter === f ? "default" : "outline"} size="sm"
                        className="rounded-full capitalize shrink-0 h-8 text-xs px-3"
                        onClick={() => setOrderFilter(f)}>
                        {f === "all" ? "All" : f}
                        <span className={`ml-1 px-1 py-0.5 rounded-full text-[10px] font-bold leading-none ${orderFilter === f ? "bg-white/20" : "bg-muted"}`}>{count}</span>
                      </Button>
                    );
                  })}
                </div>

                {/* Search + date */}
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search name, phone, order ID…" className="pl-9 rounded-full h-10"
                      value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {(["today", "week", "month", "all"] as const).map(r => (
                      <Button key={r} size="sm" variant={dateRange === r ? "default" : "outline"}
                        className="rounded-full shrink-0 h-8 text-xs px-3"
                        onClick={() => setDateRange(r)}>
                        {r === "today" ? "Today" : r === "week" ? "Week" : r === "month" ? "Month" : "All"}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* ── MOBILE: Card list ── */}
                <div className="md:hidden space-y-2">
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-12 text-sm text-muted-foreground">
                      {orderSearch ? "No orders match your search." : "No orders here."}
                    </div>
                  ) : filteredOrders.map(order => (
                    <div key={order.id} className="bg-card rounded-2xl border p-4 space-y-3 active:bg-muted/40"
                      onClick={() => setDetailOrder(order)} data-testid={`order-row-${order.id}`}>
                      {/* Row 1: buyer + status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{order.buyer_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{order.buyer_phone}</p>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                      {/* Row 2: product + price */}
                      <div className="flex items-center gap-2 text-sm">
                        <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1 text-muted-foreground text-xs">{order.products?.name ?? "—"}</span>
                        {order.size && <span className="bg-muted px-2 py-0.5 rounded-full text-xs font-medium shrink-0">{order.size}</span>}
                        {order.quantity && order.quantity > 1 && <span className="text-xs text-muted-foreground shrink-0">×{order.quantity}</span>}
                        <span className="font-bold text-primary shrink-0">₹{order.amount}</span>
                      </div>
                      {/* Row 3: date + actions */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          {order.order_id && <span className="font-mono ml-1.5 opacity-60">#{order.order_id}</span>}
                        </span>
                        <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                          {order.status === "pending" ? (
                            <>
                              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 rounded-full h-8 text-xs px-3"
                                onClick={() => setConfirmDialog({ order })} data-testid={`btn-confirm-${order.id}`}>
                                Confirm
                              </Button>
                              <Button size="sm" variant="destructive" className="rounded-full h-8 text-xs px-3"
                                onClick={() => setDeclineDialog({ order })} data-testid={`btn-decline-${order.id}`}>
                                Decline
                              </Button>
                            </>
                          ) : order.status === "confirmed" ? (
                            <>
                              <Button size="sm" className="bg-blue-500 hover:bg-blue-600 rounded-full h-8 text-xs px-3 text-white"
                                onClick={() => setCompleteDialog({ order })}>
                                Complete
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 text-xs text-primary px-2" onClick={() => setDetailOrder(order)}>
                                <ChevronRight className="w-3 h-3" />
                              </Button>
                            </>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-8 text-xs text-primary px-2" onClick={() => setDetailOrder(order)}>
                              Details <ChevronRight className="w-3 h-3 ml-0.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── DESKTOP: Table ── */}
                <div className="hidden md:block">
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
                                {orderSearch ? "No orders match your search." : "No orders yet."}
                              </TableCell>
                            </TableRow>
                          ) : filteredOrders.map(order => (
                            <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                              <TableCell className="font-mono text-xs text-muted-foreground">{order.order_id ? `#${order.order_id}` : "—"}</TableCell>
                              <TableCell className="whitespace-nowrap text-sm">{new Date(order.created_at).toLocaleDateString("en-IN")}</TableCell>
                              <TableCell className="text-sm font-medium whitespace-nowrap">{order.buyer_name}</TableCell>
                              <TableCell className="font-mono text-xs whitespace-nowrap">{order.buyer_phone}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap max-w-[140px] truncate">{order.products?.name ?? "—"}</TableCell>
                              <TableCell>{order.size ? <span className="px-2 py-0.5 bg-muted rounded-full text-xs font-medium">{order.size}</span> : "—"}</TableCell>
                              <TableCell className="text-center text-sm">{order.quantity ?? 1}</TableCell>
                              <TableCell className="font-semibold text-primary whitespace-nowrap">₹{order.amount}</TableCell>
                              <TableCell>
                                {order.payment_screenshot_url ? (
                                  <a href={order.payment_screenshot_url} target="_blank" rel="noreferrer">
                                    <img src={order.payment_screenshot_url} alt="proof" className="w-10 h-10 rounded-lg object-cover border hover:opacity-80" />
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
                                      <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 rounded-full text-xs h-7"
                                        onClick={() => setConfirmDialog({ order })} data-testid={`btn-confirm-${order.id}`}>Confirm</Button>
                                      <Button size="sm" variant="destructive" className="rounded-full text-xs h-7"
                                        onClick={() => setDeclineDialog({ order })} data-testid={`btn-decline-${order.id}`}>Decline</Button>
                                    </>
                                  )}
                                  {order.status === "confirmed" && (
                                    <Button size="sm" className="bg-blue-500 hover:bg-blue-600 rounded-full text-xs h-7 text-white"
                                      onClick={() => setCompleteDialog({ order })}>Complete</Button>
                                  )}
                                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => setDetailOrder(order)}>
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
                </div>
              </TabsContent>

              {/* ════════ REVIEWS ════════ */}
              <TabsContent value="reviews" className="mt-0">
                <Card>
                  <CardHeader className="px-4 pt-4 pb-2">
                    <CardTitle className="text-base">Reviews ({reviews.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {reviews.length === 0 ? (
                      <p className="text-center py-10 text-sm text-muted-foreground">No reviews yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {reviews.map(r => (
                          <div key={r.id} className="border-b last:border-0 pb-4 last:pb-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
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

              {/* ════════ SETTINGS ════════ */}
              <TabsContent value="settings" className="mt-0">
                <Card>
                  <CardHeader className="px-4 pt-4 pb-2">
                    <CardTitle className="text-base">Shop Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 px-4 pb-4">
                    {/* Shop Appearance */}
                    <div className="space-y-4 pb-2 border-b">
                      <p className="text-sm font-semibold text-foreground">Shop Appearance</p>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Shop Logo / Avatar</label>
                        {settingsLogoPreview && (
                          <img src={settingsLogoPreview} alt="Logo" className="w-16 h-16 rounded-full object-cover border mb-2" />
                        )}
                        <ImageUpload
                          onUpload={file => {
                            setSettingsLogoFile(file);
                            setSettingsLogoPreview(file ? URL.createObjectURL(file) : (shop.logo_url ?? null));
                          }}
                          label="Upload logo photo"
                        />
                      </div>
                    </div>
                    {/* Store Identity */}
                    <div className="space-y-4 pb-2 border-b">
                      <p className="text-sm font-semibold text-foreground">Store Identity</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Shop Name</label>
                          <Input value={settingsForm.shop_name} onChange={e => setSettingsForm(p => ({ ...p, shop_name: e.target.value }))} placeholder="e.g. Priya's Boutique" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Category</label>
                          <select
                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                            value={settingsForm.category}
                            onChange={e => setSettingsForm(p => ({ ...p, category: e.target.value }))}
                          >
                            <option value="">Select category</option>
                            <option value="Fashion & Clothing">Fashion & Clothing</option>
                            <option value="Jewellery & Accessories">Jewellery & Accessories</option>
                            <option value="Beauty & Skincare">Beauty & Skincare</option>
                            <option value="Home Decor">Home Decor</option>
                            <option value="Food & Snacks">Food & Snacks</option>
                            <option value="Art & Handicrafts">Art & Handicrafts</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Kids & Toys">Kids & Toys</option>
                            <option value="Books & Stationery">Books & Stationery</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Instagram Handle</label>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm select-none">@</span>
                            <Input className="rounded-l-none" value={settingsForm.insta_handle} onChange={e => setSettingsForm(p => ({ ...p, insta_handle: e.target.value.replace(/^@/, "") }))} placeholder="yourstorename" />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Contact & Payments */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1.5">WhatsApp Number</label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm select-none">+91</span>
                          <Input className="rounded-l-none" inputMode="numeric" maxLength={10}
                            value={settingsForm.whatsapp.replace(/^\+?91/, "")}
                            onChange={e => setSettingsForm(p => ({ ...p, whatsapp: `+91${e.target.value.replace(/\D/g, "").slice(0, 10)}` }))}
                            placeholder="9876543210" data-testid="settings-whatsapp" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">UPI ID</label>
                        <div className="flex items-center gap-2">
                          <Input value={settingsForm.upi_id} onChange={e => setSettingsForm(p => ({ ...p, upi_id: e.target.value }))}
                            placeholder="yourname@paytm" data-testid="settings-upi" />
                          {validateUPIId(settingsForm.upi_id) && (
                            <span className="text-emerald-500 text-xs font-semibold whitespace-nowrap">✓ Valid</span>
                          )}
                        </div>
                        <MiniQRPreview upiId={settingsForm.upi_id} shopName={shop?.shop_name ?? "Your Shop"} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Bio</label>
                      <Textarea value={settingsForm.bio} onChange={e => setSettingsForm(p => ({ ...p, bio: e.target.value }))}
                        placeholder="Tell customers about your store…" rows={3} data-testid="settings-bio" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Delivery Info</label>
                      <Input value={settingsForm.delivery_info} onChange={e => setSettingsForm(p => ({ ...p, delivery_info: e.target.value }))}
                        placeholder="Delivery in 5–7 days across India" data-testid="settings-delivery" />
                    </div>
                    <Button onClick={saveSettings} disabled={isSavingSettings} className="rounded-full w-full md:w-auto px-8" data-testid="btn-save-settings">
                      {isSavingSettings ? "Saving…" : "Save Settings"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ════════ BILLING ════════ */}
              <TabsContent value="billing" className="space-y-4 mt-0">
                {/* Current Plan */}
                <Card>
                  <CardHeader className="px-4 pt-4 pb-2">
                    <CardTitle className="text-base">Your Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-5">
                    {/* Badge + countdown row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        {planType === "trial" && !isTrialExpired && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-300 font-bold text-sm">Free Trial</span>
                        )}
                        {isTrialExpired && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-300 font-bold text-sm">Expired</span>
                        )}
                        {planType === "pro" && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold text-sm">Pro</span>
                        )}
                        {planType === "expired" && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-300 font-bold text-sm">Expired</span>
                        )}
                        <p className="text-sm text-muted-foreground max-w-xs">
                          {planType === "trial" && !isTrialExpired && shop.trial_ends_at &&
                            `Your free trial ends on ${new Date(shop.trial_ends_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                          {isTrialExpired && shop.trial_ends_at &&
                            `Your trial expired on ${new Date(shop.trial_ends_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}. Renew to keep your store active.`}
                          {planType === "pro" && shop.plan_expires_at &&
                            `Your Pro plan is active until ${new Date(shop.plan_expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                          {planType === "expired" && shop.plan_expires_at &&
                            `Your plan expired on ${new Date(shop.plan_expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}. Renew to keep your store active.`}
                        </p>
                      </div>
                      {/* Countdown */}
                      {planType === "trial" && trialDaysLeft !== null && trialDaysLeft > 0 && (
                        <div className="text-right shrink-0">
                          <p className={`font-extrabold leading-none ${trialDaysLeft <= 7 ? "text-red-500" : "text-amber-500"}`} style={{ fontSize: 48 }}>
                            {trialDaysLeft}
                          </p>
                          <p className={`text-xs mt-1 flex items-center justify-end gap-1 ${trialDaysLeft <= 7 ? "text-red-500" : "text-muted-foreground"}`}>
                            {trialDaysLeft <= 7 && <AlertTriangle className="w-3 h-3" />}
                            days remaining
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Features checklist */}
                    <div className="space-y-2 pt-1">
                      {[
                        "Your own store page",
                        "Unlimited products",
                        "UPI QR payment",
                        "Verified buyer reviews",
                        "Custom subdomain (shopname.shopgram.in)",
                      ].map(feature => (
                        <div key={feature} className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Upgrade / Pro card */}
                {planType === "pro" && !isTrialExpired ? (
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center">
                    <p className="text-xl font-bold text-emerald-700 mb-1">Thank you for being a Pro member 🎉</p>
                    <p className="text-sm text-emerald-600">Your store is fully active and supported.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl p-5 text-white space-y-4" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}>
                    <div>
                      <p className="text-lg font-bold">Continue after trial for just ₹99/month</p>
                      <p className="text-sm text-violet-200 mt-0.5">Keep your store always-on with a Pro subscription.</p>
                    </div>
                    <ul className="space-y-2">
                      {["Always-on store", "Priority support", "Analytics coming soon"].map(b => (
                        <li key={b} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-violet-300 shrink-0" />
                          <span className="text-sm text-violet-100">{b}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full bg-white text-violet-700 hover:bg-violet-50 font-bold rounded-full h-12 text-base"
                      onClick={() => setUpgradeModalOpen(true)}>
                      Upgrade to Pro — ₹99/month
                    </Button>
                  </div>
                )}

                {/* Payment History */}
                <Card>
                  <CardHeader className="px-4 pt-4 pb-2">
                    <CardTitle className="text-base">Payment History</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-6">
                    <p className="text-sm text-center py-6 text-muted-foreground">No payment history yet.</p>
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </div>
        </main>
      </div>

      {/* ══ MOBILE: Fixed bottom nav ══ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex">
          {tabDefs.map(tab => {
            const isActive = activeTab === tab.value;
            return (
              <button key={tab.value} onClick={() => setActiveTab(tab.value)}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {isActive && <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />}
                <div className="relative">
                  <tab.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
                  {tab.badge != null && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {tab.badge > 9 ? "9+" : tab.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] leading-none font-medium ${isActive ? "font-semibold" : ""}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ══ UPGRADE DIALOG ══ */}
      <Dialog open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen}>
        <DialogContent className="sm:max-w-sm mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Upgrade to Pro ✨</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">To upgrade your plan, contact us via:</p>
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold flex items-center gap-2">💬 WhatsApp</p>
                <p className="text-xs text-muted-foreground mt-0.5">Send a WhatsApp message to complete your upgrade instantly.</p>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-semibold flex items-center gap-2">📧 Email</p>
                <p className="text-sm font-mono font-medium text-primary mt-0.5">contact.shoprgam@gmail.com</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center bg-violet-50 border border-violet-100 rounded-lg p-2.5">
              Once payment is received, your Pro plan will be activated within 24 hours.
            </p>
          </div>
          <DialogFooter>
            <Button className="w-full rounded-full" onClick={() => setUpgradeModalOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ COMPLETE DIALOG ══ */}
      <Dialog open={!!completeDialog} onOpenChange={open => !open && setCompleteDialog(null)}>
        <DialogContent className="sm:max-w-md mx-4 rounded-2xl">
          <DialogHeader><DialogTitle>Mark as Completed</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Mark order from <span className="font-semibold text-foreground">{completeDialog?.order.buyer_name}</span> for <span className="font-semibold text-primary">₹{completeDialog?.order.amount}</span> as completed? This means the item has been shipped/delivered.
          </p>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" className="rounded-full" onClick={() => setCompleteDialog(null)}>Cancel</Button>
            <Button className="rounded-full bg-blue-500 hover:bg-blue-600 text-white" onClick={handleCompleteOrder} disabled={isCompleting}>
              {isCompleting ? "Updating…" : "Yes, Mark Completed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ CONFIRM DIALOG ══ */}
      <Dialog open={!!confirmDialog} onOpenChange={open => !open && setConfirmDialog(null)}>
        <DialogContent className="sm:max-w-md mx-4 rounded-2xl">
          <DialogHeader><DialogTitle>Confirm Order</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Confirm order from <span className="font-semibold text-foreground">{confirmDialog?.order.buyer_name}</span> for <span className="font-semibold text-primary">₹{confirmDialog?.order.amount}</span>?
          </p>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" className="rounded-full" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button className="rounded-full bg-emerald-500 hover:bg-emerald-600" onClick={handleConfirmOrder} disabled={isConfirming}>
              {isConfirming ? "Confirming…" : "Yes, Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ DECLINE DIALOG ══ */}
      <Dialog open={!!declineDialog} onOpenChange={open => { if (!open) { setDeclineDialog(null); setDeclineReason(""); } }}>
        <DialogContent className="sm:max-w-md mx-4 rounded-2xl">
          <DialogHeader><DialogTitle>Decline Order</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Declining order from <span className="font-semibold text-foreground">{declineDialog?.order.buyer_name}</span> for <span className="font-semibold">₹{declineDialog?.order.amount}</span>.
            </p>
            <div>
              <label className="block text-sm font-medium mb-1.5">Reason <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Textarea placeholder="e.g. Out of stock, payment not received…" rows={3} value={declineReason}
                onChange={e => setDeclineReason(e.target.value)} className="resize-none" />
            </div>
          </div>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" className="rounded-full" onClick={() => { setDeclineDialog(null); setDeclineReason(""); }}>Cancel</Button>
            <Button variant="destructive" className="rounded-full" onClick={handleDeclineOrder} disabled={isDeclining}>
              {isDeclining ? "Declining…" : "Decline Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ ORDER DETAIL PANEL ══ */}
      <Sheet open={!!detailOrder} onOpenChange={open => !open && setDetailOrder(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
          {detailOrder && (
            <>
              <SheetHeader className="p-4 border-b sticky top-0 bg-card z-10">
                <SheetTitle className="flex items-center gap-2 text-base">
                  Order Details
                  {detailOrder.order_id && <span className="text-sm font-mono text-muted-foreground">#{detailOrder.order_id}</span>}
                </SheetTitle>
              </SheetHeader>

              <div className="p-4 space-y-5">
                {/* Status + date */}
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
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Buyer</h4>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary font-bold">{detailOrder.buyer_name?.[0]?.toUpperCase()}</span>
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
                        <span className="text-muted-foreground text-xs">{[detailOrder.full_address, detailOrder.city, detailOrder.pincode, detailOrder.state_name].filter(Boolean).join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t" />

                {/* Order */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order</h4>
                  <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium">{detailOrder.products?.name ?? "Product"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
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
                      <div className="flex items-start gap-2 text-sm">
                        <StickyNote className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-muted-foreground text-xs">{detailOrder.special_instructions}</span>
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
                      <img src={detailOrder.payment_screenshot_url} alt="proof" className="w-full rounded-xl border object-cover max-h-56 hover:opacity-90" />
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

                {detailOrder.status === "pending" && (
                  <>
                    <div className="border-t" />
                    <div className="flex gap-3">
                      <Button className="flex-1 rounded-full bg-emerald-500 hover:bg-emerald-600"
                        onClick={() => { setDetailOrder(null); setConfirmDialog({ order: detailOrder }); }}>
                        Confirm
                      </Button>
                      <Button variant="destructive" className="flex-1 rounded-full"
                        onClick={() => { setDetailOrder(null); setDeclineDialog({ order: detailOrder }); }}>
                        Decline
                      </Button>
                    </div>
                  </>
                )}
                {detailOrder.status === "confirmed" && (
                  <>
                    <div className="border-t" />
                    <Button className="w-full rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                      onClick={() => { setDetailOrder(null); setCompleteDialog({ order: detailOrder }); }}>
                      Mark as Completed
                    </Button>
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
