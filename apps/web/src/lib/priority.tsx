import {
  ChevronDown,
  ChevronsUp,
  ChevronUp,
  CircleAlert,
  Minus,
} from "lucide-react";

export function getPriorityIcon(priority: string) {
  switch (priority) {
    case "urgent":
      return <CircleAlert className="size-3 text-destructive" />;
    case "high":
      return <ChevronsUp className="size-3 text-warning" />;
    case "medium":
      return <ChevronUp className="size-3 text-warning/70" />;
    case "low":
      return <ChevronDown className="size-3 text-info" />;
    case "no-priority":
      return <Minus className="size-3 text-muted-foreground" />;
    default:
      return <Minus className="size-3 text-muted-foreground" />;
  }
}
