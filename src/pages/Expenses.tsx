import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function Expenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ trip_id: "", driver_id: "", distance: "", fuel_cost: "", misc_expense: "" });

  const fetchAll = async () => {
    const [eRes, tRes, dRes] = await Promise.all([
      supabase.from("expenses").select("*, trip:trips(*), driver:drivers(*)").order("created_at", { ascending: false }),
      supabase.from("trips").select("*"),
      supabase.from("drivers").select("*"),
    ]);
    setExpenses((eRes.data as any) ?? []);
    setTrips((tRes.data as any[]) ?? []);
    setDrivers((dRes.data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("expenses").insert({
      trip_id: form.trip_id,
      driver_id: form.driver_id || null,
      distance: Number(form.distance),
      fuel_cost: Number(form.fuel_cost),
      misc_expense: Number(form.misc_expense),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Expense logged");
    setModalOpen(false);
    setForm({ trip_id: "", driver_id: "", distance: "", fuel_cost: "", misc_expense: "" });
    fetchAll();
  };

  const filtered = expenses.filter(
    (exp) => !search || (exp.driver as any)?.name?.toLowerCase().includes(search.toLowerCase()) || (exp.trip as any)?.origin?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div>
      <PageHeader title="Expense & Fuel Logging" searchValue={search} onSearchChange={setSearch}
        actions={<Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add an Expense</Button>}
      />

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-card hover:bg-card">
              <TableHead>Trip ID</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Distance</TableHead>
              <TableHead>Fuel Expense</TableHead>
              <TableHead>Misc. Expense</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Cost/km</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No expenses found</TableCell></TableRow>
            ) : filtered.map((exp) => {
              const total = exp.fuel_cost + exp.misc_expense;
              const costPerKm = exp.distance > 0 ? (total / exp.distance).toFixed(2) : "N/A";
              return (
                <TableRow key={exp.id} className="hover:bg-secondary/50">
                  <TableCell className="font-mono text-xs">{exp.trip_id.slice(0, 8)}</TableCell>
                  <TableCell>{(exp.driver as any)?.name ?? "N/A"}</TableCell>
                  <TableCell>{exp.distance} km</TableCell>
                  <TableCell>₹{exp.fuel_cost.toLocaleString()}</TableCell>
                  <TableCell>₹{exp.misc_expense.toLocaleString()}</TableCell>
                  <TableCell className="font-semibold">₹{total.toLocaleString()}</TableCell>
                  <TableCell>₹{costPerKm}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Expense</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Trip</Label>
              <Select value={form.trip_id} onValueChange={(v) => setForm({ ...form, trip_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select trip" /></SelectTrigger>
                <SelectContent>
                  {trips.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.id.slice(0, 8)} — {t.origin} → {t.destination}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Driver</Label>
              <Select value={form.driver_id} onValueChange={(v) => setForm({ ...form, driver_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select driver" /></SelectTrigger>
                <SelectContent>
                  {drivers.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Distance (km)</Label>
              <Input type="number" value={form.distance} onChange={(e) => setForm({ ...form, distance: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label>Fuel Cost (₹)</Label>
              <Input type="number" value={form.fuel_cost} onChange={(e) => setForm({ ...form, fuel_cost: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label>Misc Expense (₹)</Label>
              <Input type="number" value={form.misc_expense} onChange={(e) => setForm({ ...form, misc_expense: e.target.value })} required className="mt-1" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
