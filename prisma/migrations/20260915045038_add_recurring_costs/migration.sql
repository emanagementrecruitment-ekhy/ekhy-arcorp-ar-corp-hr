-- CreateTable
CREATE TABLE "RecurringCost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "startMonth" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringCost_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PayslipItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "date" DATETIME,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "qty" TEXT,
    "debit" INTEGER NOT NULL DEFAULT 0,
    "credit" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recurringCostId" TEXT,
    CONSTRAINT "PayslipItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PayslipItem_recurringCostId_fkey" FOREIGN KEY ("recurringCostId") REFERENCES "RecurringCost" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PayslipItem" ("category", "createdAt", "credit", "date", "debit", "description", "employeeId", "id", "month", "note", "qty") SELECT "category", "createdAt", "credit", "date", "debit", "description", "employeeId", "id", "month", "note", "qty" FROM "PayslipItem";
DROP TABLE "PayslipItem";
ALTER TABLE "new_PayslipItem" RENAME TO "PayslipItem";
CREATE INDEX "PayslipItem_employeeId_month_idx" ON "PayslipItem"("employeeId", "month");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RecurringCost_employeeId_idx" ON "RecurringCost"("employeeId");
