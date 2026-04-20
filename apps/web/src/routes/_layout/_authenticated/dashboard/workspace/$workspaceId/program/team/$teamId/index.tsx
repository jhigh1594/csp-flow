import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import WorkspaceLayout from "@/components/common/workspace-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import useCreateDemand from "@/hooks/mutations/program/use-create-demand";
import useCreateRelease from "@/hooks/mutations/program/use-create-release";
import useCreateRisk from "@/hooks/mutations/program/use-create-risk";
import useDeleteDemand from "@/hooks/mutations/program/use-delete-demand";
import useDeleteRelease from "@/hooks/mutations/program/use-delete-release";
import useDeleteRisk from "@/hooks/mutations/program/use-delete-risk";
import useUpdateDemand from "@/hooks/mutations/program/use-update-demand";
import useUpdateRelease from "@/hooks/mutations/program/use-update-release";
import useUpdateRisk from "@/hooks/mutations/program/use-update-risk";
import useUpsertTeamStatus from "@/hooks/mutations/program/use-upsert-team-status";
import useGetTeamStatus from "@/hooks/queries/program/use-get-team-status";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/program/team/$teamId/",
)({ component: RouteComponent });

type Health = "green" | "amber" | "red";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function isPast(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function DateInput({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (val: string) => void;
}) {
  return (
    <input
      type="date"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={`w-32 rounded border border-input bg-background px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-ring ${
        value ? (isPast(value) ? "text-green-600" : "text-muted-foreground") : "text-muted-foreground"
      }`}
    />
  );
}

function HealthButton({
  color,
  active,
  onClick,
}: {
  color: Health;
  active: boolean;
  onClick: () => void;
}) {
  const label = color.charAt(0).toUpperCase() + color.slice(1);
  const colorClass =
    color === "green"
      ? active
        ? "bg-green-500 text-white border-green-500"
        : "border-green-300 text-green-600 hover:bg-green-50"
      : color === "amber"
        ? active
          ? "bg-amber-500 text-white border-amber-500"
          : "border-amber-300 text-amber-600 hover:bg-amber-50"
        : active
          ? "bg-red-500 text-white border-red-500"
          : "border-red-300 text-red-600 hover:bg-red-50";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-3 py-1 text-sm font-medium transition-colors ${colorClass}`}
    >
      {label}
    </button>
  );
}

function RouteComponent() {
  const { workspaceId, teamId } = Route.useParams();

  const { data, isLoading } = useGetTeamStatus({ workspaceId, teamId });

  const { mutate: upsertStatus, isPending: isSaving } = useUpsertTeamStatus();
  const { mutate: createDemand } = useCreateDemand();
  const { mutate: updateDemand } = useUpdateDemand();
  const { mutate: deleteDemand } = useDeleteDemand();
  const { mutate: createRisk } = useCreateRisk();
  const { mutate: updateRisk } = useUpdateRisk();
  const { mutate: deleteRisk } = useDeleteRisk();
  const { mutate: createRelease } = useCreateRelease();
  const { mutate: updateRelease } = useUpdateRelease();
  const { mutate: deleteRelease } = useDeleteRelease();

  // Form state
  const [health, setHealth] = useState<Health>("green");
  const [accomplishments, setAccomplishments] = useState("");
  const [nextWeekFocus, setNextWeekFocus] = useState("");
  const [leadershipAsks, setLeadershipAsks] = useState("");

  // Track which team+week we've already initialized from to prevent
  // re-syncing form state on every background refetch (which discards edits)
  const initializedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!data?.status) return;
    const key = `${teamId}-${data.status.weekStart}`;
    if (initializedForRef.current === key) return;
    initializedForRef.current = key;
    setHealth((data.status.health as Health) ?? "green");
    setAccomplishments(data.status.accomplishments ?? "");
    setNextWeekFocus(data.status.nextWeekFocus ?? "");
    setLeadershipAsks(data.status.leadershipAsks ?? "");
  }, [data?.status, teamId]);

  // Local demand edits (keyed by demandId)
  const [demandEdits, setDemandEdits] = useState<
    Record<string, Record<string, string>>
  >({});

  // Local risk edits (keyed by riskId)
  const [riskEdits, setRiskEdits] = useState<
    Record<string, Record<string, string>>
  >({});

  // Local release edits (keyed by releaseId)
  const [releaseEdits, setReleaseEdits] = useState<
    Record<string, Record<string, string>>
  >({});

  function getDemandField(
    demandId: string,
    field: string,
    fallback: string | null | undefined,
  ): string {
    return demandEdits[demandId]?.[field] ?? fallback ?? "";
  }

  function setDemandField(demandId: string, field: string, value: string) {
    setDemandEdits((prev) => ({
      ...prev,
      [demandId]: { ...(prev[demandId] ?? {}), [field]: value },
    }));
  }

  function getRiskField(
    riskId: string,
    field: string,
    fallback: string | null | undefined,
  ): string {
    return riskEdits[riskId]?.[field] ?? fallback ?? "";
  }

  function setRiskField(riskId: string, field: string, value: string) {
    setRiskEdits((prev) => ({
      ...prev,
      [riskId]: { ...(prev[riskId] ?? {}), [field]: value },
    }));
  }

  function getReleaseField(
    releaseId: string,
    field: string,
    fallback: string | null | undefined,
  ): string {
    return releaseEdits[releaseId]?.[field] ?? fallback ?? "";
  }

  function setReleaseField(releaseId: string, field: string, value: string) {
    setReleaseEdits((prev) => ({
      ...prev,
      [releaseId]: { ...(prev[releaseId] ?? {}), [field]: value },
    }));
  }

  function handleSave() {
    upsertStatus({
      workspaceId,
      teamId,
      health,
      accomplishments,
      nextWeekFocus,
      leadershipAsks,
    });
  }

  function handleAddDemand() {
    createDemand({ workspaceId, teamId, name: "New Demand" });
  }

  function handleDeleteDemand(demandId: string) {
    deleteDemand({ workspaceId, teamId, demandId });
  }

  function handleUpdateDemandName(demandId: string, name: string) {
    updateDemand({ workspaceId, teamId, demandId, name });
  }

  function handleUpdateDemandDate(
    demandId: string,
    field: string,
    value: string,
  ) {
    updateDemand({
      workspaceId,
      teamId,
      demandId,
      [field]: value || null,
    });
  }

  function handleAddRisk() {
    createRisk({ workspaceId, teamId, description: "New Risk" });
  }

  function handleDeleteRisk(riskId: string) {
    deleteRisk({ workspaceId, teamId, riskId });
  }

  function handleUpdateRisk(riskId: string) {
    const edits = riskEdits[riskId] ?? {};
    const risk = data?.risks?.find((r) => r.id === riskId);
    if (!risk) return;
    updateRisk({
      workspaceId,
      teamId,
      riskId,
      description: edits.description ?? risk.description,
      impact: (edits.impact ?? risk.impact) as "high" | "medium" | "low",
      status: (edits.status ?? risk.status) as "open" | "mitigated" | "closed",
      owner: edits.owner ?? risk.owner,
      dueDate: edits.dueDate ?? risk.dueDate,
    });
  }

  function handleAddRelease(quarter: "q1" | "q2" | "q3" | "q4") {
    createRelease({
      workspaceId,
      teamId,
      name: "New Release",
      quarter,
      month: 1,
      fiscalYear: 2026,
    });
  }

  function handleUpdateRelease(releaseId: string) {
    const edits = releaseEdits[releaseId] ?? {};
    const release = data?.releases?.find((r) => r.id === releaseId);
    if (!release) return;
    updateRelease({
      workspaceId,
      teamId,
      releaseId,
      name: edits.name ?? release.name,
      quarter: (edits.quarter ?? release.quarter) as
        | "q1"
        | "q2"
        | "q3"
        | "q4",
      month: edits.month ? Number(edits.month) : release.month,
      fiscalYear: edits.fiscalYear
        ? Number(edits.fiscalYear)
        : release.fiscalYear,
      personas: edits.personas
        ? edits.personas.split(",").map((p) => p.trim()).filter(Boolean)
        : release.personas,
      description: edits.description ?? release.description,
    });
  }

  function handleDeleteRelease(releaseId: string) {
    deleteRelease({ workspaceId, teamId, releaseId });
  }

  const demands = data?.demands ?? [];
  const risks = data?.risks ?? [];
  const releases = data?.releases ?? [];

  const quarters = ["q1", "q2", "q3", "q4"] as const;

  if (isLoading) {
    return (
      <WorkspaceLayout title={teamId}>
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout
      title={teamId}
      headerActions={
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      }
    >
      <div className="p-4 space-y-4">
        {/* Header: health selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            Health:
          </span>
          <div className="flex items-center gap-2">
            {(["green", "amber", "red"] as Health[]).map((c) => (
              <HealthButton
                key={c}
                color={c}
                active={health === c}
                onClick={() => setHealth(c)}
              />
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="weekly-status">
          <TabsList>
            <TabsTab value="weekly-status">Weekly Status</TabsTab>
            <TabsTab value="roadmap">Roadmap</TabsTab>
          </TabsList>

          {/* Tab 1: Weekly Status */}
          <TabsPanel value="weekly-status" className="mt-4 space-y-6">
            {/* Lifecycle Milestones */}
            <section>
              <h3 className="text-sm font-semibold mb-3">
                Lifecycle Milestones
              </h3>
              <div className="space-y-4">
                {demands
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((demand, idx) => {
                    const label = `D${String(idx + 1).padStart(2, "0")}`;
                    return (
                      <div
                        key={demand.id}
                        className="rounded-lg border border-border p-3 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-muted-foreground w-8">
                            {label}
                          </span>
                          <Input
                            size="sm"
                            defaultValue={getDemandField(
                              demand.id,
                              "name",
                              demand.name,
                            )}
                            onChange={(e) =>
                              setDemandField(
                                demand.id,
                                "name",
                                e.target.value,
                              )
                            }
                            onBlur={(e) =>
                              handleUpdateDemandName(
                                demand.id,
                                e.target.value,
                              )
                            }
                            className="max-w-xs"
                          />
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDeleteDemand(demand.id)}
                            className="ml-auto text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 pl-10">
                          {(
                            [
                              [
                                "businessPartnershipDate",
                                "Business Partnership",
                              ],
                              ["discoveryDate", "Discovery"],
                              ["requirementsDate", "Requirements"],
                              [
                                "demandSubmissionDate",
                                "Demand Submission",
                              ],
                              ["developmentDate", "Development"],
                              ["uatDate", "UAT"],
                              ["goLiveDate", "Go Live"],
                              ["adoptionDate", "Adoption"],
                            ] as [string, string][]
                          ).map(([field, label]) => (
                            <div
                              key={field}
                              className="flex flex-col gap-0.5"
                            >
                              <span className="text-xs text-muted-foreground">
                                {label}
                              </span>
                              <DateInput
                                value={
                                  getDemandField(
                                    demand.id,
                                    field,
                                    demand[field as keyof typeof demand] as
                                      | string
                                      | null
                                      | undefined,
                                  ) || null
                                }
                                onChange={(val) => {
                                  setDemandField(demand.id, field, val);
                                  handleUpdateDemandDate(
                                    demand.id,
                                    field,
                                    val,
                                  );
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={handleAddDemand}
                className="mt-3 gap-1"
              >
                <Plus className="w-3 h-3" />
                Add demand
              </Button>
            </section>

            {/* Accomplishments + Next Week's Focus */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <section>
                <h3 className="text-sm font-semibold mb-2">
                  This Week's Accomplishments
                </h3>
                <Textarea
                  value={accomplishments}
                  onChange={(e) => setAccomplishments(e.target.value)}
                  placeholder="What did the team accomplish this week?"
                />
              </section>
              <section>
                <h3 className="text-sm font-semibold mb-2">
                  Next Week's Focus
                </h3>
                <Textarea
                  value={nextWeekFocus}
                  onChange={(e) => setNextWeekFocus(e.target.value)}
                  placeholder="What will the team focus on next week?"
                />
              </section>
            </div>

            {/* Leadership Asks */}
            <section>
              <h3 className="text-sm font-semibold mb-2">
                Leadership Asks / Escalations
              </h3>
              <Textarea
                value={leadershipAsks}
                onChange={(e) => setLeadershipAsks(e.target.value)}
                placeholder="Any asks or escalations for leadership?"
              />
            </section>

            {/* Risks & Issues */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Risks &amp; Issues</h3>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleAddRisk}
                  className="gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add risk
                </Button>
              </div>
              <div className="rounded-lg border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Risk / Issue</TableHead>
                      <TableHead className="w-28">Impact</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                      <TableHead className="w-32">Owner</TableHead>
                      <TableHead className="w-32">Due Date</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {risks.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-muted-foreground text-sm py-6"
                        >
                          No risks or issues added yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      risks.map((risk, idx) => (
                        <TableRow key={risk.id}>
                          <TableCell className="text-muted-foreground text-xs">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <Input
                              size="sm"
                              defaultValue={getRiskField(
                                risk.id,
                                "description",
                                risk.description,
                              )}
                              onChange={(e) =>
                                setRiskField(
                                  risk.id,
                                  "description",
                                  e.target.value,
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <select
                              value={getRiskField(
                                risk.id,
                                "impact",
                                risk.impact,
                              )}
                              onChange={(e) =>
                                setRiskField(
                                  risk.id,
                                  "impact",
                                  e.target.value,
                                )
                              }
                              className="w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                            >
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          </TableCell>
                          <TableCell>
                            <select
                              value={getRiskField(
                                risk.id,
                                "status",
                                risk.status,
                              )}
                              onChange={(e) =>
                                setRiskField(
                                  risk.id,
                                  "status",
                                  e.target.value,
                                )
                              }
                              className="w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                            >
                              <option value="open">Open</option>
                              <option value="mitigated">Mitigated</option>
                              <option value="closed">Closed</option>
                            </select>
                          </TableCell>
                          <TableCell>
                            <Input
                              size="sm"
                              defaultValue={getRiskField(
                                risk.id,
                                "owner",
                                risk.owner,
                              )}
                              onChange={(e) =>
                                setRiskField(
                                  risk.id,
                                  "owner",
                                  e.target.value,
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="date"
                              value={
                                getRiskField(
                                  risk.id,
                                  "dueDate",
                                  risk.dueDate,
                                ) || ""
                              }
                              onChange={(e) =>
                                setRiskField(
                                  risk.id,
                                  "dueDate",
                                  e.target.value,
                                )
                              }
                              className="w-full rounded border border-input bg-background px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-ring"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleUpdateRisk(risk.id)}
                              >
                                Update
                              </Button>
                              <Button
                                size="icon-xs"
                                variant="ghost"
                                onClick={() => handleDeleteRisk(risk.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>
          </TabsPanel>

          {/* Tab 2: Roadmap */}
          <TabsPanel value="roadmap" className="mt-4 space-y-6">
            {quarters.map((quarter) => {
              const quarterReleases = releases
                .filter((r) => r.quarter === quarter)
                .sort((a, b) => a.month - b.month);

              return (
                <section key={quarter}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide">
                      {quarter.toUpperCase()}
                    </h3>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleAddRelease(quarter)}
                      className="gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add release
                    </Button>
                  </div>

                  {quarterReleases.length === 0 ? (
                    <p className="text-sm text-muted-foreground pl-1">
                      No releases for this quarter.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {quarterReleases.map((release) => {
                        const monthName =
                          MONTH_NAMES[(release.month ?? 1) - 1] ?? "";
                        const personasStr = Array.isArray(release.personas)
                          ? release.personas.join(", ")
                          : (release.personas ?? "");

                        return (
                          <div
                            key={release.id}
                            className="rounded-lg border border-border p-3 space-y-3"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                                <div className="flex flex-col gap-1">
                                  <label className="text-xs text-muted-foreground">
                                    Name
                                  </label>
                                  <Input
                                    size="sm"
                                    defaultValue={getReleaseField(
                                      release.id,
                                      "name",
                                      release.name,
                                    )}
                                    onChange={(e) =>
                                      setReleaseField(
                                        release.id,
                                        "name",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-xs text-muted-foreground">
                                    Month
                                  </label>
                                  <div className="flex items-center gap-1">
                                    <select
                                      value={
                                        getReleaseField(
                                          release.id,
                                          "month",
                                          String(release.month),
                                        ) || String(release.month)
                                      }
                                      onChange={(e) =>
                                        setReleaseField(
                                          release.id,
                                          "month",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                                    >
                                      {MONTH_NAMES.map((m, i) => (
                                        <option key={m} value={i + 1}>
                                          {m}
                                        </option>
                                      ))}
                                    </select>
                                    {!releaseEdits[release.id]?.month && (
                                      <Badge variant="secondary" size="sm">
                                        {monthName}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-xs text-muted-foreground">
                                    Personas
                                  </label>
                                  <Input
                                    size="sm"
                                    defaultValue={getReleaseField(
                                      release.id,
                                      "personas",
                                      personasStr,
                                    )}
                                    placeholder="comma-separated"
                                    onChange={(e) =>
                                      setReleaseField(
                                        release.id,
                                        "personas",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-xs text-muted-foreground">
                                    Description
                                  </label>
                                  <Input
                                    size="sm"
                                    defaultValue={getReleaseField(
                                      release.id,
                                      "description",
                                      release.description,
                                    )}
                                    onChange={(e) =>
                                      setReleaseField(
                                        release.id,
                                        "description",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-1 pt-5">
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() =>
                                    handleUpdateRelease(release.id)
                                  }
                                >
                                  Update
                                </Button>
                                <Button
                                  size="icon-xs"
                                  variant="ghost"
                                  onClick={() =>
                                    handleDeleteRelease(release.id)
                                  }
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </TabsPanel>
        </Tabs>
      </div>
    </WorkspaceLayout>
  );
}
