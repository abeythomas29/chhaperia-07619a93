import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HistoryEntry {
  id: string;
  date: string;
  rolls_count: number;
  quantity_per_roll: number;
  total_quantity: number | null;
  unit: string;
  thickness_mm: number | null;
  product_codes: { code: string } | null;
  company_clients: { name: string } | null;
}

export default function ProductionHistory() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchHistory = async () => {
      let { data, error } = await supabase
        .from("production_entries")
        .select("id, date, rolls_count, quantity_per_roll, total_quantity, unit, thickness_mm, product_codes(code), company_clients(name)")
        .eq("worker_id", user.id)
        .order("date", { ascending: false })
        .limit(200);

      if (error && error.message?.includes("thickness_mm")) {
        const fallback = await supabase
          .from("production_entries")
          .select("id, date, rolls_count, quantity_per_roll, total_quantity, unit, product_codes(code), company_clients(name)")
          .eq("worker_id", user.id)
          .order("date", { ascending: false })
          .limit(200);
        data = fallback.data as unknown as typeof data;
        error = fallback.error;
      }

      setEntries((data as unknown as HistoryEntry[]) ?? []);
      setLoading(false);
    };
    fetchHistory();
  }, [user]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Production History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Rolls</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Thickness (mm)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : entries.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No entries yet</TableCell></TableRow>
            ) : (
              entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.date}</TableCell>
                  <TableCell className="font-medium">{e.product_codes?.code ?? "—"}</TableCell>
                  <TableCell>{e.company_clients?.name ?? "—"}</TableCell>
                  <TableCell className="text-right">{e.rolls_count}</TableCell>
                  <TableCell className="text-right font-semibold">{e.total_quantity ?? (e.rolls_count * e.quantity_per_roll)}</TableCell>
                  <TableCell>{e.unit}</TableCell>
                  <TableCell className="text-right">{e.thickness_mm ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
