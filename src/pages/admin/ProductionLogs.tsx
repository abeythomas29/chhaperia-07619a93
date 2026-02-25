import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Search } from "lucide-react";
import { format } from "date-fns";

interface LogEntry {
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

export default function ProductionLogs() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchEntries = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("production_entries")
      .select("id, date, rolls_count, quantity_per_roll, total_quantity, unit, product_codes(code), company_clients(name), profiles:worker_id(name)")
      .order("date", { ascending: false })
      .limit(500);

    setEntries((data as unknown as LogEntry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const filtered = entries.filter((e) => {
    const s = search.toLowerCase();
    return (
      !s ||
      e.product_codes?.code?.toLowerCase().includes(s) ||
      e.company_clients?.name?.toLowerCase().includes(s) ||
      e.profiles?.name?.toLowerCase().includes(s)
    );
  });

  const exportCSV = () => {
    const rows = [
      ["Date", "Product Code", "Client", "Worker", "Rolls", "Qty/Roll", "Total", "Unit"],
      ...filtered.map((e) => [
        e.date,
        e.product_codes?.code ?? "",
        e.company_clients?.name ?? "",
        e.profiles?.name ?? "",
        e.rolls_count,
        e.quantity_per_roll,
        e.total_quantity ?? "",
        e.unit,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `production_logs_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Production Logs</h1>
        <Button onClick={exportCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by product, client, worker..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="border rounded-lg">
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
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No entries found</TableCell>
              </TableRow>
            ) : (
              filtered.map((e) => (
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
      </div>
    </div>
  );
}
