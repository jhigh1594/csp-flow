import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/cn";

type ProgramNavProps = {
  workspaceId: string;
};

export default function ProgramNav({ workspaceId }: ProgramNavProps) {
  const location = useLocation();
  const base = `/dashboard/workspace/${workspaceId}/program`;

  const isOverview =
    location.pathname === base || location.pathname === `${base}/`;
  const isRoadmap = location.pathname.startsWith(`${base}/roadmap`);
  const isWoW = location.pathname.startsWith(`${base}/week-over-week`);

  const tabClass = (active: boolean) =>
    cn(
      "inline-flex h-6 items-center rounded-md px-2 text-xs font-medium transition-colors",
      active
        ? "bg-secondary text-secondary-foreground"
        : "text-foreground hover:bg-accent",
    );

  return (
    <div className="inline-flex h-8 items-center gap-0.5 rounded-lg border border-border/80 bg-background p-0.5">
      <Link
        to="/dashboard/workspace/$workspaceId/program"
        params={{ workspaceId }}
        className={tabClass(isOverview)}
      >
        Overview
      </Link>
      <Link
        to="/dashboard/workspace/$workspaceId/program/roadmap"
        params={{ workspaceId }}
        className={tabClass(isRoadmap)}
      >
        Roadmap
      </Link>
      <Link
        to="/dashboard/workspace/$workspaceId/program/week-over-week"
        params={{ workspaceId }}
        className={tabClass(isWoW)}
      >
        Week-over-Week
      </Link>
    </div>
  );
}
