import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface HistoryEntry {
  id: string;
  date: string;
  rolls_count: number;
  quantity_per_roll: number;
  thickness_mm: number | null;
  total_quantity: number | null;
  unit: string;
  product_codes: { code: string } | null;
  company_clients: { name: string } | null;
}

export default function ProductionHistory() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("production_entries")
        .select("id, date, rolls_count, quantity_per_roll, thickness_mm, total_quantity, unit, product_codes(code), company_clients(name)")
        .eq("worker_id", user.id)
        .order("date", { ascending: false })
        .limit(200);
      setEntries((data as unknown as HistoryEntry[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t('my_production_history')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        <div className="overflow-x-auto">
          <Table className="text-lg min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('product')}</TableHead>
                <TableHead>{t('client')}</TableHead>
                <TableHead className="text-right">{t('rolls')}</TableHead>
                <TableHead className="text-right">{t('thickness') || 'Thickness'}</TableHead>
                <TableHead className="text-right">{t('total')}</TableHead>
                <TableHead>{t('unit')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="h-16"><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('loading')}</TableCell></TableRow>
              ) : entries.length === 0 ? (
                <TableRow className="h-16"><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('no_entries')}</TableCell></TableRow>
              ) : (
                entries.map((e) => (
                  <TableRow key={e.id} className="h-16 hover:bg-muted/50">
                    <TableCell className="whitespace-nowrap">{e.date}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{e.product_codes?.code ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{e.company_clients?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">{e.rolls_count}</TableCell>
                    <TableCell className="text-right">{e.thickness_mm ?? "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{e.total_quantity ?? (e.rolls_count * e.quantity_per_roll)}</TableCell>
                    <TableCell>{formUnitMap(t, e.unit)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// simple helper map to translate unit if found
function formUnitMap(t: any, unit: string) {
  if (unit === 'meters') return t('meters');
  if (unit === 'kg') return t('kilograms');
  return unit;
}
