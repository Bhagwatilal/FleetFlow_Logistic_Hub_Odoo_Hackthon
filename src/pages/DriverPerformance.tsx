import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function DriverPerformance() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", license_number: "", license_expiry: "" });

  const fetchDrivers = async () => {
    const { data } = await supabase.from("drivers").select("*").order("created_at", { ascending: false });
    setDrivers((data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchDrivers(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("drivers").insert({
      name: form.name,
      license_number: form.license_number,
      license_expiry: form.license_expiry,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Driver added");
    setModalOpen(false);
    setForm({ name: "", license_number: "", license_expiry: "" });
    fetchDrivers();
  };

  const isExpired = (date: string) => new Date(date) < new Date();

  const filtered = drivers.filter(
    (d) => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.license_number.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div>
      <PageHeader title="Driver Performance & Safety" searchValue={search} onSearchChange={setSearch}
        actions={<Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Driver</Button>}
      />

      {/* License expiry alerts */}
      {drivers.some((d) => isExpired(d.license_expiry)) && (
        <div className="mb-4 rounded-lg border border-status-suspended/30 bg-status-suspended/10 p-3 text-sm text-foreground">
          ⚠️ Some drivers have expired licenses and cannot be assigned trips.
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-card hover:bg-card">
              <TableHead>Name</TableHead>
              <TableHead>License #</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Completion Rate</TableHead>
              <TableHead>Safety Score</TableHead>
              <TableHead>Complaints</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No drivers found</TableCell></TableRow>
            ) : filtered.map((d) => (
              <TableRow key={d.id} className="hover:bg-secondary/50">
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="font-mono">{d.license_number}</TableCell>
                <TableCell className={isExpired(d.license_expiry) ? "text-destructive" : ""}>
                  {d.license_expiry}
                  {isExpired(d.license_expiry) && " ⚠️"}
                </TableCell>
                <TableCell>{d.completion_rate}%</TableCell>
                <TableCell>{d.safety_score}%</TableCell>
                <TableCell>{d.complaints}</TableCell>
                <TableCell><StatusBadge status={d.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Driver</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label>License Number</Label>
              <Input value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label>License Expiry</Label>
              <Input type="date" value={form.license_expiry} onChange={(e) => setForm({ ...form, license_expiry: e.target.value })} required className="mt-1" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit">Add Driver</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
