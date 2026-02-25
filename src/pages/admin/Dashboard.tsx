import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Package, Building2, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

export default function Dashboard() {
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, totalProducts: 0, totalClients: 0 });
  const [chartData, setChartData] = useState<{ date: string; entries: number }[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const now = new Date();
      const todayStr = format(now, "yyyy-MM-dd");
      const weekAgo = format(subDays(now, 7), "yyyy-MM-dd");
      const monthAgo = format(subDays(now, 30), "yyyy-MM-dd");

      const [todayRes, weekRes, monthRes, productsRes, clientsRes] = await Promise.all([
        supabase.from("production_entries").select("id", { count: "exact", head: true }).eq("date", todayStr),
        supabase.from("production_entries").select("id", { count: "exact", head: true }).gte("date", weekAgo),
        supabase.from("production_entries").select("id", { count: "exact", head: true }).gte("date", monthAgo),
        supabase.from("product_codes").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("company_clients").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);

      setStats({
        today: todayRes.count ?? 0,
        week: weekRes.count ?? 0,
        month: monthRes.count ?? 0,
        totalProducts: productsRes.count ?? 0,
        totalClients: clientsRes.count ?? 0,
      });

      // Chart data — last 7 days
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

    // Realtime subscription
    const channel = supabase
      .channel("dashboard-entries")
      .on("postgres_changes", { event: "*", schema: "public", table: "production_entries" }, () => {
        fetchStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const statCards = [
    { label: "Today's Entries", value: stats.today, icon: ClipboardList, color: "text-secondary" },
    { label: "This Week", value: stats.week, icon: TrendingUp, color: "text-primary" },
    { label: "Active Products", value: stats.totalProducts, icon: Package, color: "text-secondary" },
    { label: "Active Clients", value: stats.totalClients, icon: Building2, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
