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
import { Search, PackagePlus, ArrowDownCircle, ArrowUpCircle, Package, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface ThicknessBreakdown {
  thickness_mm: number | null;
  produced: number;
}

interface StockSummary {
  product_code_id: string;
  code: string;
  unit: string;
  produced: number;
  issued: number;
  available: number;
  thicknessBreakdown: ThicknessBreakdown[];
}

interface LedgerEntry {
  id: string;
  date: string;
  type: "IN" | "OUT";
  product_code: string;
  thickness_mm: number | null;
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
  const [inPage, setInPage] = useState(1);
  const [outPage, setOutPage] = useState(1);
  const PAGE_SIZE = 20;

  // Issue dialog
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueProductCodeId, setIssueProductCodeId] = useState("");
  const [issueClientId, setIssueClientId] = useState("");
  const [issueQuantity, setIssueQuantity] = useState("");
  const [issueUnit, setIssueUnit] = useState("meters");
  const [issueNotes, setIssueNotes] = useState("");
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [issueThickness, setIssueThickness] = useState("");
  const [issuing, setIssuing] = useState(false);

  // Edit thickness dialog
  const [editThicknessOpen, setEditThicknessOpen] = useState(false);
  const [editEntryId, setEditEntryId] = useState("");
  const [editThicknessValue, setEditThicknessValue] = useState("");
  const [editingThickness, setEditingThickness] = useState(false);

  const fetchData = async () => {
    setLoading(true);

    const { data: prodData } = await supabase
      .from("production_entries")
      .select("id, date, product_code_id, total_quantity, quantity_per_roll, rolls_count, unit, thickness_mm, product_codes(code), profiles:worker_id(name)")
      .order("date", { ascending: false })
      .limit(1000);

    const { data: issueData } = await supabase
      .from("stock_issues")
      .select("id, date, product_code_id, quantity, unit, notes, thickness_mm, client_id, product_codes(code), company_clients(name), profiles:issued_by(name)")
      .order("date", { ascending: false })
      .limit(1000);

    const [{ data: cl }, { data: pc }] = await Promise.all([
      supabase.from("company_clients").select("id, name").eq("status", "active").order("name"),
      supabase.from("product_codes").select("id, code").eq("status", "active").order("code"),
    ]);
    setClients(cl ?? []);
    setProductCodes(pc ?? []);

    const pcTotals = new Map<string, { code: string; unit: string; produced: number }>();
    const thicknessMap = new Map<string, Map<number | null, number>>();
    const issueMap = new Map<string, number>();

    for (const p of (prodData ?? []) as any[]) {
      const pcId = p.product_code_id;
      const thickness = p.thickness_mm != null ? Number(p.thickness_mm) : null;
      const qty = Number(p.total_quantity ?? (p.rolls_count * p.quantity_per_roll));

      const existing = pcTotals.get(pcId);
      if (existing) {
        existing.produced += qty;
      } else {
        pcTotals.set(pcId, { code: p.product_codes?.code ?? "—", unit: p.unit, produced: qty });
      }

      if (!thicknessMap.has(pcId)) thicknessMap.set(pcId, new Map());
      const tMap = thicknessMap.get(pcId)!;
      tMap.set(thickness, (tMap.get(thickness) ?? 0) + qty);
    }

    for (const i of (issueData ?? []) as any[]) {
      const pcId = i.product_code_id;
      issueMap.set(pcId, (issueMap.get(pcId) ?? 0) + Number(i.quantity));
    }

    const allPcIds = new Set([...pcTotals.keys(), ...issueMap.keys()]);
    const summaryList: StockSummary[] = [];
    for (const pcId of allPcIds) {
      const prod = pcTotals.get(pcId);
      const produced = prod?.produced ?? 0;
      const issued = issueMap.get(pcId) ?? 0;
      const tMap = thicknessMap.get(pcId);
      const breakdown: ThicknessBreakdown[] = [];
      if (tMap) {
        for (const [t, q] of Array.from(tMap.entries()).sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0))) {
          breakdown.push({ thickness_mm: t, produced: q });
        }
      }
      summaryList.push({
        product_code_id: pcId,
        code: prod?.code ?? "—",
        unit: prod?.unit ?? "meters",
        produced,
        issued,
        available: produced - issued,
        thicknessBreakdown: breakdown,
      });
    }
    summaryList.sort((a, b) => a.code.localeCompare(b.code));
    setSummaries(summaryList);

    const ledgerEntries: LedgerEntry[] = [];
    for (const p of (prodData ?? []) as any[]) {
      ledgerEntries.push({
        id: p.id,
        date: p.date,
        type: "IN",
        product_code: p.product_codes?.code ?? "—",
        thickness_mm: p.thickness_mm != null ? Number(p.thickness_mm) : null,
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
        thickness_mm: i.thickness_mm != null ? Number(i.thickness_mm) : null,
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
      thickness_mm: issueThickness ? Number(issueThickness) : null,
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
    setIssueThickness("");
    setIssueNotes("");
    setIssueDate(format(new Date(), "yyyy-MM-dd"));
  };

  const openIssueForProduct = (pcId: string, unit: string) => {
    setIssueProductCodeId(pcId);
    setIssueUnit(unit);
    setIssueOpen(true);
  };

  const inData = filteredLedger.filter(e => e.type === "IN");
  const inTotalPages = Math.max(1, Math.ceil(inData.length / PAGE_SIZE));
  const inPaged = inData.slice((inPage - 1) * PAGE_SIZE, inPage * PAGE_SIZE);

  const outData = filteredLedger.filter(e => e.type === "OUT");
  const outTotalPages = Math.max(1, Math.ceil(outData.length / PAGE_SIZE));
  const outPaged = outData.slice((outPage - 1) * PAGE_SIZE, outPage * PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Stock Management</h1>
        <Button
          onClick={() => setIssueOpen(true)}
          className="bg-secondary hover:bg-secondary/90 h-11 sm:h-9 w-full sm:w-auto"
        >
          <PackagePlus className="h-4 w-4 mr-2" /> Issue Stock
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by product code or client..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setInPage(1); setOutPage(1); }}
          className="pl-9 h-11"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          <p className="text-muted-foreground col-span-full text-center py-8">Loading...</p>
        ) : filteredSummaries.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-8">No stock data found</p>
        ) : (
          filteredSummaries.map((s) => (
            <Card key={s.product_code_id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 leading-snug">
                  <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="break-words">{s.code}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-3 gap-1 text-center mb-3">
                  <div className="bg-green-50 rounded-lg py-2">
                    <p className="text-xs text-muted-foreground mb-0.5">Produced</p>
                    <p className="text-base font-bold text-green-600 leading-tight">{s.produced.toLocaleString()}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg py-2">
                    <p className="text-xs text-muted-foreground mb-0.5">Issued</p>
                    <p className="text-base font-bold text-red-500 leading-tight">{s.issued.toLocaleString()}</p>
                  </div>
                  <div className={`rounded-lg py-2 ${s.available > 0 ? "bg-blue-50" : "bg-destructive/10"}`}>
                    <p className="text-xs text-muted-foreground mb-0.5">Available</p>
                    <p className={`text-base font-bold leading-tight ${s.available > 0 ? "text-primary" : "text-destructive"}`}>
                      {s.available.toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mb-3">Unit: {s.unit}</p>

                {s.thicknessBreakdown.length > 0 && s.thicknessBreakdown.some(t => t.thickness_mm != null) && (
                  <div className="mb-3 border rounded-md overflow-hidden">
                    <div className="bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                      By Thickness
                    </div>
                    <div className="divide-y">
                      {s.thicknessBreakdown.map((t) => (
                        <div key={String(t.thickness_mm)} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span className="font-medium text-muted-foreground">
                            {t.thickness_mm != null ? `${t.thickness_mm} mm` : "No thickness"}
                          </span>
                          <span className="font-semibold">{t.produced.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{s.unit}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-10"
                  onClick={() => openIssueForProduct(s.product_code_id, s.unit)}
                >
                  Issue to Client
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Inward Supply */}
      <LedgerSection
        title="Inward Supply (Production)"
        icon={<ArrowDownCircle className="h-5 w-5 text-green-600" />}
        count={inData.length}
        loading={loading}
        page={inPage}
        totalPages={inTotalPages}
        onPageChange={setInPage}
        emptyMessage="No inward entries found"
      >
        {/* Mobile card list */}
        <div className="md:hidden divide-y">
          {inPaged.map((e) => (
            <div key={`IN-mob-${e.id}`} className="px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{e.product_code}</span>
                <span className="text-sm font-bold text-green-600">+{Number(e.quantity).toLocaleString()} <span className="font-normal text-xs text-muted-foreground">{e.unit}</span></span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{format(new Date(e.date), "dd MMM yyyy")}</span>
                <span>{e.person ?? "—"}</span>
              </div>
              {e.thickness_mm != null ? (
                <p className="text-xs text-muted-foreground">Thickness: {e.thickness_mm} mm</p>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground italic">No thickness</p>
                  <button
                    className="text-xs text-primary underline"
                    onClick={() => { setEditEntryId(e.id); setEditThicknessValue(""); setEditThicknessOpen(true); }}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product Code</TableHead>
                <TableHead className="text-right">Thickness (mm)</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Worker</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inPaged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No inward entries found</TableCell>
                </TableRow>
              ) : (
                inPaged.map((e) => (
                  <TableRow key={`IN-${e.id}`}>
                    <TableCell className="font-medium whitespace-nowrap">{format(new Date(e.date), "dd/MM/yy")}</TableCell>
                    <TableCell className="font-medium">{e.product_code}</TableCell>
                    <TableCell className="text-right">
                      {e.thickness_mm != null ? e.thickness_mm : <span className="text-muted-foreground italic text-sm">Not set</span>}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">{Number(e.quantity).toLocaleString()}</TableCell>
                    <TableCell>{e.unit}</TableCell>
                    <TableCell>{e.person ?? "—"}</TableCell>
                    <TableCell>
                      {e.thickness_mm == null && (
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => { setEditEntryId(e.id); setEditThicknessValue(""); setEditThicknessOpen(true); }}>
                          <Pencil className="h-3 w-3 mr-1" /> Add
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </LedgerSection>

      {/* Outward Supply */}
      <LedgerSection
        title="Outward Supply (Issued to Clients)"
        icon={<ArrowUpCircle className="h-5 w-5 text-red-500" />}
        count={outData.length}
        loading={loading}
        page={outPage}
        totalPages={outTotalPages}
        onPageChange={setOutPage}
        emptyMessage="No outward entries found"
      >
        {/* Mobile card list */}
        <div className="md:hidden divide-y">
          {outPaged.map((e) => (
            <div key={`OUT-mob-${e.id}`} className="px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{e.product_code}</span>
                <span className="text-sm font-bold text-red-500">−{Number(e.quantity).toLocaleString()} <span className="font-normal text-xs text-muted-foreground">{e.unit}</span></span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{format(new Date(e.date), "dd MMM yyyy")}</span>
                <span>{e.client_name ?? "—"}</span>
              </div>
              {e.thickness_mm != null && (
                <p className="text-xs text-muted-foreground">Thickness: {e.thickness_mm} mm</p>
              )}
              {e.person && <p className="text-xs text-muted-foreground">Issued by: {e.person}</p>}
              {e.notes && <p className="text-xs text-muted-foreground truncate">Note: {e.notes}</p>}
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product Code</TableHead>
                <TableHead className="text-right">Thickness (mm)</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Issued By</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outPaged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No outward entries found</TableCell>
                </TableRow>
              ) : (
                outPaged.map((e) => (
                  <TableRow key={`OUT-${e.id}`}>
                    <TableCell className="font-medium whitespace-nowrap">{format(new Date(e.date), "dd/MM/yy")}</TableCell>
                    <TableCell className="font-medium">{e.product_code}</TableCell>
                    <TableCell className="text-right">{e.thickness_mm != null ? e.thickness_mm : "—"}</TableCell>
                    <TableCell>{e.client_name ?? "—"}</TableCell>
                    <TableCell className="text-right font-semibold text-red-500">{Number(e.quantity).toLocaleString()}</TableCell>
                    <TableCell>{e.unit}</TableCell>
                    <TableCell>{e.person ?? "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{e.notes ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </LedgerSection>

      {/* Issue Stock Dialog */}
      <Dialog open={issueOpen} onOpenChange={(open) => { if (!open) { setIssueOpen(false); resetIssueForm(); } }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto w-[calc(100%-2rem)] sm:w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>Issue Stock to Client</DialogTitle>
            <DialogDescription>Select a product, client, and quantity to issue.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label>Product Code</Label>
              <Select value={issueProductCodeId} onValueChange={(v) => { setIssueProductCodeId(v); const s = summaries.find(s => s.product_code_id === v); if (s) setIssueUnit(s.unit); }}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {productCodes.map((p) => {
                    const stock = summaries.find(s => s.product_code_id === p.id);
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} {stock ? `(Avail: ${stock.available.toLocaleString()} ${stock.unit})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {issueProductCodeId && (() => {
                const stock = summaries.find(s => s.product_code_id === issueProductCodeId);
                if (!stock) return null;
                return (
                  <div className="grid grid-cols-3 gap-2 text-sm p-3 rounded-lg bg-muted">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Produced</p>
                      <p className="font-bold text-green-600">{stock.produced.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Issued</p>
                      <p className="font-bold text-red-500">{stock.issued.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Available</p>
                      <p className={`font-bold ${stock.available > 0 ? "text-primary" : "text-destructive"}`}>{stock.available.toLocaleString()}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={issueClientId} onValueChange={setIssueClientId}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" min="0" step="0.01" value={issueQuantity} onChange={(e) => setIssueQuantity(e.target.value)} placeholder="0" className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Thickness (mm)</Label>
                <Input type="number" min="0" step="0.01" value={issueThickness} onChange={(e) => setIssueThickness(e.target.value)} placeholder="Optional" className="h-12" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={issueUnit} onValueChange={setIssueUnit}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meters">Meters</SelectItem>
                  <SelectItem value="kg">Kg</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={issueNotes} onChange={(e) => setIssueNotes(e.target.value)} placeholder="e.g. Delivery challan #123" rows={3} />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setIssueOpen(false); resetIssueForm(); }}>Cancel</Button>
            <Button onClick={handleIssue} disabled={issuing} className="w-full sm:w-auto bg-secondary hover:bg-secondary/90">
              {issuing ? "Issuing..." : "Issue Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Thickness Dialog */}
      <Dialog open={editThicknessOpen} onOpenChange={setEditThicknessOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Thickness</DialogTitle>
            <DialogDescription>Set the thickness for this production entry.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Thickness (mm)</Label>
              <Input type="number" min="0" step="0.01" value={editThicknessValue} onChange={(e) => setEditThicknessValue(e.target.value)} placeholder="e.g. 0.5" className="h-12" />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setEditThicknessOpen(false)}>Cancel</Button>
            <Button
              disabled={editingThickness || !editThicknessValue}
              className="w-full sm:w-auto"
              onClick={async () => {
                setEditingThickness(true);
                const { error } = await supabase.from("production_entries").update({ thickness_mm: Number(editThicknessValue) } as any).eq("id", editEntryId);
                setEditingThickness(false);
                if (error) {
                  toast({ title: "Error", description: error.message, variant: "destructive" });
                } else {
                  toast({ title: "Thickness updated" });
                  setEditThicknessOpen(false);
                  fetchData();
                }
              }}
            >
              {editingThickness ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Shared wrapper for ledger sections
function LedgerSection({
  title,
  icon,
  count,
  loading,
  page,
  totalPages,
  onPageChange,
  emptyMessage,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
        {icon}
        <span>{title}</span>
        <span className="text-sm font-normal text-muted-foreground">({count})</span>
      </h2>
      <div className="border rounded-lg overflow-hidden">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground text-sm">Loading...</p>
        ) : count === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">{emptyMessage}</p>
        ) : (
          children
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 px-1">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9 w-9" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-9 w-9" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
