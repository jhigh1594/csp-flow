import { Link } from "@tanstack/react-router";
import useProjectStore from "@/store/project";

type LogoProps = {
  className?: string;
};

export function Logo({ className = "" }: LogoProps) {
  const { setProject } = useProjectStore();

  return (
    <Link
      onClick={() => {
        setProject(undefined);
      }}
      to="/dashboard"
      className={`w-auto ${className}`}
    >
      <img
        src="/servicenow-logo.png"
        alt="ServiceNow"
        className="h-6 w-auto dark:brightness-0 dark:invert"
      />
    </Link>
  );
}
