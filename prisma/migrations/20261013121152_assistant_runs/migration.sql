-- Asisten Harian: on/off switch kept on the settings row (default on).
ALTER TABLE "AppSetting" ADD COLUMN "assistantEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AssistantRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dateKey" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "ranAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targets" INTEGER NOT NULL DEFAULT 0,
    "delivered" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT NOT NULL DEFAULT '',
    "manual" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE INDEX "AssistantRun_ranAt_idx" ON "AssistantRun"("ranAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssistantRun_dateKey_task_key" ON "AssistantRun"("dateKey", "task");
