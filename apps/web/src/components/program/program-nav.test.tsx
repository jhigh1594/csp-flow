import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

let mockPathname = "/dashboard/workspace/ws-1/program";

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: mockPathname }),
  Link: ({
    children,
    className,
    to,
    params,
  }: {
    children: ReactNode;
    className?: string;
    to: string;
    params?: Record<string, string>;
  }) => (
    <a href={to} className={className} data-params={JSON.stringify(params)}>
      {children}
    </a>
  ),
}));

const { default: ProgramNav } = await import("./program-nav");

describe("ProgramNav", () => {
  it("renders all three tabs", () => {
    mockPathname = "/dashboard/workspace/ws-1/program";
    render(<ProgramNav workspaceId="ws-1" />);
    expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Roadmap" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Week-over-Week" }),
    ).toBeInTheDocument();
  });

  it("marks Overview active on program root", () => {
    mockPathname = "/dashboard/workspace/ws-1/program";
    render(<ProgramNav workspaceId="ws-1" />);
    expect(
      screen.getByRole("link", { name: "Overview" }).className,
    ).toContain("bg-secondary");
    expect(
      screen.getByRole("link", { name: "Roadmap" }).className,
    ).not.toContain("bg-secondary");
    expect(
      screen.getByRole("link", { name: "Week-over-Week" }).className,
    ).not.toContain("bg-secondary");
  });

  it("marks Roadmap active on roadmap route", () => {
    mockPathname = "/dashboard/workspace/ws-1/program/roadmap";
    render(<ProgramNav workspaceId="ws-1" />);
    expect(
      screen.getByRole("link", { name: "Roadmap" }).className,
    ).toContain("bg-secondary");
    expect(
      screen.getByRole("link", { name: "Overview" }).className,
    ).not.toContain("bg-secondary");
  });

  it("marks Week-over-Week active on week-over-week route", () => {
    mockPathname = "/dashboard/workspace/ws-1/program/week-over-week";
    render(<ProgramNav workspaceId="ws-1" />);
    expect(
      screen.getByRole("link", { name: "Week-over-Week" }).className,
    ).toContain("bg-secondary");
    expect(
      screen.getByRole("link", { name: "Overview" }).className,
    ).not.toContain("bg-secondary");
  });
});
