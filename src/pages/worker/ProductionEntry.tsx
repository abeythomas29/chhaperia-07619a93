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
import { saveOfflineEntry } from "@/lib/offlineSync";
import { useTranslation } from "react-i18next";

export default function ProductionEntry() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [productCodes, setProductCodes] = useState<{ id: string; code: string; category_id: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    product_code_id: "",
    client_id: "",
    rolls_count: "",
    quantity_per_roll: "",
    thickness: "",
    unit: "meters",
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
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const fetchData = async () => {
    if (!navigator.onLine) {
      const cachedCodes = localStorage.getItem("cached_product_codes");
      const cachedCats = localStorage.getItem("cached_product_categories");
      const cachedClients = localStorage.getItem("cached_company_clients");
      if (cachedCodes) setProductCodes(JSON.parse(cachedCodes));
      if (cachedCats) setCategories(JSON.parse(cachedCats));
      if (cachedClients) setClients(JSON.parse(cachedClients));
      return;
    }

    const [codesRes, catsRes, clientsRes] = await Promise.all([
      supabase.from("product_codes").select("id, code, category_id").eq("status", "active").order("code"),
      supabase.from("product_categories").select("id, name").eq("status", "active").order("name"),
      supabase.from("company_clients").select("id, name").eq("status", "active").order("name"),
    ]);

    const fetchedCodes = codesRes.data ?? [];
    const fetchedCats = catsRes.data ?? [];
    const fetchedClients = clientsRes.data ?? [];

    setProductCodes(fetchedCodes);
    setCategories(fetchedCats);
    setClients(fetchedClients);

    localStorage.setItem("cached_product_codes", JSON.stringify(fetchedCodes));
    localStorage.setItem("cached_product_categories", JSON.stringify(fetchedCats));
    localStorage.setItem("cached_company_clients", JSON.stringify(fetchedClients));
  };

  useEffect(() => { fetchData(); }, []);

  const totalQuantity = (Number(form.rolls_count) || 0) * (Number(form.quantity_per_roll) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.product_code_id || !form.client_id || !form.rolls_count || !form.quantity_per_roll) return;
    setSubmitting(true);

    const payload = {
      product_code_id: form.product_code_id,
      client_id: form.client_id,
      date: form.date,
      worker_id: user.id,
      rolls_count: Number(form.rolls_count),
      quantity_per_roll: Number(form.quantity_per_roll),
      thickness_mm: form.thickness ? Number(form.thickness) : null,
      unit: form.unit,
    };

    if (!navigator.onLine) {
      saveOfflineEntry(payload);
      toast({ title: "Offline mode", description: "Entry saved locally. Will sync when online." });
      setSubmitted(true);
      setTimeout(() => {
        setForm({ date: format(new Date(), "yyyy-MM-dd"), product_code_id: "", client_id: "", rolls_count: "", quantity_per_roll: "", thickness: "", unit: "meters" });
        setSubmitted(false);
      }, 2000);
      setSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.from("production_entries").insert(payload);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setSubmitted(true);
        setTimeout(() => {
          setForm({ date: format(new Date(), "yyyy-MM-dd"), product_code_id: "", client_id: "", rolls_count: "", quantity_per_roll: "", thickness: "", unit: "meters" });
          setSubmitted(false);
        }, 2000);
      }
    } catch (err: any) {
      // Fallback for network error during fetch
      saveOfflineEntry(payload);
      toast({ title: "Network error", description: "Entry saved locally. Will sync when online." });
      setSubmitted(true);
      setTimeout(() => {
        setForm({ date: format(new Date(), "yyyy-MM-dd"), product_code_id: "", client_id: "", rolls_count: "", quantity_per_roll: "", thickness: "", unit: "meters" });
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
          <h2 className="text-xl font-bold">{t('entry_submitted')}</h2>
          <p className="text-muted-foreground mt-1">{t('entry_recorded')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">{t('new_production_entry')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-lg">{t('date')}</Label>
            <Input className="h-14 text-lg" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-lg">{t('category')}</Label>
              <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-sm text-secondary"><Plus className="h-4 w-4 mr-1" /> {t('add_new')}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="text-xl">{t('add_product_category')}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label className="text-lg">{t('category_name')}</Label><Input className="h-14 text-lg" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="e.g. Semiconductor Woven Water Blocking Tape" /></div>
                    <Button type="button" onClick={addCategory} className="w-full h-14 text-lg bg-secondary hover:bg-secondary/90">{t('add')}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Select value={selectedCategoryId} onValueChange={(v) => { setSelectedCategoryId(v); setForm(f => ({ ...f, product_code_id: "" })); }}>
              <SelectTrigger className="h-14 text-lg"><SelectValue placeholder={t('select_category') || 'Select Category'} /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem className="text-lg py-3" key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-lg">{t('product_code')}</Label>
              <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-sm text-secondary"><Plus className="h-4 w-4 mr-1" /> {t('add_new')}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="text-xl">{t('product_code')}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-lg">{t('category')}</Label>
                      <Select value={newProductCat} onValueChange={setNewProductCat}>
                        <SelectTrigger className="h-14 text-lg"><SelectValue placeholder={t('select_category')} /></SelectTrigger>
                        <SelectContent>{categories.map((c) => <SelectItem className="text-lg py-3" key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-lg">{t('code')}</Label><Input className="h-14 text-lg" value={newProductCode} onChange={(e) => setNewProductCode(e.target.value)} placeholder="e.g. CHSCWWBT 18" /></div>
                    <Button type="button" onClick={addProductCode} className="w-full h-14 text-lg bg-secondary hover:bg-secondary/90">{t('add')}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Select value={form.product_code_id} onValueChange={(v) => {
              setForm({ ...form, product_code_id: v });
              const codeCat = productCodes.find(p => p.id === v)?.category_id;
              if (codeCat && codeCat !== selectedCategoryId) {
                setSelectedCategoryId(codeCat);
              }
            }}>
              <SelectTrigger className="h-14 text-lg"><SelectValue placeholder={t('select_product_code')} /></SelectTrigger>
              <SelectContent>
                {(selectedCategoryId ? productCodes.filter(p => p.category_id === selectedCategoryId) : productCodes).map((p) => (
                  <SelectItem className="text-lg py-3" key={p.id} value={p.id}>{p.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-lg">{t('client_customer')}</Label>
              <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-sm text-secondary"><Plus className="h-4 w-4 mr-1" /> {t('add_new')}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="text-xl">{t('add_client')}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label className="text-lg">{t('client_name')}</Label><Input className="h-14 text-lg" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Client name" /></div>
                    <Button type="button" onClick={addClient} className="w-full h-14 text-lg bg-secondary hover:bg-secondary/90">{t('add')}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
              <SelectTrigger className="h-14 text-lg"><SelectValue placeholder={t('select_client')} /></SelectTrigger>
              <SelectContent>{clients.map((c) => <SelectItem className="text-lg py-3" key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-lg">{t('number_of_rolls')}</Label>
              <Input className="h-14 text-lg" type="number" min="1" value={form.rolls_count} onChange={(e) => setForm({ ...form, rolls_count: e.target.value })} placeholder="0" />
            </div>
            <div>
              <Label className="text-lg">{t('quantity_per_roll')}</Label>
              <Input className="h-14 text-lg" type="number" min="0" step="0.01" value={form.quantity_per_roll} onChange={(e) => setForm({ ...form, quantity_per_roll: e.target.value })} placeholder="0" />
            </div>
            <div className="col-span-2">
              <Label className="text-lg">{t('thickness') || "Thickness"}</Label>
              <Input className="h-14 text-lg" type="number" min="0" step="any" value={form.thickness} onChange={(e) => setForm({ ...form, thickness: e.target.value })} placeholder="e.g. 0.5" />
            </div>
          </div>

          <div>
            <Label className="text-lg">{t('unit')}</Label>
            <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
              <SelectTrigger className="h-14 text-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem className="text-lg py-3" value="meters">{t('meters')}</SelectItem>
                <SelectItem className="text-lg py-3" value="kg">{t('kilograms')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">{t('total_quantity')}</p>
            <p className="text-3xl font-bold text-primary">{totalQuantity.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">{form.unit === 'meters' ? t('meters') : form.unit === 'kg' ? t('kilograms') : form.unit}</span></p>
          </div>

          <Button type="submit" disabled={submitting} className="w-full h-16 bg-secondary hover:bg-secondary/90 text-xl py-6 rounded-xl">
            {submitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : null}
            {t('submit_entry')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
