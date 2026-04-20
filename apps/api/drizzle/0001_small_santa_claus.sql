CREATE TABLE "demand" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"business_partnership_date" date,
	"discovery_date" date,
	"requirements_date" date,
	"demand_submission_date" date,
	"development_date" date,
	"uat_date" date,
	"go_live_date" date,
	"adoption_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"description" text NOT NULL,
	"impact" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"owner" text,
	"due_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roadmap_release" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"name" text NOT NULL,
	"quarter" text NOT NULL,
	"month" integer NOT NULL,
	"fiscal_year" integer NOT NULL,
	"personas" text[],
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_status_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"week_start" date NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_status_snapshot_team_week_unique" UNIQUE("team_id","week_start")
);
--> statement-breakpoint
CREATE TABLE "weekly_status" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"week_start" date NOT NULL,
	"health" text DEFAULT 'green' NOT NULL,
	"accomplishments" text,
	"next_week_focus" text,
	"leadership_asks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_status_team_week_unique" UNIQUE("team_id","week_start")
);
--> statement-breakpoint
ALTER TABLE "demand" ADD CONSTRAINT "demand_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "risk" ADD CONSTRAINT "risk_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "roadmap_release" ADD CONSTRAINT "roadmap_release_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "weekly_status_snapshot" ADD CONSTRAINT "weekly_status_snapshot_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "weekly_status_snapshot" ADD CONSTRAINT "weekly_status_snapshot_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "weekly_status" ADD CONSTRAINT "weekly_status_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "weekly_status" ADD CONSTRAINT "weekly_status_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "demand_teamId_idx" ON "demand" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "demand_sortOrder_idx" ON "demand" USING btree ("team_id","sort_order");--> statement-breakpoint
CREATE INDEX "risk_teamId_idx" ON "risk" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "risk_status_idx" ON "risk" USING btree ("team_id","status");--> statement-breakpoint
CREATE INDEX "roadmap_release_teamId_idx" ON "roadmap_release" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "roadmap_release_quarter_idx" ON "roadmap_release" USING btree ("team_id","quarter");--> statement-breakpoint
CREATE INDEX "weekly_status_snapshot_teamId_idx" ON "weekly_status_snapshot" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "weekly_status_teamId_idx" ON "weekly_status" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "weekly_status_workspaceId_idx" ON "weekly_status" USING btree ("workspace_id");