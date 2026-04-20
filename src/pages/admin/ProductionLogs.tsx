import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Download, Search, Pencil, Trash2, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LogEntry {
  id: string;
  date: string;
  rolls_count: number;
  quantity_per_roll: number;
  thickness_mm: number | null;
  total_quantity: number | null;
  unit: string;
  product_code_id: string;
  client_id: string | null;
  product_codes: { code: string } | null;
  company_clients?: { name: string } | null;
  profiles: { name: string } | null;
}

interface ProductCode { id: string; code: string; }
interface Client { id: string; name: string; }

export default function ProductionLogs() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [editEntry, setEditEntry] = useState<LogEntry | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editProductCodeId, setEditProductCodeId] = useState("");
  const [editClientId, setEditClientId] = useState("");
  const [editRolls, setEditRolls] = useState("");
  const [editQtyPerRoll, setEditQtyPerRoll] = useState("");
  const [editThickness, setEditThickness] = useState("");
  const [editUnit, setEditUnit] = useState("meters");
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [productCodes, setProductCodes] = useState<ProductCode[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("production_entries")
      .select("id, date, rolls_count, quantity_per_roll, thickness_mm, total_quantity, unit, product_code_id, client_id, product_codes(code), company_clients(name), profiles:worker_id(name)")
      .order("date", { ascending: false })
      .limit(500);

    if (error) {
      toast({ title: "Failed to load production logs", description: error.message, variant: "destructive" });
      setEntries([]);
    } else {
      setEntries((data as unknown as LogEntry[]) ?? []);
    }
    setSelectedIds(new Set());
    setLoading(false);
  };

  const fetchDropdowns = async () => {
    const [{ data: pc }, { data: cl }] = await Promise.all([
      supabase.from("product_codes").select("id, code").eq("status", "active").order("code"),
      supabase.from("company_clients").select("id, name").eq("status", "active").order("name"),
    ]);
    setProductCodes(pc ?? []);
    setClients(cl ?? []);
  };

  useEffect(() => { fetchEntries(); fetchDropdowns(); }, []);

  const filtered = entries.filter((e) => {
    const s = search.toLowerCase();
    const matchesSearch = !s || e.product_codes?.code?.toLowerCase().includes(s) || e.profiles?.name?.toLowerCase().includes(s);
    const entryDate = new Date(e.date);
    return matchesSearch && (!dateFrom || entryDate >= dateFrom) && (!dateTo || entryDate <= dateTo);
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((e) => e.id)));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exportCSV = () => {
    const rows = [
      ["Date", "Product Code", "Client", "Production Manager", "Rolls", "Qty/Roll", "Thickness (mm)", "Total", "Unit"],
      ...filtered.map((e) => [
        e.date, e.product_codes?.code ?? "", e.company_clients?.name ?? "",
        e.profiles?.name ?? "", e.rolls_count, e.quantity_per_roll,
        e.thickness_mm ?? "", e.total_quantity ?? "", e.unit,
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

  const openEdit = (entry: LogEntry) => {
    setEditEntry(entry);
    setEditDate(entry.date);
    setEditProductCodeId(entry.product_code_id);
    setEditClientId(entry.client_id ?? "");
    setEditRolls(String(entry.rolls_count));
    setEditQtyPerRoll(String(entry.quantity_per_roll));
    setEditThickness(entry.thickness_mm !== null ? String(entry.thickness_mm) : "");
    setEditUnit(entry.unit);
  };

  const handleSaveEdit = async () => {
    if (!editEntry) return;
    setSaving(true);
    const { error } = await supabase
      .from("production_entries")
      .update({
        date: editDate,
        product_code_id: editProductCodeId,
        client_id: editClientId || null,
        rolls_count: Number(editRolls),
        quantity_per_roll: Number(editQtyPerRoll),
        thickness_mm: editThickness ? Number(editThickness) : null,
        unit: editUnit,
      })
      .eq("id", editEntry.id);

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Entry updated successfully" });
      setEditEntry(null);
      fetchEntries();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from("production_entries").delete().eq("id", deleteId);
    setDeleting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Entry deleted" });
      setDeleteId(null);
      fetchEntries();
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("production_entries").delete().in("id", ids);
    setBulkDeleting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${ids.length} entries deleted` });
      setBulkDeleteOpen(false);
      fetchEntries();
    }
  };

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getFullYear()).slice(-2)}`;
  };

  const totalQty = (e: LogEntry) => e.total_quantity ?? e.rolls_count * e.quantity_per_roll;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Production Logs</h1>
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.size > 0 && (
            <Button onClick={() => setBulkDeleteOpen(true)} variant="destructive" size="sm" className="h-10 flex-1 sm:flex-none">
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete ({selectedIds.size})
            </Button>
          )}
          <Button onClick={exportCSV} variant="outline" size="sm" className="h-10 flex-1 sm:flex-none">
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product code or worker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-10 justify-start text-left font-normal flex-1 sm:flex-none", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="h-4 w-4 mr-2 shrink-0" />
                {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "From date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-10 justify-start text-left font-normal flex-1 sm:flex-none", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="h-4 w-4 mr-2 shrink-0" />
                {dateTo ? format(dateTo, "dd/MM/yyyy") : "To date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" className="h-10 px-3" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>

        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground">{filtered.length} entries{selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ""}</p>
        )}
      </div>

      {/* Mobile card list */}
      <div className="md:hidden border rounded-lg divide-y overflow-hidden">
        {loading ? (
          <p className="text-center py-10 text-muted-foreground text-sm">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground text-sm">No entries found</p>
        ) : (
          <>
            {/* Select-all row */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/40">
              <Checkbox checked={allFilteredSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
              <span className="text-xs text-muted-foreground">Select all ({filtered.length})</span>
            </div>

            {filtered.map((e) => (
              <div
                key={e.id}
                className={cn("px-4 py-3 space-y-1.5", selectedIds.has(e.id) && "bg-muted/30")}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.has(e.id)}
                    onCheckedChange={() => toggleSelect(e.id)}
                    aria-label="Select row"
                    className="mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">{e.product_codes?.code ?? "—"}</span>
                      <span className="text-sm font-bold text-primary whitespace-nowrap">
                        {Number(totalQty(e)).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{e.unit}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                      <span>{formatDate(e.date)}</span>
                      <span>{e.profiles?.name ?? "—"}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                      <span>{e.rolls_count} rolls × {e.quantity_per_roll}</span>
                      {e.thickness_mm != null && <span>· {e.thickness_mm} mm</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(e.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Desktop/tablet table */}
      <div className="hidden md:block border rounded-lg overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allFilteredSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Product Code</TableHead>
              <TableHead>Worker</TableHead>
              <TableHead className="text-right">Rolls</TableHead>
              <TableHead className="text-right">Qty/Roll</TableHead>
              <TableHead className="text-right">Thickness (mm)</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No entries found</TableCell>
              </TableRow>
            ) : (
              filtered.map((e) => (
                <TableRow key={e.id} data-state={selectedIds.has(e.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox checked={selectedIds.has(e.id)} onCheckedChange={() => toggleSelect(e.id)} aria-label="Select row" />
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{formatDate(e.date)}</TableCell>
                  <TableCell className="font-medium">{e.product_codes?.code ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{e.profiles?.name ?? "—"}</TableCell>
                  <TableCell className="text-right">{e.rolls_count}</TableCell>
                  <TableCell className="text-right">{e.quantity_per_roll}</TableCell>
                  <TableCell className="text-right">{e.thickness_mm ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right font-semibold">{Number(totalQty(e)).toLocaleString()}</TableCell>
                  <TableCell>{e.unit}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(e)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(e.id)} title="Delete" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editEntry} onOpenChange={(open) => !open && setEditEntry(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto w-[calc(100%-2rem)] sm:w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Production Entry</DialogTitle>
            <DialogDescription>Update the details for this production entry.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label>Product Code</Label>
              <Select value={editProductCodeId} onValueChange={setEditProductCodeId}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {productCodes.map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Client (optional)</Label>
              <Select value={editClientId} onValueChange={setEditClientId}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Rolls Count</Label>
                <Input type="number" value={editRolls} onChange={(e) => setEditRolls(e.target.value)} min={1} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Qty per Roll</Label>
                <Input type="number" value={editQtyPerRoll} onChange={(e) => setEditQtyPerRoll(e.target.value)} min={0} step="0.01" className="h-12" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Thickness (mm)</Label>
                <Input type="number" value={editThickness} onChange={(e) => setEditThickness(e.target.value)} min={0} step="0.01" placeholder="e.g. 0.5" className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={editUnit} onValueChange={setEditUnit}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meters">Meters</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setEditEntry(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="w-full sm:w-auto">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="w-[calc(100%-2rem)] sm:w-full max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this production entry? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent className="w-[calc(100%-2rem)] sm:w-full max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Entries</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete {selectedIds.size} production entries? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {bulkDeleting ? "Deleting..." : `Delete ${selectedIds.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
