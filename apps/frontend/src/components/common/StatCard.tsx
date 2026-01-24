import { Card, CardContent } from "../ui/card";
import { cn } from "../../lib/utils";
import { LucideIcon } from "lucide-react";
import { Badge } from "../ui/badge";
import { motion } from "framer-motion";

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  trend?: number;
  status?: "default" | "critical" | "warning" | "success" | "info" | "primary";
  interactive?: boolean;
  active?: boolean;
  onClick?: () => void;
}

export const StatCard = ({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  status = "default",
  interactive = false,
  active = false,
  onClick,
  className,
  ...props
}: StatCardProps) => {
  const statusStyles = {
    default: "bg-card text-card-foreground border-border",
    primary: "bg-primary text-primary-foreground border-primary/50",
    critical:
      "bg-destructive text-destructive-foreground border-destructive/50",
    warning: "bg-warning text-warning-foreground border-warning/50",
    success: "bg-success text-success-foreground border-success/50",
    info: "bg-accent text-accent-foreground border-accent/50",
  };

  const currentStyle = statusStyles[status] || statusStyles.default;
  const Component = interactive ? motion.button : motion.div;

  return (
    <Component
      whileHover={interactive ? { y: -5 } : {}}
      whileTap={interactive ? { scale: 0.98 } : {}}
      onClick={interactive ? onClick : undefined}
      className={cn("h-full w-full text-left", className)}
    >
      <Card
        className={cn(
          "h-full relative overflow-hidden transition-all duration-200 border-2",
          currentStyle,
          interactive
            ? "cursor-pointer hover:shadow-lg hover:border-primary/50"
            : "cursor-default",
          active && "ring-2 ring-primary ring-offset-2",
        )}
        role={interactive ? undefined : "article"}
        aria-label={`${label}: ${value}`}
        {...props}
      >
        <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-4 items-center">
              <div className="h-12 w-12 rounded-lg bg-background/20 flex items-center justify-center backdrop-blur-sm shadow-inner">
                <Icon className="h-6 w-6 opacity-90" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider opacity-80 mb-0.5">
                  {label}
                </div>
                <div className="text-2xl font-bold font-mono tracking-tight">
                  {value}
                </div>
              </div>
            </div>

            {trend !== undefined && trend !== 0 && (
              <Badge
                variant="outline"
                className={cn(
                  "ml-auto px-2 py-0.5 text-xs font-bold border-0 backdrop-blur-sm",
                  trend > 0 ? "bg-green-500/20" : "bg-red-500/20",
                )}
              >
                {trend > 0 ? "+" : ""}
                {trend}%
              </Badge>
            )}
          </div>

          {subtext && (
            <div className="mt-auto border-t border-current/10 pt-3">
              <div className="text-xs font-medium opacity-75 truncate">
                {subtext}
              </div>
            </div>
          )}
        </CardContent>

        {interactive && active && (
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        )}
      </Card>
    </Component>
  );
};
