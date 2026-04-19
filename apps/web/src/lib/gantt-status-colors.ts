type GanttStatusColors = {
  border: string;
  borderHover: string;
  handleBg: string;
  handleBgHover: string;
  handleBorder: string;
  fillBg: string;
  fillBgHover: string;
};

const STATUS_COLORS: Record<string, GanttStatusColors> = {
  "to-do": {
    border: "border-muted-foreground/25",
    borderHover: "hover:border-muted-foreground/40",
    handleBg: "bg-muted-foreground/8",
    handleBgHover: "hover:bg-muted-foreground/18",
    handleBorder: "border-muted-foreground/15",
    fillBg: "bg-muted-foreground/10",
    fillBgHover: "group-hover:bg-muted-foreground/16",
  },
  "in-progress": {
    border: "border-info/30",
    borderHover: "hover:border-info/50",
    handleBg: "bg-info/10",
    handleBgHover: "hover:bg-info/20",
    handleBorder: "border-info/20",
    fillBg: "bg-info/12",
    fillBgHover: "group-hover:bg-info/20",
  },
  "in-review": {
    border: "border-warning/30",
    borderHover: "hover:border-warning/50",
    handleBg: "bg-warning/10",
    handleBgHover: "hover:bg-warning/20",
    handleBorder: "border-warning/20",
    fillBg: "bg-warning/12",
    fillBgHover: "group-hover:bg-warning/20",
  },
  done: {
    border: "border-success/30",
    borderHover: "hover:border-success/50",
    handleBg: "bg-success/10",
    handleBgHover: "hover:bg-success/20",
    handleBorder: "border-success/20",
    fillBg: "bg-success/12",
    fillBgHover: "group-hover:bg-success/20",
  },
};

const DEFAULT_COLORS: GanttStatusColors = {
  border: "border-primary/25",
  borderHover: "hover:border-primary/40",
  handleBg: "bg-primary/8",
  handleBgHover: "hover:bg-primary/18",
  handleBorder: "border-primary/15",
  fillBg: "bg-primary/12",
  fillBgHover: "group-hover:bg-primary/18",
};

export function getGanttStatusColors(status: string): GanttStatusColors {
  return STATUS_COLORS[status] ?? DEFAULT_COLORS;
}
