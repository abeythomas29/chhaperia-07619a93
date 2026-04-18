import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, ArrowDownToLine, Search, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  status: string;
}

interface StockEntry {
  id: string;
  raw_material_id: string;
  quantity: number;
  date: string;
  lot_number: string | null;
  supplier: string | null;
  pallets: number | null;
  notes: string | null;
  added_by: string;
  created_at: string;
}

export default function RawMaterials() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [stockEntries, setStockEntries] = useState<(StockEntry & { material_name?: string; material_unit?: string; person_name?: string })[]>([]);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("kg");

  const [editMaterial, setEditMaterial] = useState<RawMaterial | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("");

  const [stockMaterialId, setStockMaterialId] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [stockDate, setStockDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [stockLot, setStockLot] = useState("");
  const [stockSupplier, setStockSupplier] = useState("");
  const [stockPallets, setStockPallets] = useState("");
  const [stockNotes, setStockNotes] = useState("");

  const fetchData = async () => {
    const [matRes, entryRes] = await Promise.all([
      supabase.from("raw_materials").select("*").order("name"),
      supabase.from("raw_material_stock_entries").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setMaterials(matRes.data ?? []);

    const entries = entryRes.data ?? [];
    // Resolve names
    const materialMap = new Map((matRes.data ?? []).map((m: RawMaterial) => [m.id, m]));
    const userIds = [...new Set(entries.map((e: StockEntry) => e.added_by))];
    let profileMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", userIds);
      profileMap = new Map((profiles ?? []).map((p: { user_id: string; name: string }) => [p.user_id, p.name]));
    }
    setStockEntries(entries.map((e: StockEntry) => ({
      ...e,
      material_name: materialMap.get(e.raw_material_id)?.name ?? "Unknown",
      material_unit: materialMap.get(e.raw_material_id)?.unit ?? "",
      person_name: profileMap.get(e.added_by) ?? "Unknown",
    })));
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = materials.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const addMaterial = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("raw_materials").insert({ name: newName.trim(), unit: newUnit });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Raw material added" });
    setAddOpen(false);
    setNewName("");
    setNewUnit("kg");
    fetchData();
  };

  const saveEdit = async () => {
    if (!editMaterial || !editName.trim()) return;
    const { error } = await supabase.from("raw_materials").update({ name: editName.trim(), unit: editUnit }).eq("id", editMaterial.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Updated" });
    setEditOpen(false);
    setEditMaterial(null);
    fetchData();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    // Check dependencies
    const { count } = await supabase.from("product_recipes").select("id", { count: "exact", head: true }).eq("raw_material_id", deleteId);
    if ((count ?? 0) > 0) {
      toast({ title: "Cannot delete", description: "This material is used in product recipes.", variant: "destructive" });
      setDeleteId(null);
      return;
    }
    const { error } = await supabase.from("raw_materials").delete().eq("id", deleteId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deleted" });
    setDeleteId(null);
    fetchData();
  };

  const addStockEntry = async () => {
    if (!stockMaterialId || !stockQty || !user) return;
    const { error } = await supabase.from("raw_material_stock_entries").insert({
      raw_material_id: stockMaterialId,
      quantity: Number(stockQty),
      date: stockDate,
      lot_number: stockLot.trim() || null,
      supplier: stockSupplier.trim() || null,
      pallets: stockPallets ? Number(stockPallets) : null,
      notes: stockNotes || null,
      added_by: user.id,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Stock added" });
    setStockOpen(false);
    setStockMaterialId("");
    setStockQty("");
    setStockLot("");
    setStockSupplier("");
    setStockPallets("");
    setStockNotes("");
    fetchData();
  };

  const openEdit = (m: RawMaterial) => {
    setEditMaterial(m);
    setEditName(m.name);
    setEditUnit(m.unit);
    setEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Raw Materials</h1>
        <div className="flex gap-2">
          <Dialog open={stockOpen} onOpenChange={setStockOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><ArrowDownToLine className="h-4 w-4 mr-2" />Add Stock</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Stock (Purchase)</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Raw Material</Label>
                  <Select value={stockMaterialId} onValueChange={setStockMaterialId}>
                    <SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger>
                    <SelectContent>{materials.filter(m => m.status === "active").map((m) => <SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input type="number" min="0" step="0.01" value={stockQty} onChange={(e) => setStockQty(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={stockDate} onChange={(e) => setStockDate(e.target.value)} />
                </div>
                <div>
                  <Label>Lot Number</Label>
                  <Input value={stockLot} onChange={(e) => setStockLot(e.target.value)} placeholder="e.g. LOT-2025-001" />
                </div>
                <div>
                  <Label>Supplier / From</Label>
                  <Input value={stockSupplier} onChange={(e) => setStockSupplier(e.target.value)} placeholder="e.g. Combined Origins Ltd" />
                </div>
                <div>
                  <Label>Pallets / Pieces</Label>
                  <Input type="number" min="0" step="1" value={stockPallets} onChange={(e) => setStockPallets(e.target.value)} placeholder="e.g. 29" />
                </div>
                <div>
                  <Label>Notes (optional)</Label>
                  <Input value={stockNotes} onChange={(e) => setStockNotes(e.target.value)} placeholder="e.g. invoice #" />
                </div>
                <Button onClick={addStockEntry} className="w-full bg-secondary hover:bg-secondary/90">Add Stock</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-secondary hover:bg-secondary/90"><Plus className="h-4 w-4 mr-2" />Add Material</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Raw Material</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Name</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. ALUMINIUM FOIL 009MIC" /></div>
                <div>
                  <Label>Unit</Label>
                  <Select value={newUnit} onValueChange={setNewUnit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      <SelectItem value="meters">Meters</SelectItem>
                      <SelectItem value="rolls">Rolls</SelectItem>
                      <SelectItem value="pieces">Pieces</SelectItem>
                      <SelectItem value="liters">Liters</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addMaterial} className="w-full bg-secondary hover:bg-secondary/90">Add</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search materials..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Inventory ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No raw materials found</TableCell></TableRow>
              ) : filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.unit}</TableCell>
                  <TableCell className="text-right font-mono">{m.current_stock.toLocaleString()}</TableCell>
                  <TableCell><Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Stock Entries</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Pallets</TableHead>
                <TableHead>Lot No.</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Added By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockEntries.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No stock entries yet</TableCell></TableRow>
              ) : stockEntries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{format(new Date(e.date), "dd/MM/yy")}</TableCell>
                  <TableCell>{e.material_name}</TableCell>
                  <TableCell>{e.supplier ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{e.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{e.material_unit}</TableCell>
                  <TableCell className="text-right font-mono">{e.pallets ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{e.lot_number ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{e.notes ?? "—"}</TableCell>
                  <TableCell>{e.person_name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Raw Material</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div>
              <Label>Unit</Label>
              <Select value={editUnit} onValueChange={setEditUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="meters">Meters</SelectItem>
                  <SelectItem value="rolls">Rolls</SelectItem>
                  <SelectItem value="pieces">Pieces</SelectItem>
                  <SelectItem value="liters">Liters</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={saveEdit} className="w-full bg-secondary hover:bg-secondary/90">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Raw Material?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
