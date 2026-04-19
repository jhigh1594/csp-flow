CREATE TABLE "wiki_page" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"content_html" text,
	"content_json" jsonb,
	"is_locked" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "roadmap_group" text DEFAULT 'later';--> statement-breakpoint
ALTER TABLE "wiki_page" ADD CONSTRAINT "wiki_page_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "wiki_page" ADD CONSTRAINT "wiki_page_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "wiki_page_projectId_idx" ON "wiki_page" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "task_roadmapGroup_idx" ON "task" USING btree ("roadmap_group");