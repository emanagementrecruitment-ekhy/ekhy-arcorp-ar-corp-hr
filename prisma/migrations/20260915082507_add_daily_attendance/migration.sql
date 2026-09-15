-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Attendance_employeeId_month_idx" ON "Attendance"("employeeId", "month");

-- CreateIndex
CREATE INDEX "Attendance_month_idx" ON "Attendance"("month");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_dateKey_key" ON "Attendance"("employeeId", "dateKey");
