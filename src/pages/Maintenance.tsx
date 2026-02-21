import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function Maintenance() {
  const [logs, setLogs] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ vehicle_id: "", issue: "", cost: "", service_date: new Date().toISOString().slice(0, 10) });

  const fetchAll = async () => {
    const [logsRes, vRes] = await Promise.all([
      supabase.from("maintenance_logs").select("*, vehicle:vehicles(*)").order("created_at", { ascending: false }),
      supabase.from("vehicles").select("*"),
    ]);
    setLogs((logsRes.data as any) ?? []);
    setVehicles((vRes.data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("maintenance_logs").insert({
      vehicle_id: form.vehicle_id,
      issue: form.issue,
      cost: Number(form.cost),
      service_date: form.service_date,
    });
    if (error) { toast.error(error.message); return; }
    // Set vehicle to in_shop
    await supabase.from("vehicles").update({ status: "in_shop" }).eq("id", form.vehicle_id);
    toast.success("Maintenance log created");
    setModalOpen(false);
    setForm({ vehicle_id: "", issue: "", cost: "", service_date: new Date().toISOString().slice(0, 10) });
    fetchAll();
  };

  const resolveLog = async (logId: string, vehicleId: string) => {
    await supabase.from("maintenance_logs").update({ status: "resolved" }).eq("id", logId);
    await supabase.from("vehicles").update({ status: "available" }).eq("id", vehicleId);
    toast.success("Maintenance resolved, vehicle available");
    fetchAll();
  };

  const filtered = logs.filter(
    (l) => !search || l.issue.toLowerCase().includes(search.toLowerCase()) || (l.vehicle as any)?.license_plate?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div>
      <PageHeader title="Maintenance & Service Logs" searchValue={search} onSearchChange={setSearch}
        actions={<Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create New Service</Button>}
      />

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-card hover:bg-card">
              <TableHead>Log ID</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Issue/Service</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No maintenance logs</TableCell></TableRow>
            ) : filtered.map((l) => (
              <TableRow key={l.id} className="hover:bg-secondary/50">
                <TableCell className="font-mono text-xs">{l.id.slice(0, 8)}</TableCell>
                <TableCell>{(l.vehicle as any)?.license_plate ?? "N/A"}</TableCell>
                <TableCell>{l.issue}</TableCell>
                <TableCell>{l.service_date}</TableCell>
                <TableCell>₹{l.cost.toLocaleString()}</TableCell>
                <TableCell><StatusBadge status={l.status} /></TableCell>
                <TableCell>
                  {l.status !== "resolved" && (
                    <Button size="sm" variant="outline" onClick={() => resolveLog(l.id, l.vehicle_id)}>Resolve</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Service</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Vehicle</Label>
              <Select value={form.vehicle_id} onValueChange={(v) => setForm({ ...form, vehicle_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.license_plate} — {v.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Issue/Service</Label>
              <Input value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.service_date} onChange={(e) => setForm({ ...form, service_date: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label>Cost (₹)</Label>
              <Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} required className="mt-1" />
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
