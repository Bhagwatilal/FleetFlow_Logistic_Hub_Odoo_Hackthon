import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Vehicle = { id: string; license_plate: string; model: string; type: 'truck' | 'van' | 'bike'; max_capacity: number; odometer: number; status: string; created_at: string; updated_at: string };
type VehicleInsert = Omit<Vehicle, 'id' | 'status' | 'created_at' | 'updated_at'>;


export default function VehicleRegistry() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);

  const [form, setForm] = useState({
    license_plate: "",
    model: "",
    type: "truck" as "truck" | "van" | "bike",
    max_capacity: "",
    odometer: "",
  });

  const fetchVehicles = async () => {
    const { data } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false });
    setVehicles((data as unknown as Vehicle[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchVehicles(); }, []);

  const resetForm = () => {
    setForm({ license_plate: "", model: "", type: "truck", max_capacity: "", odometer: "" });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setModalOpen(true); };
  const openEdit = (v: Vehicle) => {
    setEditing(v);
    setForm({
      license_plate: v.license_plate,
      model: v.model,
      type: v.type,
      max_capacity: String(v.max_capacity),
      odometer: String(v.odometer),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: VehicleInsert = {
      license_plate: form.license_plate,
      model: form.model,
      type: form.type,
      max_capacity: Number(form.max_capacity),
      odometer: Number(form.odometer),
    };

    if (editing) {
      const { error } = await supabase.from("vehicles").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Vehicle updated");
    } else {
      const { error } = await supabase.from("vehicles").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Vehicle added");
    }
    setModalOpen(false);
    resetForm();
    fetchVehicles();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Vehicle removed");
    fetchVehicles();
  };

  const filtered = vehicles.filter(
    (v) => !search || v.license_plate.toLowerCase().includes(search.toLowerCase()) || v.model.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div>
      <PageHeader
        title="Vehicle Registry"
        searchValue={search}
        onSearchChange={setSearch}
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Vehicle</Button>}
      />

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-card hover:bg-card">
              <TableHead>#</TableHead>
              <TableHead>Plate</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Odometer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No vehicles found</TableCell></TableRow>
            ) : filtered.map((v, i) => (
              <TableRow key={v.id} className="hover:bg-secondary/50">
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-mono">{v.license_plate}</TableCell>
                <TableCell>{v.model}</TableCell>
                <TableCell className="capitalize">{v.type}</TableCell>
                <TableCell>{v.max_capacity} kg</TableCell>
                <TableCell>{v.odometer.toLocaleString()} km</TableCell>
                <TableCell><StatusBadge status={v.status} /></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(v)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Vehicle" : "New Vehicle Registration"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>License Plate</Label>
              <Input value={form.license_plate} onChange={(e) => setForm({ ...form, license_plate: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label>Model</Label>
              <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="bike">Bike</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Max Payload (kg)</Label>
              <Input type="number" value={form.max_capacity} onChange={(e) => setForm({ ...form, max_capacity: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label>Initial Odometer (km)</Label>
              <Input type="number" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} required className="mt-1" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Save" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
