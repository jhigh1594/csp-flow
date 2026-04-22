CREATE TABLE "task_embedding" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"embedding" vector(512) NOT NULL,
	"embedding_model" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_embedding_task_id_unique" UNIQUE("task_id")
);
--> statement-breakpoint
ALTER TABLE "task_embedding" ADD CONSTRAINT "task_embedding_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "task_embedding_taskId_idx" ON "task_embedding" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_embedding_hnsw_idx" ON "task_embedding" USING hnsw ("embedding" vector_cosine_ops);