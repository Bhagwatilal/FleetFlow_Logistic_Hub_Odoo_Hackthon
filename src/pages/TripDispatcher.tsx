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

export default function TripDispatcher() {
  const [trips, setTrips] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    vehicle_id: "",
    driver_id: "",
    cargo_weight: "",
    origin: "",
    destination: "",
    estimated_fuel_cost: "",
  });

  const fetchAll = async () => {
    const [tripsRes, vRes, dRes] = await Promise.all([
      supabase.from("trips").select("*, vehicle:vehicles(*), driver:drivers(*)").order("created_at", { ascending: false }),
      supabase.from("vehicles").select("*").eq("status", "available"),
      supabase.from("drivers").select("*").neq("status", "suspended"),
    ]);
    setTrips((tripsRes.data as any) ?? []);
    setVehicles((vRes.data as any[]) ?? []);
    setDrivers((dRes.data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedVehicle = vehicles.find((v) => v.id === form.vehicle_id);
    if (selectedVehicle && Number(form.cargo_weight) > selectedVehicle.max_capacity) {
      toast.error(`Cargo weight exceeds vehicle capacity of ${selectedVehicle.max_capacity} kg`);
      return;
    }

    const selectedDriver = drivers.find((d) => d.id === form.driver_id);
    if (selectedDriver && new Date(selectedDriver.license_expiry) < new Date()) {
      toast.error("Driver's license has expired. Cannot assign.");
      return;
    }

    const { error } = await supabase.from("trips").insert({
      vehicle_id: form.vehicle_id,
      driver_id: form.driver_id,
      cargo_weight: Number(form.cargo_weight),
      origin: form.origin,
      destination: form.destination,
      estimated_fuel_cost: Number(form.estimated_fuel_cost),
      status: "draft",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Trip created");
    setModalOpen(false);
    setForm({ vehicle_id: "", driver_id: "", cargo_weight: "", origin: "", destination: "", estimated_fuel_cost: "" });
    fetchAll();
  };

  const dispatchTrip = async (tripId: string, vehicleId: string | null, driverId: string | null) => {
    await supabase.from("trips").update({ status: "dispatched" }).eq("id", tripId);
    if (vehicleId) await supabase.from("vehicles").update({ status: "on_trip" }).eq("id", vehicleId);
    if (driverId) await supabase.from("drivers").update({ status: "on_duty" }).eq("id", driverId);
    toast.success("Trip dispatched");
    fetchAll();
  };

  const completeTrip = async (tripId: string, vehicleId: string | null, driverId: string | null) => {
    await supabase.from("trips").update({ status: "completed" }).eq("id", tripId);
    if (vehicleId) await supabase.from("vehicles").update({ status: "available" }).eq("id", vehicleId);
    if (driverId) await supabase.from("drivers").update({ status: "off_duty" }).eq("id", driverId);
    toast.success("Trip completed");
    fetchAll();
  };

  const filtered = trips.filter(
    (t) => !search || t.origin.toLowerCase().includes(search.toLowerCase()) || t.destination.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div>
      <PageHeader title="Trip Dispatcher" searchValue={search} onSearchChange={setSearch}
        actions={<Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Trip</Button>}
      />

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-card hover:bg-card">
              <TableHead>Trip</TableHead>
              <TableHead>Fleet Type</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No trips found</TableCell></TableRow>
            ) : filtered.map((t) => (
              <TableRow key={t.id} className="hover:bg-secondary/50">
                <TableCell className="font-mono text-xs">{t.id.slice(0, 8)}</TableCell>
                <TableCell className="capitalize">{(t.vehicle as any)?.type ?? "N/A"}</TableCell>
                <TableCell>{(t.driver as any)?.name ?? "N/A"}</TableCell>
                <TableCell>{t.origin}</TableCell>
                <TableCell>{t.destination}</TableCell>
                <TableCell>{t.cargo_weight} kg</TableCell>
                <TableCell><StatusBadge status={t.status} /></TableCell>
                <TableCell>
                  {t.status === "draft" && (
                    <Button size="sm" variant="outline" onClick={() => dispatchTrip(t.id, t.vehicle_id, t.driver_id)}>Dispatch</Button>
                  )}
                  {t.status === "dispatched" && (
                    <Button size="sm" variant="outline" onClick={() => completeTrip(t.id, t.vehicle_id, t.driver_id)}>Complete</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Trip Form</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Select Vehicle</Label>
              <Select value={form.vehicle_id} onValueChange={(v) => setForm({ ...form, vehicle_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose vehicle" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.license_plate} — {v.type} ({v.max_capacity}kg)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cargo Weight (kg)</Label>
              <Input type="number" value={form.cargo_weight} onChange={(e) => setForm({ ...form, cargo_weight: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label>Select Driver</Label>
              <Select value={form.driver_id} onValueChange={(v) => setForm({ ...form, driver_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose driver" /></SelectTrigger>
                <SelectContent>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name} — {d.license_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Origin Address</Label>
              <Input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label>Destination</Label>
              <Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label>Estimated Fuel Cost</Label>
              <Input type="number" value={form.estimated_fuel_cost} onChange={(e) => setForm({ ...form, estimated_fuel_cost: e.target.value })} required className="mt-1" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit">Confirm & Dispatch Trip</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
