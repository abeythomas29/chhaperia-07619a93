import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, PackagePlus, ArrowDownCircle, ArrowUpCircle, Package } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface StockSummary {
  product_code_id: string;
  code: string;
  unit: string;
  produced: number;
  issued: number;
  available: number;
}

interface LedgerEntry {
  id: string;
  date: string;
  type: "IN" | "OUT";
  product_code: string;
  client_name: string | null;
  quantity: number;
  unit: string;
  notes: string | null;
  person: string | null;
}

interface Client {
  id: string;
  name: string;
}

interface ProductCode {
  id: string;
  code: string;
}

export default function StockManagement() {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<StockSummary[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [productCodes, setProductCodes] = useState<ProductCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Issue dialog
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueProductCodeId, setIssueProductCodeId] = useState("");
  const [issueClientId, setIssueClientId] = useState("");
  const [issueQuantity, setIssueQuantity] = useState("");
  const [issueUnit, setIssueUnit] = useState("meters");
  const [issueNotes, setIssueNotes] = useState("");
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [issuing, setIssuing] = useState(false);

  const fetchData = async () => {
    setLoading(true);

    // Fetch production entries (IN)
    const { data: prodData } = await supabase
      .from("production_entries")
      .select("id, date, product_code_id, total_quantity, quantity_per_roll, rolls_count, unit, product_codes(code), profiles:worker_id(name)")
      .order("date", { ascending: false })
      .limit(1000);

    // Fetch stock issues (OUT)
    const { data: issueData } = await supabase
      .from("stock_issues")
      .select("id, date, product_code_id, quantity, unit, notes, client_id, product_codes(code), company_clients(name), profiles:issued_by(name)")
      .order("date", { ascending: false })
      .limit(1000);

    // Fetch dropdowns
    const [{ data: cl }, { data: pc }] = await Promise.all([
      supabase.from("company_clients").select("id, name").eq("status", "active").order("name"),
      supabase.from("product_codes").select("id, code").eq("status", "active").order("code"),
    ]);
    setClients(cl ?? []);
    setProductCodes(pc ?? []);

    // Build summaries
    const prodMap = new Map<string, { code: string; unit: string; produced: number }>();
    const issueMap = new Map<string, number>();

    for (const p of (prodData ?? []) as any[]) {
      const pcId = p.product_code_id;
      const qty = p.total_quantity ?? (p.rolls_count * p.quantity_per_roll);
      const existing = prodMap.get(pcId);
      if (existing) {
        existing.produced += Number(qty);
      } else {
        prodMap.set(pcId, {
          code: p.product_codes?.code ?? "—",
          unit: p.unit,
          produced: Number(qty),
        });
      }
    }

    for (const i of (issueData ?? []) as any[]) {
      const pcId = i.product_code_id;
      issueMap.set(pcId, (issueMap.get(pcId) ?? 0) + Number(i.quantity));
    }

    const allPcIds = new Set([...prodMap.keys(), ...issueMap.keys()]);
    const summaryList: StockSummary[] = [];
    for (const pcId of allPcIds) {
      const prod = prodMap.get(pcId);
      const produced = prod?.produced ?? 0;
      const issued = issueMap.get(pcId) ?? 0;
      summaryList.push({
        product_code_id: pcId,
        code: prod?.code ?? "—",
        unit: prod?.unit ?? "meters",
        produced,
        issued,
        available: produced - issued,
      });
    }
    summaryList.sort((a, b) => a.code.localeCompare(b.code));
    setSummaries(summaryList);

    // Build ledger
    const ledgerEntries: LedgerEntry[] = [];
    for (const p of (prodData ?? []) as any[]) {
      ledgerEntries.push({
        id: p.id,
        date: p.date,
        type: "IN",
        product_code: p.product_codes?.code ?? "—",
        client_name: null,
        quantity: p.total_quantity ?? (p.rolls_count * p.quantity_per_roll),
        unit: p.unit,
        notes: null,
        person: p.profiles?.name ?? null,
      });
    }
    for (const i of (issueData ?? []) as any[]) {
      ledgerEntries.push({
        id: i.id,
        date: i.date,
        type: "OUT",
        product_code: i.product_codes?.code ?? "—",
        client_name: i.company_clients?.name ?? "—",
        quantity: Number(i.quantity),
        unit: i.unit,
        notes: i.notes,
        person: i.profiles?.name ?? null,
      });
    }
    ledgerEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setLedger(ledgerEntries);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredSummaries = summaries.filter((s) =>
    !search || s.code.toLowerCase().includes(search.toLowerCase())
  );

  const filteredLedger = ledger.filter((e) => {
    const s = search.toLowerCase();
    return !s || e.product_code.toLowerCase().includes(s) || (e.client_name?.toLowerCase().includes(s) ?? false);
  });

  const handleIssue = async () => {
    if (!user || !issueProductCodeId || !issueClientId || !issueQuantity) return;
    setIssuing(true);

    const { error } = await supabase.from("stock_issues").insert({
      product_code_id: issueProductCodeId,
      client_id: issueClientId,
      quantity: Number(issueQuantity),
      unit: issueUnit,
      notes: issueNotes || null,
      issued_by: user.id,
      date: issueDate,
    } as any);

    setIssuing(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Stock issued successfully" });
      setIssueOpen(false);
      resetIssueForm();
      fetchData();
    }
  };

  const resetIssueForm = () => {
    setIssueProductCodeId("");
    setIssueClientId("");
    setIssueQuantity("");
    setIssueUnit("meters");
    setIssueNotes("");
    setIssueDate(format(new Date(), "yyyy-MM-dd"));
  };

  const openIssueForProduct = (pcId: string, unit: string) => {
    setIssueProductCodeId(pcId);
    setIssueUnit(unit);
    setIssueOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stock Management</h1>
        <Button onClick={() => setIssueOpen(true)} className="bg-secondary hover:bg-secondary/90">
          <PackagePlus className="h-4 w-4 mr-2" /> Issue Stock
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by product code or client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-muted-foreground col-span-full text-center py-8">Loading...</p>
        ) : filteredSummaries.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-8">No stock data found</p>
        ) : (
          filteredSummaries.map((s) => (
            <Card key={s.product_code_id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  {s.code}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Produced</p>
                    <p className="text-lg font-semibold text-green-600">{s.produced.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Issued</p>
                    <p className="text-lg font-semibold text-red-500">{s.issued.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Available</p>
                    <p className={`text-lg font-bold ${s.available > 0 ? "text-primary" : "text-destructive"}`}>
                      {s.available.toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mb-3">Unit: {s.unit}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => openIssueForProduct(s.product_code_id, s.unit)}
                >
                  Issue to Client
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Ledger */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Transaction Ledger</h2>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Product Code</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : filteredLedger.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No transactions found</TableCell>
                </TableRow>
              ) : (
                filteredLedger.map((e) => (
                  <TableRow key={`${e.type}-${e.id}`}>
                    <TableCell className="text-base font-medium whitespace-nowrap">
                      {format(new Date(e.date), "dd/MM/yy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.type === "IN" ? "default" : "destructive"} className="gap-1">
                        {e.type === "IN" ? <ArrowDownCircle className="h-3 w-3" /> : <ArrowUpCircle className="h-3 w-3" />}
                        {e.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{e.product_code}</TableCell>
                    <TableCell>{e.client_name ?? "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{Number(e.quantity).toLocaleString()}</TableCell>
                    <TableCell>{e.unit}</TableCell>
                    <TableCell>{e.person ?? "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{e.notes ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Issue Stock Dialog */}
      <Dialog open={issueOpen} onOpenChange={(open) => { if (!open) { setIssueOpen(false); resetIssueForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Stock to Client</DialogTitle>
            <DialogDescription>Select a product, client, and quantity to issue.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Product Code</Label>
              <Select value={issueProductCodeId} onValueChange={(v) => { setIssueProductCodeId(v); const s = summaries.find(s => s.product_code_id === v); if (s) setIssueUnit(s.unit); }}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {productCodes.map((p) => {
                    const stock = summaries.find(s => s.product_code_id === p.id);
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} {stock ? `(Available: ${stock.available.toLocaleString()} ${stock.unit})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {issueProductCodeId && (() => {
                const stock = summaries.find(s => s.product_code_id === issueProductCodeId);
                if (!stock) return null;
                return (
                  <div className="flex gap-4 text-sm p-2 rounded bg-muted">
                    <span>Produced: <strong className="text-green-600">{stock.produced.toLocaleString()}</strong></span>
                    <span>Issued: <strong className="text-red-500">{stock.issued.toLocaleString()}</strong></span>
                    <span>Available: <strong className={stock.available > 0 ? "text-primary" : "text-destructive"}>{stock.available.toLocaleString()} {stock.unit}</strong></span>
                  </div>
                );
              })()}
            </div>
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={issueClientId} onValueChange={setIssueClientId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" min="0" step="0.01" value={issueQuantity} onChange={(e) => setIssueQuantity(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={issueUnit} onValueChange={setIssueUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meters">Meters</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={issueNotes} onChange={(e) => setIssueNotes(e.target.value)} placeholder="e.g. Delivery challan #123" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIssueOpen(false); resetIssueForm(); }}>Cancel</Button>
            <Button onClick={handleIssue} disabled={issuing} className="bg-secondary hover:bg-secondary/90">
              {issuing ? "Issuing..." : "Issue Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
