ALTER TABLE "milestone" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "milestone_id" text;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_milestone_id_milestone_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestone"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "task_milestoneId_idx" ON "task" USING btree ("milestone_id");