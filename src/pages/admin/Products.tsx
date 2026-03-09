import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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

  // Edit state
  const [editCatDialogOpen, setEditCatDialogOpen] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState("");

  const [editCodeDialogOpen, setEditCodeDialogOpen] = useState(false);
  const [editCode, setEditCode] = useState<ProductCode | null>(null);
  const [editCodeValue, setEditCodeValue] = useState("");
  const [editCodeCat, setEditCodeCat] = useState("");

  // Delete state
  const [deleteCatOpen, setDeleteCatOpen] = useState(false);
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [deleteCodeOpen, setDeleteCodeOpen] = useState(false);
  const [deleteCodeId, setDeleteCodeId] = useState<string | null>(null);

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

  // Edit handlers
  const openEditCategory = (cat: Category) => {
    setEditCat(cat);
    setEditCatName(cat.name);
    setEditCatDialogOpen(true);
  };

  const saveEditCategory = async () => {
    if (!editCat || !editCatName.trim()) return;
    const { error } = await supabase.from("product_categories").update({ name: editCatName.trim() }).eq("id", editCat.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Category updated" });
    setEditCatDialogOpen(false);
    fetchData();
  };

  const openEditCode = (code: ProductCode) => {
    setEditCode(code);
    setEditCodeValue(code.code);
    setEditCodeCat(code.category_id);
    setEditCodeDialogOpen(true);
  };

  const saveEditCode = async () => {
    if (!editCode || !editCodeValue.trim() || !editCodeCat) return;
    const { error } = await supabase.from("product_codes").update({ code: editCodeValue.trim(), category_id: editCodeCat }).eq("id", editCode.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Product code updated" });
    setEditCodeDialogOpen(false);
    fetchData();
  };

  // Delete handlers
  const confirmDeleteCategory = async () => {
    if (!deleteCatId) return;
    const { error } = await supabase.from("product_categories").delete().eq("id", deleteCatId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Category deleted" });
    setDeleteCatOpen(false);
    setDeleteCatId(null);
    fetchData();
  };

  const confirmDeleteCode = async () => {
    if (!deleteCodeId) return;
    const { error } = await supabase.from("product_codes").delete().eq("id", deleteCodeId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Product code deleted" });
    setDeleteCodeOpen(false);
    setDeleteCodeId(null);
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
        {/* Categories Card */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Categories ({categories.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                <span className="font-medium text-sm">{c.name}</span>
                <div className="flex items-center gap-1">
                  <Badge
                    variant={c.status === "active" ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => toggleStatus("product_categories", c.id, c.status)}
                  >
                    {c.status}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCategory(c)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { setDeleteCatId(c.id); setDeleteCatOpen(true); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {categories.length === 0 && <p className="text-sm text-muted-foreground">No categories yet</p>}
          </CardContent>
        </Card>

        {/* Product Codes Card */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Product Codes ({codes.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {codes.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                <div>
                  <span className="font-medium text-sm">{c.code}</span>
                  <span className="text-xs text-muted-foreground ml-2">{c.product_categories?.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge
                    variant={c.status === "active" ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => toggleStatus("product_codes", c.id, c.status)}
                  >
                    {c.status}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCode(c)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { setDeleteCodeId(c.id); setDeleteCodeOpen(true); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {codes.length === 0 && <p className="text-sm text-muted-foreground">No product codes yet</p>}
          </CardContent>
        </Card>
      </div>

      {/* Edit Category Dialog */}
      <Dialog open={editCatDialogOpen} onOpenChange={setEditCatDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Category Name</Label><Input value={editCatName} onChange={(e) => setEditCatName(e.target.value)} /></div>
            <Button onClick={saveEditCategory} className="w-full bg-secondary hover:bg-secondary/90">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Product Code Dialog */}
      <Dialog open={editCodeDialogOpen} onOpenChange={setEditCodeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Product Code</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Category</Label>
              <Select value={editCodeCat} onValueChange={setEditCodeCat}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories.filter(c => c.status === "active").map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Product Code</Label><Input value={editCodeValue} onChange={(e) => setEditCodeValue(e.target.value)} /></div>
            <Button onClick={saveEditCode} className="w-full bg-secondary hover:bg-secondary/90">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={deleteCatOpen} onOpenChange={setDeleteCatOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this category. Product codes under it may become orphaned. Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Product Code Confirmation */}
      <AlertDialog open={deleteCodeOpen} onOpenChange={setDeleteCodeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product Code</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this product code. Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCode} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
