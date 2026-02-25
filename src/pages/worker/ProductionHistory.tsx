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
  product_codes: { code: string } | null;
  company_clients: { name: string } | null;
}

export default function ProductionHistory() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("production_entries")
        .select("id, date, rolls_count, quantity_per_roll, total_quantity, unit, product_codes(code), company_clients(name)")
        .eq("worker_id", user.id)
        .order("date", { ascending: false })
        .limit(200);
      setEntries((data as unknown as HistoryEntry[]) ?? []);
      setLoading(false);
    };
    fetch();
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : entries.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No entries yet</TableCell></TableRow>
            ) : (
              entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.date}</TableCell>
                  <TableCell className="font-medium">{e.product_codes?.code ?? "—"}</TableCell>
                  <TableCell>{e.company_clients?.name ?? "—"}</TableCell>
                  <TableCell className="text-right">{e.rolls_count}</TableCell>
                  <TableCell className="text-right font-semibold">{e.total_quantity ?? "—"}</TableCell>
                  <TableCell>{e.unit}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
