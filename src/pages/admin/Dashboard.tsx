import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Package, Building2, TrendingUp, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface EntryDetail {
  id: string;
  date: string;
  rolls_count: number;
  quantity_per_roll: number;
  total_quantity: number | null;
  unit: string;
  product_codes: { code: string } | null;
  company_clients: { name: string } | null;
  profiles: { name: string } | null;
}

interface ProductDetail {
  id: string;
  code: string;
  status: string;
  product_categories: { name: string } | null;
}

interface ClientDetail {
  id: string;
  name: string;
  status: string;
}

type ModalType = "today" | "week" | "products" | "clients" | null;

export default function Dashboard() {
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, totalProducts: 0, totalClients: 0 });
  const [chartData, setChartData] = useState<{ date: string; entries: number }[]>([]);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [todayEntries, setTodayEntries] = useState<EntryDetail[]>([]);
  const [weekEntries, setWeekEntries] = useState<EntryDetail[]>([]);
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [clients, setClients] = useState<ClientDetail[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const now = new Date();
      const todayStr = format(now, "yyyy-MM-dd");
      const weekAgo = format(subDays(now, 7), "yyyy-MM-dd");
      const monthAgo = format(subDays(now, 30), "yyyy-MM-dd");

      const [todayRes, weekRes, monthRes, productsRes, clientsRes] = await Promise.all([
        supabase.from("production_entries").select("id").eq("date", todayStr),
        supabase.from("production_entries").select("id").gte("date", weekAgo),
        supabase.from("production_entries").select("id").gte("date", monthAgo),
        supabase.from("product_codes").select("id").eq("status", "active"),
        supabase.from("company_clients").select("id").eq("status", "active"),
      ]);

      setStats({
        today: todayRes.data?.length ?? 0,
        week: weekRes.data?.length ?? 0,
        month: monthRes.data?.length ?? 0,
        totalProducts: productsRes.data?.length ?? 0,
        totalClients: clientsRes.data?.length ?? 0,
      });

      const { data: entries } = await supabase
        .from("production_entries")
        .select("date")
        .gte("date", weekAgo)
        .order("date");

      const dayCounts: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        dayCounts[format(subDays(now, i), "yyyy-MM-dd")] = 0;
      }
      entries?.forEach((e) => {
        if (dayCounts[e.date] !== undefined) dayCounts[e.date]++;
      });

      setChartData(
        Object.entries(dayCounts).map(([date, entries]) => ({
          date: format(new Date(date), "MMM dd"),
          entries,
        }))
      );
    };

    fetchStats();

    const channel = supabase
      .channel("dashboard-entries")
      .on("postgres_changes", { event: "*", schema: "public", table: "production_entries" }, () => {
        fetchStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const openModal = async (type: ModalType) => {
    setActiveModal(type);
    setModalLoading(true);

    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const weekAgo = format(subDays(now, 7), "yyyy-MM-dd");

    try {
      if (type === "today") {
        const { data } = await supabase
          .from("production_entries")
          .select("id, date, rolls_count, quantity_per_roll, total_quantity, unit, product_codes(code), company_clients(name), profiles:worker_id(name)")
          .eq("date", todayStr)
          .order("created_at", { ascending: false });
        setTodayEntries((data as unknown as EntryDetail[]) ?? []);
      } else if (type === "week") {
        const { data } = await supabase
          .from("production_entries")
          .select("id, date, rolls_count, quantity_per_roll, total_quantity, unit, product_codes(code), company_clients(name), profiles:worker_id(name)")
          .gte("date", weekAgo)
          .order("date", { ascending: false });
        setWeekEntries((data as unknown as EntryDetail[]) ?? []);
      } else if (type === "products") {
        const { data } = await supabase
          .from("product_codes")
          .select("id, code, status, product_categories(name)")
          .eq("status", "active")
          .order("code");
        setProducts((data as unknown as ProductDetail[]) ?? []);
      } else if (type === "clients") {
        const { data } = await supabase
          .from("company_clients")
          .select("id, name, status")
          .eq("status", "active")
          .order("name");
        setClients(data ?? []);
      }
    } finally {
      setModalLoading(false);
    }
  };

  const modalTitles: Record<string, string> = {
    today: "Today's Production Entries",
    week: "This Week's Production Entries",
    products: "Active Products",
    clients: "Active Clients",
  };

  const statCards = [
    { label: "Today's Entries", value: stats.today, icon: ClipboardList, color: "text-secondary", modal: "today" as ModalType },
    { label: "This Week", value: stats.week, icon: TrendingUp, color: "text-primary", modal: "week" as ModalType },
    { label: "Active Products", value: stats.totalProducts, icon: Package, color: "text-secondary", modal: "products" as ModalType },
    { label: "Active Clients", value: stats.totalClients, icon: Building2, color: "text-primary", modal: "clients" as ModalType },
  ];

  const renderEntriesTable = (entries: EntryDetail[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Product Code</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Worker</TableHead>
          <TableHead className="text-right">Rolls</TableHead>
          <TableHead className="text-right">Qty/Roll</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Unit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No entries found</TableCell>
          </TableRow>
        ) : (
          entries.map((e) => (
            <TableRow key={e.id}>
              <TableCell>{e.date}</TableCell>
              <TableCell className="font-medium">{e.product_codes?.code ?? "—"}</TableCell>
              <TableCell>{e.company_clients?.name ?? "—"}</TableCell>
              <TableCell>{e.profiles?.name ?? "—"}</TableCell>
              <TableCell className="text-right">{e.rolls_count}</TableCell>
              <TableCell className="text-right">{e.quantity_per_roll}</TableCell>
              <TableCell className="text-right font-semibold">{e.total_quantity ?? "—"}</TableCell>
              <TableCell>{e.unit}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const renderModalContent = () => {
    if (modalLoading) return <p className="text-center py-8 text-muted-foreground">Loading...</p>;

    if (activeModal === "today") return renderEntriesTable(todayEntries);
    if (activeModal === "week") return renderEntriesTable(weekEntries);

    if (activeModal === "products") {
      return (
        <div className="space-y-2">
          {products.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No active products</p>
          ) : (
            products.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                <div>
                  <span className="font-medium text-sm">{p.code}</span>
                  <span className="text-xs text-muted-foreground ml-2">{p.product_categories?.name}</span>
                </div>
                <Badge variant="default">{p.status}</Badge>
              </div>
            ))
          )}
        </div>
      );
    }

    if (activeModal === "clients") {
      return (
        <div className="space-y-2">
          {clients.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No active clients</p>
          ) : (
            clients.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                <span className="font-medium text-sm">{c.name}</span>
                <Badge variant="default">{c.status}</Badge>
              </div>
            ))
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card
            key={s.label}
            className="cursor-pointer transition-shadow hover:shadow-md hover:border-primary/30"
            onClick={() => openModal(s.modal)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">Click to view details</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={activeModal !== null} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeModal ? modalTitles[activeModal] : ""}</DialogTitle>
          </DialogHeader>
          {renderModalContent()}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Production Entries — Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Bar dataKey="entries" fill="hsl(30, 90%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
