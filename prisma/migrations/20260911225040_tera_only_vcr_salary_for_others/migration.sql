-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "level" TEXT,
    "customRate" INTEGER,
    "salary" INTEGER,
    "role" TEXT NOT NULL,
    "accessRole" TEXT NOT NULL DEFAULT 'KARYAWAN',
    "homeLat" REAL NOT NULL,
    "homeLng" REAL NOT NULL,
    "homePlace" TEXT NOT NULL,
    "channelLink" TEXT,
    "supervisorId" TEXT,
    "supervisorNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Employee_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Employee" ("accessRole", "channelLink", "code", "createdAt", "customRate", "email", "homeLat", "homeLng", "homePlace", "id", "level", "name", "phone", "role", "supervisorId", "supervisorNote") SELECT "accessRole", "channelLink", "code", "createdAt", "customRate", "email", "homeLat", "homeLng", "homePlace", "id", "level", "name", "phone", "role", "supervisorId", "supervisorNote" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_code_key" ON "Employee"("code");
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");
CREATE UNIQUE INDEX "Employee_phone_key" ON "Employee"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Data fix: only "Tera" ever earns via VCR/voucher — every other Peran is
-- salaried (Gaji). Clear the level/customRate/vouchers any non-Tera employee
-- picked up before this rule existed, so existing data matches the new rule.
UPDATE "Employee" SET "level" = NULL, "customRate" = NULL WHERE "role" != 'Tera';
DELETE FROM "Voucher" WHERE "employeeId" IN (SELECT "id" FROM "Employee" WHERE "role" != 'Tera');
