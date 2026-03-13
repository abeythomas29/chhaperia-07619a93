import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ name: "", employee_id: "", email: "", password: "", role: "worker" as AppRole });
  const [editForm, setEditForm] = useState({ name: "", employee_id: "", username: "", role: "worker" as AppRole });
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

    let userId: string | null = null;

    // Try to sign up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (authError) {
      if (authError.message?.toLowerCase().includes("already registered")) {
        // User exists in auth but may be missing profile/role
        // Check if profile already exists
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("username", form.email)
          .maybeSingle();

        if (existingProfile) {
          toast({ title: "User already exists", description: "This user already has a profile. Check the user list.", variant: "destructive" });
          setSubmitting(false);
          return;
        }

        // Look up user_id via the admin edge function
        const { data: lookupData, error: lookupError } = await supabase.functions.invoke("admin-update-user", {
          body: { action: "lookup_by_email", email: form.email },
        });

        if (lookupError || lookupData?.error || !lookupData?.user_id) {
          toast({ title: "Error", description: lookupData?.error ?? lookupError?.message ?? "Could not find existing user", variant: "destructive" });
          setSubmitting(false);
          return;
        }

        userId = lookupData.user_id;
      } else {
        toast({ title: "Error", description: authError.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
    } else {
      userId = authData.user?.id ?? null;
    }

    if (!userId) {
      toast({ title: "Error", description: "Failed to get user ID", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingProfile) {
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
    }

    // Check if role already exists
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingRole) {
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: form.role,
      });

      if (roleError) {
        toast({ title: "Error assigning role", description: roleError.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
    }

    toast({ title: "User created successfully" });
    setForm({ name: "", employee_id: "", email: "", password: "", role: "worker" });
    setDialogOpen(false);
    setSubmitting(false);
    fetchUsers();
  };

  const openEdit = (user: UserRow) => {
    setSelectedUser(user);
    setEditForm({ name: user.name, employee_id: user.employee_id, username: user.username, role: user.role ?? "worker" });
    setEditDialogOpen(true);
  };

  const updateUser = async () => {
    if (!selectedUser || !editForm.name || !editForm.employee_id) return;
    setSubmitting(true);

    // Update auth email if changed
    if (editForm.username !== selectedUser.username) {
      const { data, error: fnError } = await supabase.functions.invoke("admin-update-user", {
        body: { user_id: selectedUser.user_id, email: editForm.username },
      });
      if (fnError || data?.error) {
        toast({ title: "Error updating auth email", description: data?.error ?? fnError?.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ name: editForm.name, employee_id: editForm.employee_id, username: editForm.username })
      .eq("user_id", selectedUser.user_id);

    if (profileError) {
      toast({ title: "Error updating profile", description: profileError.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const { error: roleError } = await supabase
      .from("user_roles")
      .update({ role: editForm.role })
      .eq("user_id", selectedUser.user_id);

    if (roleError) {
      toast({ title: "Error updating role", description: roleError.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    toast({ title: "User updated successfully" });
    setEditDialogOpen(false);
    setSelectedUser(null);
    setSubmitting(false);
    fetchUsers();
  };

  const openDelete = (user: UserRow) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const deleteUser = async () => {
    if (!selectedUser) return;
    setSubmitting(true);

    // Delete role first, then profile. Auth user remains but profile is removed.
    await supabase.from("user_roles").delete().eq("user_id", selectedUser.user_id);
    const { error } = await supabase.from("profiles").delete().eq("user_id", selectedUser.user_id);

    if (error) {
      toast({ title: "Error deleting user", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    toast({ title: "User deleted successfully" });
    setDeleteDialogOpen(false);
    setSelectedUser(null);
    setSubmitting(false);
    fetchUsers();
  };

  const openResetPassword = (user: UserRow) => {
    setSelectedUser(user);
    setNewPassword("");
    setResetDialogOpen(true);
  };

  const resetPassword = async () => {
    if (!selectedUser || !newPassword || newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const { data, error } = await supabase.functions.invoke("reset-password", {
      body: { user_id: selectedUser.user_id, new_password: newPassword },
    });

    if (error || data?.error) {
      toast({ title: "Error resetting password", description: data?.error ?? error?.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    toast({ title: "Password reset successfully" });
    setResetDialogOpen(false);
    setSelectedUser(null);
    setNewPassword("");
    setSubmitting(false);
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
                    <SelectItem value="worker">Production Manager</SelectItem>
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.employee_id}</TableCell>
                <TableCell>{u.username}</TableCell>
                <TableCell><Badge variant="outline">{u.role === "worker" ? "Production Manager" : u.role ?? "—"}</Badge></TableCell>
                <TableCell>
                  <Badge
                    variant={u.status === "active" ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => toggleStatus(u.user_id, u.status)}
                  >
                    {u.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Edit user">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openResetPassword(u)} title="Reset password">
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => openDelete(u)} title="Delete user">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Full Name</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div><Label>Employee ID</Label><Input value={editForm.employee_id} onChange={(e) => setEditForm({ ...editForm, employee_id: e.target.value })} /></div>
            <div><Label>Email / Username</Label><Input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} /></div>
            <div><Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v as AppRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">Production Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={updateUser} disabled={submitting} className="w-full bg-secondary hover:bg-secondary/90">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedUser?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser} disabled={submitting} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Set a new password for <strong>{selectedUser?.name}</strong>
          </p>
          <div className="space-y-4">
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <Button onClick={resetPassword} disabled={submitting} className="w-full bg-secondary hover:bg-secondary/90">
              Reset Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
