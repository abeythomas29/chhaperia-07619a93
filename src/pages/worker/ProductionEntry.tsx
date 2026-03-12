import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function ProductionEntry() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [productCodes, setProductCodes] = useState<{ id: string; code: string; category_id: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    product_code_id: "",
    client_id: "",
    rolls_count: "",
    quantity_per_roll: "",
    unit: "meters",
    thickness_mm: "",
  });

  const [newProductCode, setNewProductCode] = useState("");
  const [newProductCat, setNewProductCat] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fetchData = async () => {
    const [codesRes, catsRes, clientsRes] = await Promise.all([
      supabase.from("product_codes").select("id, code, category_id").eq("status", "active").order("code"),
      supabase.from("product_categories").select("id, name").eq("status", "active").order("name"),
      supabase.from("company_clients").select("id, name").eq("status", "active").order("name"),
    ]);
    setProductCodes(codesRes.data ?? []);
    setCategories(catsRes.data ?? []);
    setClients(clientsRes.data ?? []);
  };

  useEffect(() => { fetchData(); }, []);

  const totalQuantity = (Number(form.rolls_count) || 0) * (Number(form.quantity_per_roll) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.product_code_id || !form.client_id || !form.rolls_count || !form.quantity_per_roll) return;
    setSubmitting(true);

    const insertPayload: Record<string, unknown> = {
      product_code_id: form.product_code_id,
      client_id: form.client_id,
      date: form.date,
      worker_id: user.id,
      rolls_count: Number(form.rolls_count),
      quantity_per_roll: Number(form.quantity_per_roll),
      unit: form.unit,
    };
    if (form.thickness_mm) {
      insertPayload.thickness_mm = Number(form.thickness_mm);
    }

    const { error } = await supabase.from("production_entries").insert(insertPayload as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
      setTimeout(() => {
        setForm({ date: format(new Date(), "yyyy-MM-dd"), product_code_id: "", client_id: "", rolls_count: "", quantity_per_roll: "", unit: "meters", thickness_mm: "" });
        setSubmitted(false);
      }, 2000);
    }
    setSubmitting(false);
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    const { data, error } = await supabase.from("product_categories").insert({ name: newCategoryName.trim() }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Category added" });
    setCategoryDialogOpen(false);
    setNewCategoryName("");
    await fetchData();
    if (data) setNewProductCat(data.id);
  };

  const addProductCode = async () => {
    if (!newProductCode.trim() || !newProductCat) return;
    const { data, error } = await supabase.from("product_codes").insert({ code: newProductCode.trim(), category_id: newProductCat }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Product code added" });
    setProductDialogOpen(false);
    setNewProductCode("");
    setNewProductCat("");
    await fetchData();
    if (data) setForm((f) => ({ ...f, product_code_id: data.id }));
  };

  const addClient = async () => {
    if (!newClientName.trim()) return;
    const { data, error } = await supabase.from("company_clients").insert({ name: newClientName.trim() }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Client added" });
    setClientDialogOpen(false);
    setNewClientName("");
    await fetchData();
    if (data) setForm((f) => ({ ...f, client_id: data.id }));
  };

  if (submitted) {
    return (
      <Card className="max-w-lg mx-auto mt-8">
        <CardContent className="flex flex-col items-center py-12">
          <CheckCircle className="h-16 w-16 text-secondary mb-4" />
          <h2 className="text-xl font-bold">Entry Submitted!</h2>
          <p className="text-muted-foreground mt-1">Production entry recorded successfully.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>New Production Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Category</Label>
              <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-secondary"><Plus className="h-3 w-3 mr-1" /> Add New</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Product Category</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Category Name</Label><Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="e.g. Semiconductor Woven Water Blocking Tape" /></div>
                    <Button type="button" onClick={addCategory} className="w-full bg-secondary hover:bg-secondary/90">Add</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Select value={form.product_code_id ? productCodes.find(p => p.id === form.product_code_id)?.category_id ?? "" : ""} onValueChange={() => {}}>
              <SelectTrigger><SelectValue placeholder="Category (auto from product code)" /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Product Code</Label>
              <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-secondary"><Plus className="h-3 w-3 mr-1" /> Add New</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Product Code</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Category</Label>
                      <Select value={newProductCat} onValueChange={setNewProductCat}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Code</Label><Input value={newProductCode} onChange={(e) => setNewProductCode(e.target.value)} placeholder="e.g. CHSCWWBT 18" /></div>
                    <Button type="button" onClick={addProductCode} className="w-full bg-secondary hover:bg-secondary/90">Add</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Select value={form.product_code_id} onValueChange={(v) => setForm({ ...form, product_code_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select product code" /></SelectTrigger>
              <SelectContent>{productCodes.map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Client / Customer</Label>
              <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-secondary"><Plus className="h-3 w-3 mr-1" /> Add New</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Client</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Client Name</Label><Input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Client name" /></div>
                    <Button type="button" onClick={addClient} className="w-full bg-secondary hover:bg-secondary/90">Add</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Number of Rolls</Label>
              <Input type="number" min="1" value={form.rolls_count} onChange={(e) => setForm({ ...form, rolls_count: e.target.value })} placeholder="0" />
            </div>
            <div>
              <Label>Quantity per Roll</Label>
              <Input type="number" min="0" step="0.01" value={form.quantity_per_roll} onChange={(e) => setForm({ ...form, quantity_per_roll: e.target.value })} placeholder="0" />
            </div>
          </div>

          <div>
            <Label>Thickness (mm)</Label>
            <Input type="number" min="0" step="0.01" value={form.thickness_mm} onChange={(e) => setForm({ ...form, thickness_mm: e.target.value })} placeholder="e.g. 0.25" />
          </div>

          <div>
            <Label>Unit</Label>
            <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="meters">Meters</SelectItem>
                <SelectItem value="kg">Kilograms (kg)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Quantity</p>
            <p className="text-3xl font-bold text-primary">{totalQuantity.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">{form.unit}</span></p>
          </div>

          <Button type="submit" disabled={submitting} className="w-full bg-secondary hover:bg-secondary/90 text-lg py-6">
            {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Submit Entry
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
