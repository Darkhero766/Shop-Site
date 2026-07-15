import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { supabase, Shop } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import {
  ShieldAlert, CheckCircle, XCircle, Edit2, Calendar, PauseCircle,
  TrendingUp, IndianRupee, Users, AlertTriangle, Clock, RefreshCw,
  Globe, Eye, Home, Compass, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getDaysLeft(shop: Shop): number | null {
  if (shop.plan === "pro" && shop.plan_expires_at)
    return Math.ceil((new Date(shop.plan_expires_at).getTime() - Date.now()) / 86400000);
  if (shop.plan === "trial" && shop.trial_ends_at)
    return Math.ceil((new Date(shop.trial_ends_at).getTime() - Date.now()) / 86400000);
  return null;
}

function isExpired(shop: Shop): boolean {
  if (shop.plan === "expired") return true;
  if (shop.plan === "trial" && shop.trial_ends_at && new Date(shop.trial_ends_at) < new Date()) return true;
  if (shop.plan === "pro" && shop.plan_expires_at && new Date(shop.plan_expires_at) < new Date()) return true;
  return false;
}

function PlanBadge({ shop }: { shop: Shop }) {
  if (isExpired(shop)) return <Badge variant="destructive" className="rounded-full text-xs">Expired</Badge>;
  if (shop.plan === "pro") return <Badge className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-xs">Pro</Badge>;
  return <Badge className="rounded-full bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-100 text-xs">Trial</Badge>;
}

function StatusBadge({ status }: { status: Shop["status"] }) {
  const map: Record<Shop["status"], string> = {
    active:    "bg-emerald-100 text-emerald-700 border border-emerald-200",
    pending:   "bg-amber-100 text-amber-700 border border-amber-200",
    paused:    "bg-blue-100 text-blue-700 border border-blue-200",
    suspended: "bg-red-100 text-red-700 border border-red-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${map[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === "active" ? "bg-emerald-500" :
        status === "pending" ? "bg-amber-500" :
        status === "paused" ? "bg-blue-500" : "bg-red-500"
      }`} />
      {status}
    </span>
  );
}

type PageVisitStats = { total: number; today: number };

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { session, loading: authLoading } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [planFilter, setPlanFilter] = useState<"all" | "trial" | "pro" | "expired">("all");
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [tableSearch, setTableSearch] = useState("");

  // Page visit stats
  const [homeStats, setHomeStats] = useState<PageVisitStats>({ total: 0, today: 0 });
  const [exploreStats, setExploreStats] = useState<PageVisitStats>({ total: 0, today: 0 });
  const [liveHomeCount, setLiveHomeCount] = useState(0);
  const [liveExploreCount, setLiveExploreCount] = useState(0);

  // Edit Plan modal
  const [editPlanModal, setEditPlanModal] = useState<{ shop: Shop } | null>(null);
  const [editPlanForm, setEditPlanForm] = useState({ plan: "trial", expiry: "", amount: "" });
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!session) { toast.error("Please log in first"); setLocation("/login"); return; }
    const user = session.user;
    if (user.app_metadata?.role !== "admin") { toast.error("Access denied."); setLocation("/"); return; }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    async function loadAll() {
      const [
        { data, error },
        { count: orderCount },
        { count: productCount },
        homeTotal,
        homeToday,
        exploreTotal,
        exploreToday,
      ] = await Promise.all([
        supabase.from("shops").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("page_visits").select("id", { count: "exact", head: true }).eq("page", "home"),
        supabase.from("page_visits").select("id", { count: "exact", head: true }).eq("page", "home").gte("visited_at", todayStart.toISOString()),
        supabase.from("page_visits").select("id", { count: "exact", head: true }).eq("page", "explore"),
        supabase.from("page_visits").select("id", { count: "exact", head: true }).eq("page", "explore").gte("visited_at", todayStart.toISOString()),
      ]);

      if (!error && data) setShops(data as Shop[]);
      setTotalOrders(orderCount ?? 0);
      setTotalProducts(productCount ?? 0);
      setHomeStats({ total: homeTotal.count ?? 0, today: homeToday.count ?? 0 });
      setExploreStats({ total: exploreTotal.count ?? 0, today: exploreToday.count ?? 0 });
      setIsLoading(false);
    }
    loadAll();

    // Realtime: live visitor count (last 5 min window)
    const channel = supabase
      .channel("admin-page-visits")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "page_visits", filter: "page=eq.home" }, () => {
        setHomeStats(prev => ({ ...prev, total: prev.total + 1, today: prev.today + 1 }));
        setLiveHomeCount(n => n + 1);
        setTimeout(() => setLiveHomeCount(n => Math.max(0, n - 1)), 5 * 60 * 1000);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "page_visits", filter: "page=eq.explore" }, () => {
        setExploreStats(prev => ({ ...prev, total: prev.total + 1, today: prev.today + 1 }));
        setLiveExploreCount(n => n + 1);
        setTimeout(() => setLiveExploreCount(n => Math.max(0, n - 1)), 5 * 60 * 1000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authLoading, session, setLocation]);

  const updateStatus = async (id: string, status: "active" | "suspended" | "paused") => {
    const { error } = await supabase.from("shops").update({ status }).eq("id", id);
    if (error) { toast.error(`Update failed: ${error.message}`); return; }
    const { data: refetched, error: fetchErr } = await supabase.from("shops").select("status").eq("id", id).single();
    if (fetchErr || !refetched) { toast.error("Could not verify update. Please refresh."); return; }
    if (refetched.status !== status) {
      toast.error("Update blocked by Supabase RLS. Add an UPDATE policy for your admin user.", { duration: 8000 });
      return;
    }
    setShops(shops.map(s => s.id === id ? { ...s, status } : s));
    toast.success(`Shop marked as ${status}`);
  };

  const openEditPlan = (shop: Shop) => {
    const expiryDate = shop.plan === "pro" ? shop.plan_expires_at : shop.trial_ends_at;
    setEditPlanForm({
      plan: shop.plan,
      expiry: expiryDate ? new Date(expiryDate).toISOString().split("T")[0] : "",
      amount: String(shop.plan_amount ?? 0),
    });
    setEditPlanModal({ shop });
  };

  const savePlan = async () => {
    if (!editPlanModal) return;
    setIsSavingPlan(true);
    const payload: Record<string, any> = {
      plan: editPlanForm.plan,
      plan_amount: Number(editPlanForm.amount) || 0,
    };
    const expiryISO = editPlanForm.expiry ? new Date(editPlanForm.expiry).toISOString() : null;
    if (editPlanForm.plan === "pro") { payload.plan_expires_at = expiryISO; payload.plan_started_at = new Date().toISOString(); }
    else if (editPlanForm.plan === "trial") { payload.trial_ends_at = expiryISO; }
    else { payload.plan_expires_at = expiryISO; }
    const { error } = await supabase.from("shops").update(payload).eq("id", editPlanModal.shop.id);
    setIsSavingPlan(false);
    if (!error) {
      setShops(prev => prev.map(s => s.id === editPlanModal.shop.id ? { ...s, ...payload } as Shop : s));
      toast.success("Plan updated ✓");
      setEditPlanModal(null);
    } else {
      toast.error(error.message || "Failed to update plan");
    }
  };

  const displayedShops = useMemo(() => {
    let list = shops;
    if (planFilter === "expired") list = list.filter(s => isExpired(s));
    else if (planFilter === "pro") list = list.filter(s => s.plan === "pro" && !isExpired(s));
    else if (planFilter === "trial") list = list.filter(s => s.plan === "trial" && !isExpired(s));
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter(s =>
        s.shop_name?.toLowerCase().includes(q) ||
        s.subdomain?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.insta_handle?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [shops, planFilter, tableSearch]);

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center gap-3 text-muted-foreground">
      <RefreshCw className="w-5 h-5 animate-spin" /> Loading admin panel…
    </div>
  );

  const pending   = shops.filter(s => s.status === "pending");
  const active    = shops.filter(s => s.status === "active");
  const paused    = shops.filter(s => s.status === "paused");
  const suspended = shops.filter(s => s.status === "suspended");

  const totalRevenue   = shops.reduce((sum, s) => sum + (s.plan_amount ?? 0), 0);
  const proShopsActive = shops.filter(s => s.plan === "pro" && !isExpired(s));
  const mrr            = proShopsActive.reduce((sum, s) => sum + (s.plan_amount ?? 99), 0);
  const expiredShops   = shops.filter(s => isExpired(s));
  const expiringSoon   = shops.filter(s => { const d = getDaysLeft(s); return d !== null && d > 0 && d <= 7 && !isExpired(s); });
  const conversionRate = shops.length > 0 ? Math.round((proShopsActive.length / shops.length) * 100) : 0;
  const joinedThisMonth = shops.filter(s => {
    if (!s.created_at) return false;
    const d = new Date(s.created_at); const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const ShopTable = ({ data }: { data: Shop[] }) => (
    <div className="overflow-x-auto">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            <TableHead>Shop Name</TableHead>
            <TableHead>Subdomain</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Trial / Expiry</TableHead>
            <TableHead>Days Left</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No shops found.</TableCell></TableRow>
          ) : data.map(shop => {
            const daysLeft = getDaysLeft(shop);
            const expired = isExpired(shop);
            return (
              <TableRow key={shop.id}>
                <TableCell className="font-medium whitespace-nowrap">{shop.shop_name}</TableCell>
                <TableCell className="text-sm whitespace-nowrap text-primary">{shop.subdomain}.shopgram.in</TableCell>
                <TableCell>
                  <div className="text-sm">{shop.email}</div>
                  <div className="text-xs text-muted-foreground">{shop.whatsapp}</div>
                </TableCell>
                <TableCell><StatusBadge status={shop.status} /></TableCell>
                <TableCell><PlanBadge shop={shop} /></TableCell>
                <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                  {shop.plan === "pro" ? formatDate(shop.plan_expires_at) : formatDate(shop.trial_ends_at)}
                </TableCell>
                <TableCell>
                  {daysLeft !== null ? (
                    <span className={`font-bold text-sm ${expired || daysLeft <= 0 ? "text-red-500" : daysLeft <= 7 ? "text-amber-500" : "text-muted-foreground"}`}>
                      {daysLeft <= 0 ? `${Math.abs(daysLeft)}d ago` : `${daysLeft}d`}
                    </span>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1.5 flex-wrap">
                    {shop.status !== "active" && (
                      <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 rounded-full h-7 px-2.5 text-xs" onClick={() => updateStatus(shop.id, "active")}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />{shop.status === "paused" ? "Resume" : "Approve"}
                      </Button>
                    )}
                    {shop.status === "active" && (
                      <Button size="sm" variant="outline" className="rounded-full h-7 px-2.5 text-xs border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => updateStatus(shop.id, "paused")}>
                        <PauseCircle className="w-3.5 h-3.5 mr-1" />Pause
                      </Button>
                    )}
                    {shop.status !== "suspended" && (
                      <Button size="sm" variant="destructive" className="rounded-full h-7 px-2.5 text-xs" onClick={() => updateStatus(shop.id, "suspended")}>
                        <XCircle className="w-3.5 h-3.5 mr-1" />Suspend
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="rounded-full h-7 px-2.5 text-xs" onClick={() => openEditPlan(shop)}>
                      <Edit2 className="w-3.5 h-3.5 mr-1" />Edit Plan
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="bg-card border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <ShieldAlert className="w-6 h-6" /> Super Admin
        </div>
        <Button variant="outline" size="sm" onClick={() => setLocation("/dashboard")}>Exit Admin</Button>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

        {/* ── Revenue Hero ── */}
        <div className="rounded-2xl p-5 md:p-7 text-white space-y-5" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-violet-200 text-sm font-medium uppercase tracking-wide">Total Revenue Collected</p>
              <p className="text-4xl md:text-5xl font-extrabold mt-1">₹{totalRevenue.toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 text-center min-w-[100px]">
              <p className="text-violet-200 text-xs font-medium">MRR</p>
              <p className="text-2xl font-bold mt-0.5">₹{mrr.toLocaleString("en-IN")}</p>
              <p className="text-violet-300 text-[10px] mt-0.5">monthly recurring</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-violet-200 text-xs">Pro Shops</p>
              <p className="text-xl font-bold mt-0.5">{proShopsActive.length}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-violet-200 text-xs">Conversion Rate</p>
              <p className="text-xl font-bold mt-0.5">{conversionRate}%</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-violet-200 text-xs">New This Month</p>
              <p className="text-xl font-bold mt-0.5">{joinedThisMonth.length}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-violet-200 text-xs">Avg per Pro Shop</p>
              <p className="text-xl font-bold mt-0.5">₹{proShopsActive.length > 0 ? Math.round(mrr / proShopsActive.length) : 0}</p>
            </div>
          </div>
        </div>

        {/* ── Platform Live Traffic Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Homepage traffic */}
          <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
            {/* gradient accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Home className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">shopgram.in</p>
                    <p className="text-xs text-muted-foreground">Landing page</p>
                  </div>
                </div>
                {/* live pulse */}
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-semibold">Live</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/40 rounded-xl p-3 text-center">
                  <p className="text-2xl font-extrabold text-violet-600">{homeStats.total.toLocaleString("en-IN")}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">All time</p>
                </div>
                <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-extrabold text-violet-700">+{homeStats.today}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Today</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-extrabold text-emerald-600">{liveHomeCount}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Last 5 min</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="w-3 h-3 text-violet-400" />
                <span>Updates instantly via Supabase Realtime</span>
              </div>
            </div>
          </div>

          {/* Explore page traffic */}
          <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                    <Compass className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">shopgram.in/explore</p>
                    <p className="text-xs text-muted-foreground">Discovery page</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-semibold">Live</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/40 rounded-xl p-3 text-center">
                  <p className="text-2xl font-extrabold text-sky-600">{exploreStats.total.toLocaleString("en-IN")}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">All time</p>
                </div>
                <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-extrabold text-sky-700">+{exploreStats.today}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Today</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-extrabold text-emerald-600">{liveExploreCount}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Last 5 min</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="w-3 h-3 text-sky-400" />
                <span>Updates instantly via Supabase Realtime</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Store Status Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"><Users className="w-4 h-4 text-muted-foreground" /></div>
              <p className="text-sm text-muted-foreground font-medium">Total Stores</p>
            </div>
            <p className="text-3xl font-bold">{shops.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{totalProducts} products · {totalOrders} orders</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 shadow-sm text-emerald-900">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-emerald-600" /></div>
              <p className="text-sm font-medium opacity-80">Active</p>
            </div>
            <p className="text-3xl font-bold">{active.length}</p>
            <p className="text-xs opacity-70 mt-1">{paused.length} paused</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 shadow-sm text-amber-900">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center"><Clock className="w-4 h-4 text-amber-600" /></div>
              <p className="text-sm font-medium opacity-80">Pending</p>
            </div>
            <p className="text-3xl font-bold">{pending.length}</p>
            <p className="text-xs opacity-70 mt-1">awaiting approval</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 shadow-sm text-red-900">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-red-500" /></div>
              <p className="text-sm font-medium opacity-80">Expired / Suspended</p>
            </div>
            <p className="text-3xl font-bold">{expiredShops.length + suspended.length}</p>
            <p className="text-xs opacity-70 mt-1">{expiringSoon.length} expiring in 7d</p>
          </div>
        </div>

        {/* ── Alerts + Pro Revenue ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-sm">Needs Attention</h3>
            </div>
            {expiringSoon.length === 0 && pending.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">All clear ✓</p>
            ) : (
              <div className="space-y-2">
                {pending.map(s => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-amber-900">{s.shop_name}</p>
                      <p className="text-xs text-amber-700">Pending approval</p>
                    </div>
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 rounded-full h-7 px-2.5 text-xs" onClick={() => updateStatus(s.id, "active")}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Approve
                    </Button>
                  </div>
                ))}
                {expiringSoon.map(s => {
                  const d = getDaysLeft(s);
                  return (
                    <div key={s.id} className="flex items-center justify-between rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-red-900">{s.shop_name}</p>
                        <p className="text-xs text-red-700">{d}d left · {s.plan === "pro" ? "Pro" : "Trial"}</p>
                      </div>
                      <Button size="sm" variant="outline" className="rounded-full h-7 px-2.5 text-xs border-red-200 text-red-700" onClick={() => openEditPlan(s)}>
                        <Edit2 className="w-3 h-3 mr-1" /> Renew
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-violet-500" />
              <h3 className="font-semibold text-sm">Pro Revenue Breakdown</h3>
            </div>
            {proShopsActive.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">No Pro shops yet</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {proShopsActive.map(s => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{s.shop_name}</p>
                      <p className="text-xs text-muted-foreground">expires {formatDate(s.plan_expires_at)}</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">₹{(s.plan_amount ?? 0).toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>
            )}
            {proShopsActive.length > 0 && (
              <div className="border-t pt-2 flex justify-between">
                <p className="text-xs text-muted-foreground">Total from {proShopsActive.length} active Pro shops</p>
                <p className="text-sm font-bold">₹{mrr.toLocaleString("en-IN")}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Shops Table ── */}
        <div className="bg-card border rounded-2xl p-4 md:p-6 shadow-sm">
          <Tabs defaultValue="pending" className="w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-bold">Manage Stores</h2>
              <Input
                placeholder="Search by name, subdomain, email…"
                value={tableSearch}
                onChange={e => setTableSearch(e.target.value)}
                className="max-w-xs h-9 text-sm"
              />
            </div>

            {/* Status tabs */}
            <div className="overflow-x-auto pb-1 mb-3">
              <TabsList className="gap-1 h-auto p-1 flex w-max">
                <TabsTrigger value="pending" className="rounded-lg text-xs px-3 h-8 gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Pending
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pending.length}</span>
                </TabsTrigger>
                <TabsTrigger value="active" className="rounded-lg text-xs px-3 h-8 gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Active
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{active.length}</span>
                </TabsTrigger>
                <TabsTrigger value="paused" className="rounded-lg text-xs px-3 h-8 gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Paused
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{paused.length}</span>
                </TabsTrigger>
                <TabsTrigger value="suspended" className="rounded-lg text-xs px-3 h-8 gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Suspended
                  <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{suspended.length}</span>
                </TabsTrigger>
                <TabsTrigger value="all" className="rounded-lg text-xs px-3 h-8">
                  All
                  <span className="ml-1.5 text-[10px] font-bold text-muted-foreground">{displayedShops.length}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Plan filter chips */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {(["all", "trial", "pro", "expired"] as const).map(f => (
                <Button key={f} size="sm" variant={planFilter === f ? "default" : "outline"}
                  className="rounded-full capitalize shrink-0 h-7 text-xs px-3"
                  onClick={() => setPlanFilter(f)}>
                  {f === "all" ? "All Plans" : f === "trial" ? "Trial" : f === "pro" ? "Pro" : "Expired"}
                  <span className={`ml-1.5 text-[10px] font-bold ${planFilter === f ? "opacity-80" : "text-muted-foreground"}`}>
                    {f === "all" ? shops.length : f === "expired" ? shops.filter(s => isExpired(s)).length : f === "pro" ? shops.filter(s => s.plan === "pro" && !isExpired(s)).length : shops.filter(s => s.plan === "trial" && !isExpired(s)).length}
                  </span>
                </Button>
              ))}
            </div>

            <TabsContent value="pending"   className="m-0"><ShopTable data={displayedShops.filter(s => s.status === "pending")} /></TabsContent>
            <TabsContent value="active"    className="m-0"><ShopTable data={displayedShops.filter(s => s.status === "active")} /></TabsContent>
            <TabsContent value="paused"    className="m-0"><ShopTable data={displayedShops.filter(s => s.status === "paused")} /></TabsContent>
            <TabsContent value="suspended" className="m-0"><ShopTable data={displayedShops.filter(s => s.status === "suspended")} /></TabsContent>
            <TabsContent value="all"       className="m-0"><ShopTable data={displayedShops} /></TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Edit Plan Modal */}
      <Dialog open={!!editPlanModal} onOpenChange={open => !open && setEditPlanModal(null)}>
        <DialogContent className="sm:max-w-sm mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Plan — {editPlanModal?.shop.shop_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium mb-1.5">Plan</label>
              <select value={editPlanForm.plan} onChange={e => setEditPlanForm(p => ({ ...p, plan: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="trial">Trial</option>
                <option value="pro">Pro</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {editPlanForm.plan === "trial" ? "Trial Ends On" : "Plan Expires On"}
              </label>
              <Input type="date" value={editPlanForm.expiry} onChange={e => setEditPlanForm(p => ({ ...p, expiry: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Amount Paid (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                <Input type="number" placeholder="99" className="pl-7" value={editPlanForm.amount}
                  onChange={e => setEditPlanForm(p => ({ ...p, amount: e.target.value }))} />
              </div>
            </div>
            {editPlanForm.plan === "pro" && (
              <p className="text-xs text-muted-foreground bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                Setting plan to Pro will record today as the start date and update the expiry.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setEditPlanModal(null)}>Cancel</Button>
            <Button className="rounded-full" onClick={savePlan} disabled={isSavingPlan}>
              {isSavingPlan ? "Saving…" : "Save Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
