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
import { useToast } from "@/hooks/use-toast";

export default function Clients() {
  const [clients, setClients] = useState<{ id: string; name: string; status: string }[]>([]);
  const [newName, setNewName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<{ id: string; name: string } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteClient, setDeleteClient] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  const fetchClients = async () => {
    const { data } = await supabase.from("company_clients").select("*").order("name");
    setClients(data ?? []);
  };

  useEffect(() => { fetchClients(); }, []);

  const addClient = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("company_clients").insert({ name: newName.trim() });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Client added" });
    setNewName("");
    setDialogOpen(false);
    fetchClients();
  };

  const toggleStatus = async (id: string, current: string) => {
    await supabase.from("company_clients").update({ status: current === "active" ? "inactive" : "active" }).eq("id", id);
    fetchClients();
  };

  const handleEdit = async () => {
    if (!editClient || !editClient.name.trim()) return;
    const { error } = await supabase.from("company_clients").update({ name: editClient.name.trim() }).eq("id", editClient.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Client updated" });
    setEditDialogOpen(false);
    setEditClient(null);
    fetchClients();
  };

  const handleDelete = async () => {
    if (!deleteClient) return;
    const { error } = await supabase.from("company_clients").delete().eq("id", deleteClient.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Client deleted" });
    setDeleteClient(null);
    fetchClients();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Client Management</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-secondary hover:bg-secondary/90"><Plus className="h-4 w-4 mr-1" /> Add Client</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Client</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Client Name</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Client / Customer name" /></div>
              <Button onClick={addClient} className="w-full bg-secondary hover:bg-secondary/90">Add</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>All Clients ({clients.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {clients.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
              <span className="font-medium text-sm">{c.name}</span>
              <div className="flex items-center gap-2">
                <Badge variant={c.status === "active" ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleStatus(c.id, c.status)}>
                  {c.status}
                </Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditClient({ id: c.id, name: c.name }); setEditDialogOpen(true); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteClient({ id: c.id, name: c.name })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {clients.length === 0 && <p className="text-sm text-muted-foreground">No clients yet</p>}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditClient(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Client Name</Label><Input value={editClient?.name ?? ""} onChange={(e) => setEditClient(prev => prev ? { ...prev, name: e.target.value } : null)} /></div>
            <Button onClick={handleEdit} className="w-full bg-secondary hover:bg-secondary/90">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteClient} onOpenChange={(open) => { if (!open) setDeleteClient(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{deleteClient?.name}"? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}