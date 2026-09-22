-- AlterTable
ALTER TABLE "AppSetting" ADD COLUMN "announcementEndAt" DATETIME;
ALTER TABLE "AppSetting" ADD COLUMN "announcementStartAt" DATETIME;
ALTER TABLE "AppSetting" ADD COLUMN "announcementText" TEXT;
ALTER TABLE "AppSetting" ADD COLUMN "announcementUpdatedAt" DATETIME;
ALTER TABLE "AppSetting" ADD COLUMN "announcementUpdatedById" TEXT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "birthDate" DATETIME;
ALTER TABLE "Employee" ADD COLUMN "birthPlace" TEXT;
ALTER TABLE "Employee" ADD COLUMN "lastBirthdayNotifiedYear" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latePenaltyApplied" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Attendance" ("createdAt", "dateKey", "employeeId", "id", "month") SELECT "createdAt", "dateKey", "employeeId", "id", "month" FROM "Attendance";
DROP TABLE "Attendance";
ALTER TABLE "new_Attendance" RENAME TO "Attendance";
CREATE INDEX "Attendance_employeeId_month_idx" ON "Attendance"("employeeId", "month");
CREATE INDEX "Attendance_month_idx" ON "Attendance"("month");
CREATE UNIQUE INDEX "Attendance_employeeId_dateKey_key" ON "Attendance"("employeeId", "dateKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
