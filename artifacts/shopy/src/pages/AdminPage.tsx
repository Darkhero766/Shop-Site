import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase, Shop } from "@/lib/supabase";
import { ShieldAlert, Store, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function verifyAndLoad() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please log in first");
        setLocation("/login");
        return;
      }

      const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL ?? "").trim().toLowerCase();
      const userEmail = (user.email ?? "").trim().toLowerCase();

      if (!adminEmail) {
        toast.error("Admin email not configured — check VITE_ADMIN_EMAIL env var");
        setLocation("/");
        return;
      }

      if (userEmail !== adminEmail) {
        toast.error(`Access denied. Logged in as: ${user.email}`);
        setLocation("/");
        return;
      }

      const { data, error } = await supabase.from("shops").select("*").order("created_at", { ascending: false });
      if (!error && data) {
        setShops(data);
      }
      setIsLoading(false);
    }
    verifyAndLoad();
  }, [setLocation]);

  const updateStatus = async (id: string, status: "active" | "suspended") => {
    const { error } = await supabase.from("shops").update({ status }).eq("id", id);
    if (!error) {
      setShops(shops.map(s => s.id === id ? { ...s, status } : s));
      toast.success(`Shop marked as ${status}`);
    } else {
      toast.error("Update failed");
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading admin panel...</div>;

  const pending = shops.filter(s => s.status === "pending");
  const active = shops.filter(s => s.status === "active");

  const ShopTable = ({ data }: { data: Shop[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Shop Name</TableHead>
          <TableHead>Subdomain</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow><TableCell colSpan={5} className="text-center py-8">No shops found.</TableCell></TableRow>
        ) : (
          data.map((shop) => (
            <TableRow key={shop.id} data-testid={`admin-shop-row-${shop.id}`}>
              <TableCell className="font-medium">{shop.shop_name}</TableCell>
              <TableCell>{shop.subdomain}.shopgram.in</TableCell>
              <TableCell>
                <div className="text-sm">{shop.email}</div>
                <div className="text-xs text-muted-foreground">{shop.whatsapp}</div>
              </TableCell>
              <TableCell>
                <Badge variant={shop.status === "active" ? "default" : shop.status === "pending" ? "secondary" : "destructive"}>
                  {shop.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {shop.status !== "active" && (
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 rounded-full h-8 px-3" onClick={() => updateStatus(shop.id, "active")}>
                      <CheckCircle className="w-4 h-4 mr-1"/> Approve
                    </Button>
                  )}
                  {shop.status !== "suspended" && (
                    <Button size="sm" variant="destructive" className="rounded-full h-8 px-3" onClick={() => updateStatus(shop.id, "suspended")}>
                      <XCircle className="w-4 h-4 mr-1"/> Suspend
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="bg-card border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <ShieldAlert className="w-6 h-6" /> Super Admin
        </div>
        <Button variant="outline" size="sm" onClick={() => setLocation("/dashboard")}>Exit Admin</Button>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border rounded-2xl p-6 text-center shadow-sm">
            <h3 className="text-muted-foreground font-medium mb-2">Total Shops</h3>
            <p className="text-4xl font-bold">{shops.length}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center shadow-sm text-emerald-900">
            <h3 className="font-medium mb-2 opacity-80">Active</h3>
            <p className="text-4xl font-bold">{active.length}</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center shadow-sm text-amber-900">
            <h3 className="font-medium mb-2 opacity-80">Pending Review</h3>
            <p className="text-4xl font-bold">{pending.length}</p>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <Tabs defaultValue="pending" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Manage Stores</h2>
              <TabsList>
                <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
                <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="pending" className="m-0"><ShopTable data={pending} /></TabsContent>
            <TabsContent value="active" className="m-0"><ShopTable data={active} /></TabsContent>
            <TabsContent value="all" className="m-0"><ShopTable data={shops} /></TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}