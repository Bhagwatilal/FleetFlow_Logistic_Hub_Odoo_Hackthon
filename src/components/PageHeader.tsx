import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface PageHeaderProps {
  title: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  actions?: React.ReactNode;
}

export function PageHeader({ title, searchValue, onSearchChange, actions }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-foreground mb-4">{title}</h1>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        {actions && <div className="flex gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
