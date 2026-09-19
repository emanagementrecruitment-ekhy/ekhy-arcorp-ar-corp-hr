-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "themeColor" TEXT NOT NULL DEFAULT 'classic',
    "themeFont" TEXT NOT NULL DEFAULT 'classic',
    "lightMode" TEXT NOT NULL DEFAULT 'auto',
    "logoDataUrl" TEXT,
    "logoUpdatedAt" DATETIME,
    "logoUpdatedById" TEXT,
    "demoCleanupAt" DATETIME,
    "ownerGeneratedAt" DATETIME,
    "ownerWelcomeSeenAt" DATETIME,
    "ownerLogoDataUrl" TEXT,
    "employeeLimit" INTEGER,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppSetting" ("demoCleanupAt", "employeeLimit", "id", "logoDataUrl", "logoUpdatedAt", "logoUpdatedById", "ownerGeneratedAt", "ownerLogoDataUrl", "ownerWelcomeSeenAt", "themeColor", "themeFont", "updatedAt") SELECT "demoCleanupAt", "employeeLimit", "id", "logoDataUrl", "logoUpdatedAt", "logoUpdatedById", "ownerGeneratedAt", "ownerLogoDataUrl", "ownerWelcomeSeenAt", "themeColor", "themeFont", "updatedAt" FROM "AppSetting";
DROP TABLE "AppSetting";
ALTER TABLE "new_AppSetting" RENAME TO "AppSetting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
