
import { LucideIcon } from "lucide-react";
import { Card } from "../components/ui/card";
import { cn } from "../lib/utils";

interface StatsCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  description?: string;
  className?: string;
}

const StatsCard = ({ icon: Icon, title, value, description, className }: StatsCardProps) => {
  return (
    <Card className={cn("p-6 hover:shadow-lg transition-shadow", className)}>
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-primary/10 rounded-full">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default StatsCard;
