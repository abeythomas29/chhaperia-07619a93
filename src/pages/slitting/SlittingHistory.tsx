import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, History } from "lucide-react";
import { format } from "date-fns";

interface SlittingRow {
  id: string;
  date: string;
  source_quantity: number;
  cut_quantity_produced: number;
  cut_width_mm: number;
  remaining_returned: number;
  thickness_mm: number | null;
  unit: string;
  notes: string | null;
  product_codes: { code: string } | null;
}

export default function SlittingHistory() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<SlittingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("slitting_entries")
        .select("id, date, source_quantity, cut_quantity_produced, cut_width_mm, remaining_returned, thickness_mm, unit, notes, product_codes(code)")
        .eq("slitting_manager_id", user.id)
        .order("date", { ascending: false });
      setEntries((data as unknown as SlittingRow[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          My Slitting History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">No slitting entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Taken</TableHead>
                  <TableHead>Cut Width</TableHead>
                  <TableHead>Produced</TableHead>
                  <TableHead>Returned</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{format(new Date(e.date), "dd/MM/yy")}</TableCell>
                    <TableCell className="font-medium">{e.product_codes?.code ?? "—"}</TableCell>
                    <TableCell>{e.source_quantity} {e.unit}</TableCell>
                    <TableCell>{e.cut_width_mm} mm</TableCell>
                    <TableCell>{e.cut_quantity_produced} {e.unit}</TableCell>
                    <TableCell>{e.remaining_returned} {e.unit}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{e.notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}