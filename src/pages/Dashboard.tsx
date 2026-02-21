import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KPICard } from "@/components/KPICard";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Truck, Wrench, Package, Activity } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";


type Vehicle = Record<string, unknown> & { id: string; status: string; license_plate: string };
type Trip = Record<string, unknown> & { id: string; status: string; origin: string; destination: string; vehicle?: Vehicle | null; driver?: Record<string, unknown> | null };

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [tripsRes, vehiclesRes] = await Promise.all([
        supabase.from("trips").select("*, vehicle:vehicles(*), driver:drivers(*)").order("created_at", { ascending: false }).limit(20),
        supabase.from("vehicles").select("*"),
      ]);
      setTrips((tripsRes.data as unknown as Trip[]) ?? []);
      setVehicles((vehiclesRes.data as unknown as Vehicle[]) ?? []);
      setLoading(false);
    };
    fetchData();

    const channel = supabase.channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const activeFleet = vehicles.filter((v) => v.status === "on_trip").length;
  const maintenanceAlerts = vehicles.filter((v) => v.status === "in_shop").length;
  const pendingCargo = trips.filter((t) => t.status === "draft").length;
  const totalVehicles = vehicles.length;
  const utilization = totalVehicles > 0 ? Math.round((activeFleet / totalVehicles) * 100) : 0;

  const filtered = trips.filter((t) =>
    !search || t.origin.toLowerCase().includes(search.toLowerCase()) ||
    t.destination.toLowerCase().includes(search.toLowerCase()) ||
    (t.vehicle as any)?.license_plate?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div>
      <PageHeader title="Command Center" searchValue={search} onSearchChange={setSearch} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="Active Fleet" value={activeFleet} icon={Truck} description="Vehicles on trip" delay={0} />
        <KPICard title="Maintenance Alerts" value={maintenanceAlerts} icon={Wrench} description="In shop" delay={0.05} />
        <KPICard title="Pending Cargo" value={pendingCargo} icon={Package} description="Draft trips" delay={0.1} />
        <KPICard title="Utilization Rate" value={`${utilization}%`} icon={Activity} description="Assigned vs idle" delay={0.15} />
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-card hover:bg-card">
                <TableHead>Trip ID</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No trips found. Create your first trip from the Trip Dispatcher.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((trip) => (
                  <TableRow key={trip.id} className="hover:bg-secondary/50">
                    <TableCell className="font-mono text-xs">{trip.id.slice(0, 8)}</TableCell>
                    <TableCell>{(trip.vehicle as any)?.license_plate ?? "N/A"}</TableCell>
                    <TableCell>{(trip.driver as any)?.name ?? "N/A"}</TableCell>
                    <TableCell>{trip.origin}</TableCell>
                    <TableCell>{trip.destination}</TableCell>
                    <TableCell><StatusBadge status={trip.status} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  );
}
