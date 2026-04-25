import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart } from "lucide-react";
import { format } from "date-fns";

interface SaleRow {
  id: string;
  date: string;
  item_type: "raw_material" | "finished_product";
  quantity: number;
  unit: string;
  price_per_unit: number;
  total_amount: number;
  thickness_mm: number | null;
  notes: string | null;
  raw_material_id: string | null;
  product_code_id: string | null;
  client_id: string;
  item_name?: string;
  client_name?: string;
}

export default function SalesHistory() {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      let q = supabase.from("sales").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }).limit(500);
      if (!isAdmin) q = q.eq("sold_by", user.id);
      const { data } = await q;
      const sales = (data ?? []) as SaleRow[];

      // enrich
      const matIds = [...new Set(sales.filter((s) => s.raw_material_id).map((s) => s.raw_material_id as string))];
      const prodIds = [...new Set(sales.filter((s) => s.product_code_id).map((s) => s.product_code_id as string))];
      const clientIds = [...new Set(sales.map((s) => s.client_id))];

      const [mats, prods, cls] = await Promise.all([
        matIds.length ? supabase.from("raw_materials").select("id, name").in("id", matIds) : Promise.resolve({ data: [] as any[] }),
        prodIds.length ? supabase.from("product_codes").select("id, code").in("id", prodIds) : Promise.resolve({ data: [] as any[] }),
        clientIds.length ? supabase.from("company_clients").select("id, name").in("id", clientIds) : Promise.resolve({ data: [] as any[] }),
      ]);

      const matMap = new Map((mats.data ?? []).map((m: any) => [m.id, m.name]));
      const prodMap = new Map((prods.data ?? []).map((p: any) => [p.id, p.code]));
      const clientMap = new Map((cls.data ?? []).map((c: any) => [c.id, c.name]));

      const enriched = sales.map((s) => ({
        ...s,
        item_name: s.raw_material_id ? matMap.get(s.raw_material_id) : prodMap.get(s.product_code_id || ""),
        client_name: clientMap.get(s.client_id),
      }));
      setRows(enriched);
      setLoading(false);
    };
    load();
  }, [user, isAdmin]);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return (
      (r.item_name ?? "").toLowerCase().includes(q) ||
      (r.client_name ?? "").toLowerCase().includes(q) ||
      (r.notes ?? "").toLowerCase().includes(q)
    );
  });

  const totalRevenue = filtered.reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" /> Sales History
        </h1>
        <div className="text-sm text-muted-foreground">
          Total: <span className="font-mono font-bold text-foreground">{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by item, client, notes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{filtered.length} sale{filtered.length !== 1 ? "s" : ""}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price/unit</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No sales yet</TableCell></TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{format(new Date(r.date), "dd/MM/yy")}</TableCell>
                    <TableCell>
                      <Badge variant={r.item_type === "raw_material" ? "secondary" : "default"}>
                        {r.item_type === "raw_material" ? "Raw" : "Product"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.item_name ?? "—"}
                      {r.thickness_mm ? <span className="text-xs text-muted-foreground ml-1">({r.thickness_mm}mm)</span> : null}
                    </TableCell>
                    <TableCell>{r.client_name ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">{Number(r.quantity).toLocaleString()} {r.unit}</TableCell>
                    <TableCell className="text-right font-mono">{Number(r.price_per_unit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{Number(r.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.notes ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
