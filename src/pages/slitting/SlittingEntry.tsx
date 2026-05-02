import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Scissors } from "lucide-react";

interface ProductCode {
  id: string;
  code: string;
  category_id: string;
}

export default function SlittingEntry() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [productCodes, setProductCodes] = useState<ProductCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    product_code_id: "",
    source_quantity: "",
    cut_quantity_produced: "",
    cut_width_mm: "",
    remaining_returned: "",
    thickness_mm: "",
    unit: "meters",
    notes: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("product_codes")
        .select("id, code, category_id")
        .eq("status", "active")
        .order("code");
      setProductCodes(data ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const sourceQty = parseFloat(form.source_quantity);
    const cutQty = parseFloat(form.cut_quantity_produced);
    const remaining = parseFloat(form.remaining_returned || "0");
    const cutWidth = parseFloat(form.cut_width_mm);

    if (!form.product_code_id || isNaN(sourceQty) || isNaN(cutQty) || isNaN(cutWidth)) {
      toast({ title: "Missing fields", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    if (cutQty + remaining > sourceQty) {
      toast({ title: "Invalid quantities", description: "Cut produced + remaining cannot exceed source quantity taken.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("slitting_entries").insert({
      product_code_id: form.product_code_id,
      source_quantity: sourceQty,
      cut_quantity_produced: cutQty,
      cut_width_mm: cutWidth,
      remaining_returned: remaining,
      thickness_mm: form.thickness_mm ? parseFloat(form.thickness_mm) : null,
      unit: form.unit,
      notes: form.notes || null,
      slitting_manager_id: user.id,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Slitting entry saved!" });
      setForm({
        product_code_id: form.product_code_id,
        source_quantity: "",
        cut_quantity_produced: "",
        cut_width_mm: "",
        remaining_returned: "",
        thickness_mm: "",
        unit: "meters",
        notes: "",
      });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5" />
          New Slitting Entry
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Code */}
          <div className="space-y-2">
            <Label>Product Code *</Label>
            <Select value={form.product_code_id} onValueChange={(v) => setForm({ ...form, product_code_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select product code" /></SelectTrigger>
              <SelectContent>
                {productCodes.map((pc) => (
                  <SelectItem key={pc.id} value={pc.id}>{pc.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Source Quantity taken from stock */}
          <div className="space-y-2">
            <Label>Source Quantity Taken from Stock ({form.unit}) *</Label>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 2000"
              value={form.source_quantity}
              onChange={(e) => setForm({ ...form, source_quantity: e.target.value })}
              required
            />
          </div>

          {/* Cut Width */}
          <div className="space-y-2">
            <Label>Cut Width (mm) *</Label>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 20"
              value={form.cut_width_mm}
              onChange={(e) => setForm({ ...form, cut_width_mm: e.target.value })}
              required
            />
          </div>

          {/* Cut Quantity Produced */}
          <div className="space-y-2">
            <Label>Cut Material Produced ({form.unit}) *</Label>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 1500"
              value={form.cut_quantity_produced}
              onChange={(e) => setForm({ ...form, cut_quantity_produced: e.target.value })}
              required
            />
          </div>

          {/* Remaining Returned */}
          <div className="space-y-2">
            <Label>Remaining Returned to Stock ({form.unit})</Label>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 500"
              value={form.remaining_returned}
              onChange={(e) => setForm({ ...form, remaining_returned: e.target.value })}
            />
          </div>

          {/* Thickness */}
          <div className="space-y-2">
            <Label>Thickness (mm)</Label>
            <Input
              type="number"
              step="any"
              placeholder="Optional"
              value={form.thickness_mm}
              onChange={(e) => setForm({ ...form, thickness_mm: e.target.value })}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes / Remarks</Label>
            <Input
              placeholder="Optional remarks"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Slitting Entry
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}