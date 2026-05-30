import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { supabase, Shop } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { ShieldAlert, CheckCircle, XCircle, Edit2, Calendar, PauseCircle, PlayCircle } from "lucide-react";
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
  if (shop.plan === "pro" && shop.plan_expires_at) {
    return Math.ceil((new Date(shop.plan_expires_at).getTime() - Date.now()) / 86400000);
  }
  if (shop.plan === "trial" && shop.trial_ends_at) {
    return Math.ceil((new Date(shop.trial_ends_at).getTime() - Date.now()) / 86400000);
  }
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

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { session, loading: authLoading } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [planFilter, setPlanFilter] = useState<"all" | "trial" | "pro" | "expired">("all");

  // Edit Plan modal
  const [editPlanModal, setEditPlanModal] = useState<{ shop: Shop } | null>(null);
  const [editPlanForm, setEditPlanForm] = useState({ plan: "trial", expiry: "", amount: "" });
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!session) { toast.error("Please log in first"); setLocation("/login"); return; }
    const user = session.user;
    if (user.app_metadata?.role !== "admin") { toast.error("Access denied."); setLocation("/"); return; }

    async function loadShops() {
      const { data, error } = await supabase.from("shops").select("*").order("created_at", { ascending: false });
      if (!error && data) setShops(data as Shop[]);
      setIsLoading(false);
    }
    loadShops();
  }, [authLoading, session, setLocation]);

  const updateStatus = async (id: string, status: "active" | "suspended" | "paused") => {
    const { error } = await supabase.from("shops").update({ status }).eq("id", id);
    if (error) { toast.error(`Update failed: ${error.message}`); return; }
    const { data: refetched, error: fetchErr } = await supabase.from("shops").select("status").eq("id", id).single();
    if (fetchErr || !refetched) { toast.error("Could not verify update. Please refresh."); return; }
    if (refetched.status !== status) {
      toast.error("Update blocked by Supabase permissions (RLS). Add an UPDATE policy for your admin user.", { duration: 8000 });
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
    if (editPlanForm.plan === "pro") {
      payload.plan_expires_at = expiryISO;
      payload.plan_started_at = new Date().toISOString();
    } else if (editPlanForm.plan === "trial") {
      payload.trial_ends_at = expiryISO;
    } else {
      payload.plan_expires_at = expiryISO;
    }
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
    if (planFilter === "all") return shops;
    if (planFilter === "expired") return shops.filter(s => isExpired(s));
    if (planFilter === "pro") return shops.filter(s => s.plan === "pro" && !isExpired(s));
    return shops.filter(s => s.plan === "trial" && !isExpired(s));
  }, [shops, planFilter]);

  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading admin panel...</div>;

  const pending = shops.filter(s => s.status === "pending");
  const active = shops.filter(s => s.status === "active");

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
              <TableRow key={shop.id} data-testid={`admin-shop-row-${shop.id}`}>
                <TableCell className="font-medium whitespace-nowrap">{shop.shop_name}</TableCell>
                <TableCell className="text-sm whitespace-nowrap">{shop.subdomain}.shopgram.in</TableCell>
                <TableCell>
                  <div className="text-sm">{shop.email}</div>
                  <div className="text-xs text-muted-foreground">{shop.whatsapp}</div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={shop.status === "active" ? "default" : shop.status === "pending" ? "secondary" : "destructive"}
                    className={`capitalize ${shop.status === "paused" ? "bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-100" : ""}`}>
                    {shop.status}
                  </Badge>
                </TableCell>
                <TableCell><PlanBadge shop={shop} /></TableCell>
                <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                  {shop.plan === "pro" ? formatDate(shop.plan_expires_at) : formatDate(shop.trial_ends_at)}
                </TableCell>
                <TableCell>
                  {daysLeft !== null ? (
                    <span className={`font-bold text-sm ${expired || daysLeft <= 0 ? "text-red-500" : daysLeft <= 7 ? "text-red-500" : "text-muted-foreground"}`}>
                      {daysLeft <= 0 ? `${Math.abs(daysLeft)}d ago` : `${daysLeft}d`}
                    </span>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1.5 flex-wrap">
                    {shop.status !== "active" && (
                      <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 rounded-full h-7 px-2.5 text-xs" onClick={() => updateStatus(shop.id, "active")}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> {shop.status === "paused" ? "Resume" : "Approve"}
                      </Button>
                    )}
                    {shop.status === "active" && (
                      <Button size="sm" variant="outline" className="rounded-full h-7 px-2.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => updateStatus(shop.id, "paused")}>
                        <PauseCircle className="w-3.5 h-3.5 mr-1" /> Pause
                      </Button>
                    )}
                    {shop.status !== "suspended" && (
                      <Button size="sm" variant="destructive" className="rounded-full h-7 px-2.5 text-xs" onClick={() => updateStatus(shop.id, "suspended")}>
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Suspend
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="rounded-full h-7 px-2.5 text-xs" onClick={() => openEditPlan(shop)}>
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Plan
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
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-2xl p-4 text-center shadow-sm">
            <h3 className="text-muted-foreground text-sm font-medium mb-1">Total Shops</h3>
            <p className="text-3xl font-bold">{shops.length}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center shadow-sm text-emerald-900">
            <h3 className="text-sm font-medium mb-1 opacity-80">Active</h3>
            <p className="text-3xl font-bold">{active.length}</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center shadow-sm text-amber-900">
            <h3 className="text-sm font-medium mb-1 opacity-80">Pending</h3>
            <p className="text-3xl font-bold">{pending.length}</p>
          </div>
          <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 text-center shadow-sm text-violet-900">
            <h3 className="text-sm font-medium mb-1 opacity-80">Pro Shops</h3>
            <p className="text-3xl font-bold">{shops.filter(s => s.plan === "pro" && !isExpired(s)).length}</p>
          </div>
        </div>

        {/* Shops table */}
        <div className="bg-card border rounded-2xl p-4 md:p-6 shadow-sm">
          <Tabs defaultValue="pending" className="w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
              <h2 className="text-xl font-bold">Manage Stores</h2>
              <div className="flex flex-wrap gap-2">
                <TabsList>
                  <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
                  <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </div>
            </div>

            {/* Plan filter */}
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

            <TabsContent value="pending" className="m-0"><ShopTable data={displayedShops.filter(s => s.status === "pending")} /></TabsContent>
            <TabsContent value="active" className="m-0"><ShopTable data={displayedShops.filter(s => s.status === "active")} /></TabsContent>
            <TabsContent value="all" className="m-0"><ShopTable data={displayedShops} /></TabsContent>
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
              <select
                value={editPlanForm.plan}
                onChange={e => setEditPlanForm(p => ({ ...p, plan: e.target.value }))}
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
              <Input type="date" value={editPlanForm.expiry}
                onChange={e => setEditPlanForm(p => ({ ...p, expiry: e.target.value }))} />
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
