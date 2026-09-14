-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "ageYears" INTEGER;
ALTER TABLE "Employee" ADD COLUMN "heightCm" INTEGER;
ALTER TABLE "Employee" ADD COLUMN "weightKg" INTEGER;

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "themeColor" TEXT NOT NULL DEFAULT 'classic',
    "themeFont" TEXT NOT NULL DEFAULT 'classic',
    "logoDataUrl" TEXT,
    "logoUpdatedAt" DATETIME,
    "logoUpdatedById" TEXT,
    "demoCleanupAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);
