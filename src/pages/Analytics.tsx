import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KPICard } from "@/components/KPICard";
import { DollarSign, TrendingUp, Activity, Fuel } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

export default function Analytics() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [eRes, mRes, vRes] = await Promise.all([
        supabase.from("expenses").select("*"),
        supabase.from("maintenance_logs").select("*, vehicle:vehicles(*)"),
        supabase.from("vehicles").select("*"),
      ]);
      setExpenses(eRes.data ?? []);
      setMaintenance(mRes.data ?? []);
      setVehicles(vRes.data ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  const totalFuelCost = expenses.reduce((s, e) => s + e.fuel_cost, 0);
  const totalMaintCost = maintenance.reduce((s, m) => s + m.cost, 0);
  const totalDistance = expenses.reduce((s, e) => s + e.distance, 0);
  const fuelEfficiency = totalDistance > 0 ? (totalDistance / (totalFuelCost / 80)).toFixed(1) : "0"; // approx km/L
  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter((v: any) => v.status === "on_trip").length;
  const utilization = totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0;

  // Mock monthly data for charts
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const fuelTrend = months.map((m, i) => ({
    month: m,
    efficiency: Math.round(8 + Math.random() * 6),
  }));

  // Vehicle cost aggregation
  const vehicleCosts: Record<string, number> = {};
  maintenance.forEach((m: any) => {
    const plate = m.vehicle?.license_plate ?? "Unknown";
    vehicleCosts[plate] = (vehicleCosts[plate] ?? 0) + m.cost;
  });
  const costliestVehicles = Object.entries(vehicleCosts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([plate, cost]) => ({ plate, cost }));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Operational Analytics & Reports</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KPICard title="Total Fuel Cost" value={`₹${(totalFuelCost / 100000).toFixed(1)}L`} icon={DollarSign} delay={0} />
        <KPICard title="Fleet ROI" value="+12.5%" icon={TrendingUp} description="Revenue vs costs" delay={0.05} />
        <KPICard title="Utilization Rate" value={`${utilization}%`} icon={Activity} delay={0.1} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Fuel Efficiency Trend (km/L)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={fuelTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,18%,22%)" />
              <XAxis dataKey="month" stroke="hsl(215,15%,55%)" fontSize={12} />
              <YAxis stroke="hsl(215,15%,55%)" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(220,22%,14%)", border: "1px solid hsl(220,18%,22%)", borderRadius: 8, color: "hsl(210,20%,92%)" }} />
              <Line type="monotone" dataKey="efficiency" stroke="hsl(190,80%,45%)" strokeWidth={2} dot={{ fill: "hsl(190,80%,45%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Top 5 Costliest Vehicles</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={costliestVehicles}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,18%,22%)" />
              <XAxis dataKey="plate" stroke="hsl(215,15%,55%)" fontSize={11} />
              <YAxis stroke="hsl(215,15%,55%)" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(220,22%,14%)", border: "1px solid hsl(220,18%,22%)", borderRadius: 8, color: "hsl(210,20%,92%)" }} />
              <Bar dataKey="cost" fill="hsl(32,90%,55%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
        <h3 className="text-sm font-semibold text-foreground mb-3">Financial Summary</h3>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-card hover:bg-card">
                <TableHead>Metric</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow><TableCell>Total Fuel Cost</TableCell><TableCell>₹{totalFuelCost.toLocaleString()}</TableCell></TableRow>
              <TableRow><TableCell>Total Maintenance Cost</TableCell><TableCell>₹{totalMaintCost.toLocaleString()}</TableCell></TableRow>
              <TableRow><TableCell>Total Distance Covered</TableCell><TableCell>{totalDistance.toLocaleString()} km</TableCell></TableRow>
              <TableRow><TableCell>Fuel Efficiency</TableCell><TableCell>{fuelEfficiency} km/L</TableCell></TableRow>
              <TableRow><TableCell>Total Operational Cost</TableCell><TableCell className="font-semibold">₹{(totalFuelCost + totalMaintCost).toLocaleString()}</TableCell></TableRow>
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  );
}
