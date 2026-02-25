import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  status: string;
}

interface ProductCode {
  id: string;
  code: string;
  category_id: string;
  status: string;
  product_categories: { name: string } | null;
}

export default function Products() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [codes, setCodes] = useState<ProductCode[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newCode, setNewCode] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    const [catRes, codeRes] = await Promise.all([
      supabase.from("product_categories").select("*").order("name"),
      supabase.from("product_codes").select("*, product_categories(name)").order("code"),
    ]);
    setCategories(catRes.data ?? []);
    setCodes((codeRes.data as unknown as ProductCode[]) ?? []);
  };

  useEffect(() => { fetchData(); }, []);

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    const { error } = await supabase.from("product_categories").insert({ name: newCategory.trim() });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Category added" });
    setNewCategory("");
    setCatDialogOpen(false);
    fetchData();
  };

  const addCode = async () => {
    if (!newCode.trim() || !selectedCat) return;
    const { error } = await supabase.from("product_codes").insert({ code: newCode.trim(), category_id: selectedCat });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Product code added" });
    setNewCode("");
    setSelectedCat("");
    setCodeDialogOpen(false);
    fetchData();
  };

  const toggleStatus = async (table: "product_categories" | "product_codes", id: string, current: string) => {
    const newStatus = current === "active" ? "inactive" : "active";
    await supabase.from(table).update({ status: newStatus }).eq("id", id);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Product Management</h1>
        <div className="flex gap-2">
          <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Category</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Category Name</Label><Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Semiconductor Woven Water Blocking Tape" /></div>
                <Button onClick={addCategory} className="w-full bg-secondary hover:bg-secondary/90">Add</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-secondary hover:bg-secondary/90"><Plus className="h-4 w-4 mr-1" /> Product Code</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Product Code</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Category</Label>
                  <Select value={selectedCat} onValueChange={setSelectedCat}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{categories.filter(c => c.status === "active").map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Product Code</Label><Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="e.g. CHSCWWBT 18" /></div>
                <Button onClick={addCode} className="w-full bg-secondary hover:bg-secondary/90">Add</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Categories ({categories.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                <span className="font-medium text-sm">{c.name}</span>
                <Badge
                  variant={c.status === "active" ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => toggleStatus("product_categories", c.id, c.status)}
                >
                  {c.status}
                </Badge>
              </div>
            ))}
            {categories.length === 0 && <p className="text-sm text-muted-foreground">No categories yet</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Product Codes ({codes.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {codes.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                <div>
                  <span className="font-medium text-sm">{c.code}</span>
                  <span className="text-xs text-muted-foreground ml-2">{c.product_categories?.name}</span>
                </div>
                <Badge
                  variant={c.status === "active" ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => toggleStatus("product_codes", c.id, c.status)}
                >
                  {c.status}
                </Badge>
              </div>
            ))}
            {codes.length === 0 && <p className="text-sm text-muted-foreground">No product codes yet</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
