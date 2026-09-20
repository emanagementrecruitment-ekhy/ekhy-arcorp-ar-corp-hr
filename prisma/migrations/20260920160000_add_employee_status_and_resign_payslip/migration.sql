-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'AKTIF';

-- CreateTable
CREATE TABLE "ResignPayslip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "pdfData" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResignPayslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ResignPayslip_employeeId_idx" ON "ResignPayslip"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ResignPayslip_employeeId_month_key" ON "ResignPayslip"("employeeId", "month");
