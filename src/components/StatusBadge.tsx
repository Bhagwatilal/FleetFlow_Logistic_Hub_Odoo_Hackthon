import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  available: "bg-status-available/15 text-status-available border-status-available/30",
  on_trip: "bg-status-on-trip/15 text-status-on-trip border-status-on-trip/30",
  on_duty: "bg-status-on-trip/15 text-status-on-trip border-status-on-trip/30",
  in_shop: "bg-status-in-shop/15 text-status-in-shop border-status-in-shop/30",
  in_progress: "bg-status-in-shop/15 text-status-in-shop border-status-in-shop/30",
  retired: "bg-muted text-muted-foreground border-border",
  suspended: "bg-status-suspended/15 text-status-suspended border-status-suspended/30",
  off_duty: "bg-muted text-muted-foreground border-border",
  draft: "bg-muted text-muted-foreground border-border",
  dispatched: "bg-status-on-trip/15 text-status-on-trip border-status-on-trip/30",
  completed: "bg-status-available/15 text-status-available border-status-available/30",
  cancelled: "bg-status-suspended/15 text-status-suspended border-status-suspended/30",
  new: "bg-primary/15 text-primary border-primary/30",
  resolved: "bg-status-available/15 text-status-available border-status-available/30",
};

const statusLabels: Record<string, string> = {
  available: "Available",
  on_trip: "On Trip",
  on_duty: "On Duty",
  in_shop: "In Shop",
  in_progress: "In Progress",
  retired: "Retired",
  suspended: "Suspended",
  off_duty: "Off Duty",
  draft: "Draft",
  dispatched: "Dispatched",
  completed: "Completed",
  cancelled: "Cancelled",
  new: "New",
  resolved: "Resolved",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        statusStyles[status] ?? "bg-muted text-muted-foreground border-border"
      )}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
