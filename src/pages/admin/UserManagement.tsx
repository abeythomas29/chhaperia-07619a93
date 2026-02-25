import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRow {
  id: string;
  name: string;
  employee_id: string;
  username: string;
  status: string;
  user_id: string;
  role?: AppRole;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", employee_id: "", email: "", password: "", role: "worker" as AppRole });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("name");
    const { data: roles } = await supabase.from("user_roles").select("*");

    const roleMap = new Map<string, AppRole>();
    roles?.forEach((r) => roleMap.set(r.user_id, r.role));

    setUsers(
      (profiles ?? []).map((p) => ({
        ...p,
        role: roleMap.get(p.user_id),
      }))
    );
  };

  useEffect(() => { fetchUsers(); }, []);

  const createUser = async () => {
    if (!form.name || !form.employee_id || !form.email || !form.password) return;
    setSubmitting(true);

    // Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (authError || !authData.user) {
      toast({ title: "Error", description: authError?.message ?? "Failed to create user", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const userId = authData.user.id;

    // Create profile
    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: userId,
      name: form.name,
      employee_id: form.employee_id,
      username: form.email,
    });

    if (profileError) {
      toast({ title: "Error creating profile", description: profileError.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Assign role
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: form.role,
    });

    if (roleError) {
      toast({ title: "Error assigning role", description: roleError.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    toast({ title: "User created successfully" });
    setForm({ name: "", employee_id: "", email: "", password: "", role: "worker" });
    setDialogOpen(false);
    setSubmitting(false);
    fetchUsers();
  };

  const toggleStatus = async (userId: string, current: string) => {
    await supabase.from("profiles").update({ status: current === "active" ? "inactive" : "active" }).eq("user_id", userId);
    fetchUsers();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-secondary hover:bg-secondary/90"><Plus className="h-4 w-4 mr-1" /> Add User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Employee ID</Label><Input value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div><Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worker">Worker</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createUser} disabled={submitting} className="w-full bg-secondary hover:bg-secondary/90">Create User</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.employee_id}</TableCell>
                <TableCell>{u.username}</TableCell>
                <TableCell><Badge variant="outline">{u.role ?? "—"}</Badge></TableCell>
                <TableCell>
                  <Badge
                    variant={u.status === "active" ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => toggleStatus(u.user_id, u.status)}
                  >
                    {u.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
