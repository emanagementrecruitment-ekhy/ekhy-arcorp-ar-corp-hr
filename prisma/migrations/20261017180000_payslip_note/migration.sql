-- CreateTable
CREATE TABLE "PayslipNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PayslipNote_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PayslipNote_employeeId_month_key" ON "PayslipNote"("employeeId", "month");