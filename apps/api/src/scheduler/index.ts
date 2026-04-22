import { Cron } from "croner";
import { backfillTaskEmbeddings } from "../embeddings/backfill";
import { checkDueDateReminders } from "./due-date-reminders";

const jobs: Cron[] = [];

export function initializeScheduler(): void {
  jobs.push(new Cron("*/5 * * * *", checkDueDateReminders));
  jobs.push(new Cron("*/15 * * * *", backfillTaskEmbeddings));
  console.log(
    "⏰ Scheduler started (due date reminders every 5 minutes, embedding backfill every 15 minutes)",
  );
}

export function shutdownScheduler(): void {
  for (const job of jobs) {
    job.stop();
  }
  jobs.length = 0;
}
