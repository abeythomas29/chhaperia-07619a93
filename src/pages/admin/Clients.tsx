import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Clients() {
  const [clients, setClients] = useState<{ id: string; name: string; status: string }[]>([]);
  const [newName, setNewName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetch = async () => {
    const { data } = await supabase.from("company_clients").select("*").order("name");
    setClients(data ?? []);
  };

  useEffect(() => { fetch(); }, []);

  const addClient = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("company_clients").insert({ name: newName.trim() });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Client added" });
    setNewName("");
    setDialogOpen(false);
    fetch();
  };

  const toggleStatus = async (id: string, current: string) => {
    await supabase.from("company_clients").update({ status: current === "active" ? "inactive" : "active" }).eq("id", id);
    fetch();
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
              <Badge variant={c.status === "active" ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleStatus(c.id, c.status)}>
                {c.status}
              </Badge>
            </div>
          ))}
          {clients.length === 0 && <p className="text-sm text-muted-foreground">No clients yet</p>}
        </CardContent>
      </Card>
    </div>
  );
}
