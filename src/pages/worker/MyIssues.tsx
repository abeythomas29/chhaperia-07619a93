import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowUpCircle } from "lucide-react";
import { format } from "date-fns";

interface IssuedEntry {
  id: string;
  date: string;
  quantity: number;
  unit: string;
  notes: string | null;
  product_codes: { code: string } | null;
  company_clients: { name: string } | null;
}

export default function MyIssues() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<IssuedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("stock_issues")
        .select("id, date, quantity, unit, notes, product_codes(code), company_clients(name)")
        .eq("issued_by", user.id)
        .order("date", { ascending: false })
        .limit(500);
      setIssues((data as unknown as IssuedEntry[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const filtered = issues.filter((i) => {
    const s = search.toLowerCase();
    if (!s) return true;
    return (
      i.product_codes?.code?.toLowerCase().includes(s) ||
      i.company_clients?.name?.toLowerCase().includes(s) ||
      i.notes?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My Issued Stock</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by product or client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product Code</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No issued stock found</TableCell>
                </TableRow>
              ) : (
                filtered.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {format(new Date(i.date), "dd/MM/yy")}
                    </TableCell>
                    <TableCell className="font-medium">{i.product_codes?.code ?? "—"}</TableCell>
                    <TableCell>{i.company_clients?.name ?? "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{Number(i.quantity).toLocaleString()}</TableCell>
                    <TableCell>{i.unit}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{i.notes ?? "—"}</TableCell>
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
